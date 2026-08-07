/**
 * Canvas Grab — Background Service Worker
 * Bridges popup ↔ content script, handles API calls
 */

import {
	listCanvases as apiListCanvases,
	saveImage as apiSaveImage,
	getCanvasName as apiGetCanvasName,
	checkConnection as apiCheckConnection,
} from "../utils/api";
import {
	getActiveCanvasId,
	setActiveCanvasId,
	getCachedCanvases,
	setCachedCanvases,
	invalidateCanvasCache,
	setConfig as storageSetConfig,
	getConfig as storageGetConfig,
	getCachedConnection,
	setCachedConnection,
} from "../utils/storage";
import type { ImageData } from "../utils/messages";

export default defineBackground(() => {
	// ── Message Handler ─────────────────────────────

	browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
		if (msg.type === "START_CAPTURE") {
			handleStartCapture(msg.tabId, msg.canvasId);
			sendResponse({ ok: true });
		}

		if (msg.type === "IMAGE_CAPTURED") {
			handleImageCaptured(msg.imageData);
			sendResponse({ ok: true });
		}

		// Popup requests
		if (msg.type === "GET_CANVASES") {
			handleGetCanvases().then(sendResponse);
			return true; // async response
		}

		if (msg.type === "GET_CONFIG") {
			storageGetConfig().then(sendResponse);
			return true;
		}

		if (msg.type === "SAVE_CONFIG") {
			storageSetConfig(msg.apiKey, msg.baseUrl).then(() => {
				invalidateCanvasCache();
				sendResponse({ ok: true });
			});
			return true;
		}

		if (msg.type === "CHECK_CONNECTION") {
			// Return cached status immediately if fresh
			getCachedConnection().then((cached) => {
				if (cached !== null) {
					sendResponse({ ok: cached, cached: true });
					return;
				}
				// No cache — do real check and store result
				apiCheckConnection().then(async (ok) => {
					await setCachedConnection(ok);
					sendResponse({ ok, cached: false });
				});
			});
			return true;
		}

		if (msg.type === "VERIFY_CONNECTION") {
			// Background verification — always hits network, updates cache
			apiCheckConnection().then(async (ok) => {
				await setCachedConnection(ok);
				sendResponse({ ok });
			});
			return true;
		}

		return true;
	});

	// ── Install ─────────────────────────────────────

	browser.runtime.onInstalled.addListener(async () => {
		const config = await storageGetConfig();
		if (!config.baseUrl) {
			await storageSetConfig(config.apiKey, config.baseUrl);
		}
	});
});

// ── Capture Flow ────────────────────────────────────

function handleStartCapture(tabId: number, canvasId: string): void {
	// The content script is auto-registered by WXT via the entrypoints/content.ts file.
	// Since it matches <all_urls>, it's already injected. We just need to send the message.
	browser.tabs
		.sendMessage(tabId, { type: "ACTIVATE_CAPTURE" })
		.then(() => {
			setActiveCanvasId(canvasId);
		})
		.catch((err) => {
			console.error("Canvas Grab: Failed to activate capture", err);
			showNotification("Error", "No se pudo activar el modo captura en esta página");
		});
}

async function handleImageCaptured(imageData: ImageData): Promise<void> {
	const canvasId = await getActiveCanvasId();
	if (!canvasId) {
		showNotification("Error", "No hay lienzo seleccionado");
		return;
	}

	try {
		await apiSaveImage(canvasId, imageData);
		const canvasName = await apiGetCanvasName(canvasId);
		showNotification("Imagen guardada", `${imageData.name} → ${canvasName}`);

		browser.runtime
			.sendMessage({
				type: "CAPTURE_SUCCESS",
				imageName: imageData.name,
				canvasName,
			})
			.catch(() => {});
	} catch (err) {
		console.error("Canvas Grab: Failed to save image", err);
		showNotification("Error", (err as Error)?.message || "No se pudo guardar la imagen");
	}
}

// ── Canvas List ─────────────────────────────────────

async function handleGetCanvases() {
	const cached = await getCachedCanvases();
	if (cached) return cached;

	try {
		const canvases = await apiListCanvases();
		await setCachedCanvases(canvases);
		return canvases;
	} catch {
		return [];
	}
}

// ── Notifications ───────────────────────────────────

function showNotification(title: string, message: string): void {
	browser.notifications.create({
		type: "basic",
		iconUrl: "icon128.png",
		title,
		message,
		priority: 1,
	});
}
