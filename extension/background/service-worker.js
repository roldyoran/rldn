/**
 * Canvas Grab - Service Worker (Background Script)
 * Bridges popup ↔ content script, handles API calls
 * Compatible with Chrome, Brave, and Firefox/Zen MV3
 */

var DEFAULT_BASE_URL = "http://localhost:4321";

function getConfig() {
	return api.storage.local.get(["apiKey", "baseUrl"]).then(function (data) {
		return {
			apiKey: data.apiKey || "",
			baseUrl: data.baseUrl || DEFAULT_BASE_URL,
		};
	});
}

function apiFetch(path, options) {
	options = options || {};
	return getConfig().then(function (config) {
		var url = config.baseUrl + path;
		var headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
		if (config.apiKey) {
			headers["x-api-key"] = config.apiKey;
		}
		return fetch(url, Object.assign({}, options, { headers: headers }));
	});
}

function saveImage(canvasId, imageData) {
	return apiFetch("/api/canvases/" + canvasId + "/images", {
		method: "POST",
		body: JSON.stringify({
			url: imageData.url,
			name: imageData.name,
			width: imageData.width,
			height: imageData.height,
		}),
	}).then(function (res) {
		if (!res.ok) {
			return res.json().then(function (body) {
				throw new Error(body.error || "Error " + res.status);
			}).catch(function (e) {
				if (e.message && e.message !== (body && body.error)) throw e;
				throw new Error("Error " + res.status);
			});
		}
		return res.json();
	});
}

function getCanvasName(canvasId) {
	return apiFetch("/api/canvases/" + canvasId).then(function (res) {
		if (res.ok) return res.json().then(function (d) { return d.name || "Sin título"; });
		return "";
	}).catch(function () { return ""; });
}

// ── Message Handler ───────────────────────────────────

// Firefox/Zen compat
var api = (typeof chrome !== "undefined" && chrome.runtime) ? chrome : (typeof browser !== "undefined" ? browser : null);

api.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
	if (msg.type === "START_CAPTURE") {
		handleStartCapture(msg.tabId, msg.canvasId);
		sendResponse({ ok: true });
	}

	if (msg.type === "IMAGE_CAPTURED") {
		handleImageCaptured(msg.imageData);
		sendResponse({ ok: true });
	}

	return true;
});

// ── Capture Flow ──────────────────────────────────────

function handleStartCapture(tabId, canvasId) {
	api.scripting.executeScript({
		target: { tabId: tabId },
		files: ["content/content.js"],
	}).then(function () {
		api.tabs.sendMessage(tabId, { type: "ACTIVATE_CAPTURE" });
		return api.storage.local.set({ activeCanvasId: canvasId });
	}).catch(function (err) {
		console.error("Canvas Grab: Failed to inject content script", err);
		showNotification("Error", "No se pudo activar el modo captura en esta página");
	});
}

function handleImageCaptured(imageData) {
	api.storage.local.get("activeCanvasId").then(function (data) {
		var canvasId = data.activeCanvasId;
		if (!canvasId) {
			showNotification("Error", "No hay lienzo seleccionado");
			return;
		}

		return saveImage(canvasId, imageData).then(function () {
			return getCanvasName(canvasId);
		}).then(function (canvasName) {
			showNotification("Imagen guardada", imageData.name + " → " + canvasName);
			api.runtime.sendMessage({
				type: "CAPTURE_SUCCESS",
				imageName: imageData.name,
				canvasName: canvasName,
			}).catch(function () {});
		});
	}).catch(function (err) {
		console.error("Canvas Grab: Failed to save image", err);
		showNotification("Error", (err && err.message) || "No se pudo guardar la imagen");
	});
}

// ── Notifications ─────────────────────────────────────

function showNotification(title, message) {
	api.notifications.create({
		type: "basic",
		iconUrl: "icons/icon128.png",
		title: title,
		message: message,
		priority: 1,
	});
}

// ── Extension Install ─────────────────────────────────

api.runtime.onInstalled.addListener(function () {
	api.storage.local.get(["baseUrl"], function (data) {
		if (!data.baseUrl) {
			api.storage.local.set({ baseUrl: DEFAULT_BASE_URL });
		}
	});
});
