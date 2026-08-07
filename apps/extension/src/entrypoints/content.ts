/**
 * Canvas Grab — Content Script
 * Injected into web pages to capture images
 * Uses MutationObserver for dynamic content, shows badge with counter
 */

import type { ActivateCaptureMessage, DeactivateCaptureMessage } from "../utils/messages";
import {
	scanForImages,
	findImageElement,
	watchForNewImages,
} from "../content/image-detection";
import { extractImageData } from "../content/image-extraction";
import { detectTwitterImages } from "../content/twitter";
import {
	createOverlay,
	removeOverlay,
	createBadge,
	updateBadgeCount,
	setBadgeState,
	removeBadge,
	showToast,
	injectStyles,
	removeStyles,
} from "../content/overlay";
import type { DetectedImage } from "../content/image-detection";

// ── State ───────────────────────────────────────────

let captureMode = false;
let allImages: DetectedImage[] = [];
let stopWatching: (() => void) | null = null;

export default defineContentScript({
	matches: ["<all_urls>"],
	runAt: "document_idle",

	main() {
		// Message listener
		browser.runtime.onMessage.addListener(
			(msg: ActivateCaptureMessage | DeactivateCaptureMessage, _sender, sendResponse) => {
				if (msg.type === "ACTIVATE_CAPTURE") {
					activateCaptureMode();
					sendResponse({ ok: true });
				}
				if (msg.type === "DEACTIVATE_CAPTURE") {
					deactivateCaptureMode();
					sendResponse({ ok: true });
				}
				return true;
			},
		);
	},
});

// ── Activate ────────────────────────────────────────

function activateCaptureMode(): void {
	if (captureMode) return;
	captureMode = true;

	injectStyles();
	createOverlay();

	// Initial scan
	allImages = scanForImages();

	// Twitter-specific scan
	const twitterImages = detectTwitterImages();
	allImages.push(...twitterImages);

	// Create badge with count
	createBadge(allImages.length);
	setBadgeState("ready");

	// Watch for dynamically added images
	stopWatching = watchForNewImages((newImages) => {
		allImages.push(...newImages);
		updateBadgeCount(allImages.length);
	});

	// Highlight all images
	highlightAllImages();

	// Event listeners
	document.addEventListener("click", handleClick, true);
	document.addEventListener("keydown", handleEscape, true);
	document.addEventListener("mouseover", handleMouseOver, true);
	document.addEventListener("mouseout", handleMouseOut, true);
}

// ── Deactivate ──────────────────────────────────────

function deactivateCaptureMode(): void {
	captureMode = false;

	stopWatching?.();
	stopWatching = null;

	unhighlightAllImages();
	removeOverlay();
	removeBadge();
	removeStyles();

	allImages = [];

	document.removeEventListener("click", handleClick, true);
	document.removeEventListener("keydown", handleEscape, true);
	document.removeEventListener("mouseover", handleMouseOver, true);
	document.removeEventListener("mouseout", handleMouseOut, true);
}

// ── Highlight ───────────────────────────────────────

function highlightAllImages(): void {
	for (const { el, type } of allImages) {
		el.classList.add(type === "background" ? "cg-bg" : "cg-img");
	}
}

function unhighlightAllImages(): void {
	for (const { el } of allImages) {
		el.classList.remove("cg-img", "cg-bg", "cg-hover", "cg-success");
	}
}

// ── Hover ───────────────────────────────────────────

function handleMouseOver(e: MouseEvent): void {
	if (!captureMode) return;
	const el = findImageElement(e.target as Element);
	if (el?.classList) {
		el.classList.add("cg-hover");
	}
}

function handleMouseOut(e: MouseEvent): void {
	if (!captureMode) return;
	const el = findImageElement(e.target as Element);
	if (el?.classList) {
		el.classList.remove("cg-hover");
	}
}

// ── Click ───────────────────────────────────────────

function handleClick(e: MouseEvent): void {
	e.preventDefault();
	e.stopPropagation();
	e.stopImmediatePropagation();

	const el = findImageElement(e.target as Element);
	if (!el) {
		showToast({ text: "No se detectó una imagen", variant: "error", x: e.clientX, y: e.clientY });
		return;
	}

	// Find the DetectedImage entry for this element
	const detected = allImages.find((d) => d.el === el) || { el, type: "img" as const, url: "" };

	const imageData = extractImageData(detected);
	if (!imageData || !imageData.url) {
		showToast({ text: "No se pudo extraer la imagen", variant: "error", x: e.clientX, y: e.clientY });
		return;
	}

	// Visual feedback
	el.classList.remove("cg-hover");
	el.classList.add("cg-success");
	setTimeout(() => el.classList.remove("cg-success"), 1000);

	// Show saving state on badge
	setBadgeState("saving");

	// Send to background
	browser.runtime.sendMessage({
		type: "IMAGE_CAPTURED",
		imageData,
	});

	setTimeout(() => {
		setBadgeState("ready");
	}, 500);

	// Show success toast near the mouse
	showToast({
		text: "Imagen guardada",
		variant: "success",
		x: e.clientX + 16,
		y: e.clientY - 20,
		duration: 2500,
	});

	// Deactivate after brief delay
	setTimeout(deactivateCaptureMode, 1200);
}

// ── Escape ──────────────────────────────────────────

function handleEscape(e: KeyboardEvent): void {
	if (e.key === "Escape") {
		deactivateCaptureMode();
	}
}
