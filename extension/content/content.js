/**
 * Canvas Grab - Content Script
 * Injected into web pages to capture images
 * Uses var/functions for Firefox/Zen MV3 compatibility
 */

(function () {
	if (window.__canvasGrabInjected) return;
	window.__canvasGrabInjected = true;

	var captureMode = false;
	var overlay = null;

	// ── Message Listener ──────────────────────────────

	chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
		if (msg.type === "ACTIVATE_CAPTURE") {
			activateCaptureMode();
			sendResponse({ ok: true });
		}
		if (msg.type === "DEACTIVATE_CAPTURE") {
			deactivateCaptureMode();
			sendResponse({ ok: true });
		}
		return true;
	});

	// ── Capture Mode ──────────────────────────────────

	function activateCaptureMode() {
		if (captureMode) return;
		captureMode = true;
		createOverlay();
		document.body.style.cursor = "crosshair";
		document.addEventListener("click", handleCaptureClick, true);
		document.addEventListener("keydown", handleEscape, true);
	}

	function deactivateCaptureMode() {
		captureMode = false;
		removeOverlay();
		document.body.style.cursor = "";
		document.removeEventListener("click", handleCaptureClick, true);
		document.removeEventListener("keydown", handleEscape, true);
	}

	// ── Overlay ───────────────────────────────────────

	function createOverlay() {
		if (overlay) return;
		overlay = document.createElement("div");
		overlay.id = "canvas-grab-overlay";
		overlay.style.cssText =
			"position:fixed;top:12px;right:12px;z-index:2147483647;" +
			"background:#1b1b1a;color:#eae8e4;padding:8px 14px;border-radius:8px;" +
			"font-family:-apple-system,'Segoe UI',system-ui,sans-serif;font-size:12px;" +
			"font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.3);border:1px solid #2a2926;" +
			"pointer-events:none;display:flex;align-items:center;gap:8px;";
		overlay.textContent = "Click en una imagen · ESC para cancelar";
		document.body.appendChild(overlay);
	}

	function removeOverlay() {
		if (overlay) {
			overlay.remove();
			overlay = null;
		}
	}

	// ── Click Handler ─────────────────────────────────

	function handleCaptureClick(e) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();

		var target = findImageTarget(e.target);
		if (!target) {
			flashFeedback(e.clientX, e.clientY, "No se detectó una imagen");
			return;
		}

		var imageData = extractImageData(target);
		if (!imageData || !imageData.url) {
			flashFeedback(e.clientX, e.clientY, "No se pudo extraer la imagen");
			return;
		}

		chrome.runtime.sendMessage({
			type: "IMAGE_CAPTURED",
			imageData: imageData,
		});

		flashFeedback(e.clientX, e.clientY, "✓ Imagen capturada");
		setTimeout(deactivateCaptureMode, 500);
	}

	// ── Image Detection ───────────────────────────────

	function findImageTarget(el) {
		// Direct <img>
		if (el.tagName === "IMG" && el.src) return { type: "img", el: el };

		// <img> inside <a>
		var parent = el.closest ? el.closest("a") : null;
		if (parent) {
			var innerImg = parent.querySelector("img");
			if (innerImg && innerImg.src) return { type: "img", el: innerImg };
		}

		// <picture>
		if (el.tagName === "PICTURE") {
			var picImg = el.querySelector("img");
			if (picImg && picImg.src) return { type: "img", el: picImg };
		}

		// Background image
		var bg = window.getComputedStyle(el).backgroundImage;
		if (bg && bg !== "none") {
			var match = bg.match(/url\(["']?([^"')]+)["']?\)/);
			if (match) return { type: "background", url: match[1], el: el };
		}

		// Check ancestors (up to 3 levels)
		var ancestor = el.parentElement;
		for (var i = 0; i < 3 && ancestor; i++) {
			var bg2 = window.getComputedStyle(ancestor).backgroundImage;
			if (bg2 && bg2 !== "none") {
				var match2 = bg2.match(/url\(["']?([^"')]+)["']?\)/);
				if (match2) return { type: "background", url: match2[1], el: ancestor };
			}
			ancestor = ancestor.parentElement;
		}

		return null;
	}

	function extractImageData(target) {
		if (target.type === "img") {
			var el = target.el;
			return {
				url: el.currentSrc || el.src,
				name: extractFileName(el.src, el.alt),
				width: el.naturalWidth || null,
				height: el.naturalHeight || null,
			};
		}
		if (target.type === "background") {
			return {
				url: target.url,
				name: extractFileName(target.url, ""),
				width: null,
				height: null,
			};
		}
		return null;
	}

	function extractFileName(url, alt) {
		try {
			var pathname = new URL(url).pathname;
			var segments = pathname.split("/");
			var last = segments[segments.length - 1];
			if (last && last.indexOf(".") > -1) {
				return decodeURIComponent(last);
			}
		} catch (e) {}
		return alt || "imagen";
	}

	// ── Visual Feedback ───────────────────────────────

	function flashFeedback(x, y, text) {
		var el = document.createElement("div");
		el.textContent = text;
		el.style.cssText =
			"position:fixed;left:" + x + "px;top:" + (y - 40) + "px;z-index:2147483647;" +
			"background:#1b1b1a;color:#eae8e4;padding:6px 12px;border-radius:6px;" +
			"font-family:-apple-system,'Segoe UI',system-ui,sans-serif;font-size:12px;" +
			"font-weight:500;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:1px solid #2a2926;" +
			"pointer-events:none;transform:translateX(-50%);transition:opacity 0.3s ease;";
		document.body.appendChild(el);
		setTimeout(function () {
			el.style.opacity = "0";
			setTimeout(function () { el.remove(); }, 300);
		}, 1500);
	}

	// ── Escape Key ────────────────────────────────────

	function handleEscape(e) {
		if (e.key === "Escape") {
			deactivateCaptureMode();
		}
	}
})();
