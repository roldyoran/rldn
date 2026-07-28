/**
 * Canvas Grab - Content Script
 * Injected into web pages to capture images
 * Dark overlay + spotlight on images, no ugly cursor
 */

(function () {
	if (window.__canvasGrabInjected) return;
	window.__canvasGrabInjected = true;

	var captureMode = false;
	var overlay = null;
	var badge = null;
	var styleEl = null;
	var keyframesEl = null;
	var imageEls = [];

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

	// ── Activate ──────────────────────────────────────

	function activateCaptureMode() {
		if (captureMode) return;
		captureMode = true;

		injectStyles();
		createDarkOverlay();
		createBadge();
		highlightAllImages();

		document.addEventListener("click", handleClick, true);
		document.addEventListener("keydown", handleEscape, true);
		document.addEventListener("mouseover", handleMouseOver, true);
		document.addEventListener("mouseout", handleMouseOut, true);
	}

	// ── Deactivate ────────────────────────────────────

	function deactivateCaptureMode() {
		captureMode = false;

		removeDarkOverlay();
		removeBadge();
		unhighlightAllImages();
		removeStyles();

		document.removeEventListener("click", handleClick, true);
		document.removeEventListener("keydown", handleEscape, true);
		document.removeEventListener("mouseover", handleMouseOver, true);
		document.removeEventListener("mouseout", handleMouseOut, true);
	}

	// ── Inject CSS ────────────────────────────────────

	function injectStyles() {
		if (styleEl) return;

		// Keyframes
		keyframesEl = document.createElement("style");
		keyframesEl.id = "canvas-grab-kf";
		keyframesEl.textContent =
			"@keyframes cg-fadeIn{from{opacity:0;transform:translateY(-10px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}" +
			"@keyframes cg-overlayIn{from{opacity:0}to{opacity:1}}" +
			"@keyframes cg-pulse{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,0)}50%{box-shadow:0 0 0 8px rgba(59,130,246,0.15)}}" +
			"@keyframes cg-glowPulse{0%,100%{filter:brightness(1) drop-shadow(0 0 4px rgba(59,130,246,0.3))}50%{filter:brightness(1.05) drop-shadow(0 0 12px rgba(59,130,246,0.6))}}" +
			"@keyframes cg-checkPop{0%{transform:scale(0);opacity:0}50%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}";
		document.head.appendChild(keyframesEl);

		// Main styles
		styleEl = document.createElement("style");
		styleEl.id = "canvas-grab-css";
		styleEl.textContent =
			// Dark overlay
			"#cg-overlay{" +
			"position:fixed;top:0;left:0;right:0;bottom:0;" +
			"background:rgba(0,0,0,0.55);" +
			"z-index:2147483645;" +
			"pointer-events:none;" +
			"animation:cg-overlayIn 0.25s ease;" +
			"}" +

			// Badge
			"#cg-badge{" +
			"position:fixed;top:20px;left:50%;transform:translateX(-50%);" +
			"z-index:2147483647;" +
			"background:#111110;color:#eae8e4;" +
			"padding:12px 20px;border-radius:14px;" +
			"font-family:-apple-system,'Segoe UI',system-ui,sans-serif;font-size:14px;font-weight:600;" +
			"box-shadow:0 12px 40px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.06);" +
			"pointer-events:none;" +
			"display:flex;align-items:center;gap:12px;" +
			"animation:cg-fadeIn 0.3s cubic-bezier(0.16,1,0.3,1);" +
			"}" +
			"#cg-badge .cg-badge-dot{" +
			"width:8px;height:8px;border-radius:50%;background:#3b82f6;" +
			"animation:cg-pulse 2s ease-in-out infinite;" +
			"}" +
			"#cg-badge .cg-badge-esc{" +
			"color:#6b7280;font-size:11px;font-weight:500;" +
			"background:rgba(255,255,255,0.06);padding:3px 8px;border-radius:6px;" +
			"margin-left:4px;" +
			"}" +

			// Image spotlight - above overlay
			".cg-img{" +
			"position:relative !important;" +
			"z-index:2147483646 !important;" +
			"cursor:pointer !important;" +
			"border-radius:6px;" +
			"transition:all 0.2s cubic-bezier(0.16,1,0.3,1) !important;" +
			"filter:brightness(1) !important;" +
			"}" +
			".cg-img.cg-hover{" +
			"outline:3px solid #3b82f6 !important;" +
			"outline-offset:3px !important;" +
			"filter:brightness(1.08) !important;" +
			"transform:scale(1.02);" +
			"box-shadow:0 0 0 6px rgba(59,130,246,0.15),0 8px 32px rgba(0,0,0,0.3) !important;" +
			"}" +
			".cg-img.cg-success{" +
			"outline:3px solid #22c55e !important;" +
			"outline-offset:3px !important;" +
			"filter:brightness(1.05) !important;" +
			"box-shadow:0 0 0 6px rgba(34,197,94,0.2),0 8px 32px rgba(0,0,0,0.3) !important;" +
			"}" +

			// Background image spotlight
			".cg-bg{" +
			"position:relative !important;" +
			"z-index:2147483646 !important;" +
			"cursor:pointer !important;" +
			"border-radius:8px;" +
			"transition:all 0.2s cubic-bezier(0.16,1,0.3,1) !important;" +
			"overflow:hidden;" +
			"}" +
			".cg-bg.cg-hover{" +
			"outline:3px solid #3b82f6 !important;" +
			"outline-offset:3px !important;" +
			"box-shadow:0 0 0 6px rgba(59,130,246,0.15),0 8px 32px rgba(0,0,0,0.3) !important;" +
			"transform:scale(1.01);" +
			"}" +

			// Toast feedback
			".cg-toast{" +
			"position:fixed;z-index:2147483647;" +
			"padding:10px 18px;border-radius:10px;" +
			"font-family:-apple-system,'Segoe UI',system-ui,sans-serif;font-size:13px;font-weight:600;" +
			"pointer-events:none;white-space:nowrap;" +
			"animation:cg-fadeIn 0.2s cubic-bezier(0.16,1,0.3,1);" +
			"backdrop-filter:blur(8px);" +
			"}" +
			".cg-toast-success{" +
			"background:rgba(22,101,52,0.95);color:#bbf7d0;" +
			"border:1px solid rgba(34,197,94,0.4);" +
			"box-shadow:0 12px 48px rgba(0,0,0,0.5);" +
			"font-size:18px;font-weight:700;padding:16px 28px;border-radius:14px;" +
			"}" +
			".cg-toast-error{" +
			"background:rgba(239,68,68,0.15);color:#f87171;" +
			"border:1px solid rgba(239,68,68,0.3);" +
			"box-shadow:0 8px 32px rgba(0,0,0,0.3);" +
			"}";
		document.head.appendChild(styleEl);
	}

	function removeStyles() {
		if (styleEl) { styleEl.remove(); styleEl = null; }
		if (keyframesEl) { keyframesEl.remove(); keyframesEl = null; }
	}

	// ── Dark Overlay ──────────────────────────────────

	function createDarkOverlay() {
		if (overlay) return;
		overlay = document.createElement("div");
		overlay.id = "cg-overlay";
		document.body.appendChild(overlay);
	}

	function removeDarkOverlay() {
		if (overlay) { overlay.remove(); overlay = null; }
	}

	// ── Badge ─────────────────────────────────────────

	function createBadge() {
		if (badge) return;
		badge = document.createElement("div");
		badge.id = "cg-badge";

		var dot = document.createElement("span");
		dot.className = "cg-badge-dot";

		var text = document.createElement("span");
		text.textContent = "Selecciona una imagen";

		var esc = document.createElement("span");
		esc.className = "cg-badge-esc";
		esc.textContent = "ESC";

		badge.appendChild(dot);
		badge.appendChild(text);
		badge.appendChild(esc);
		document.body.appendChild(badge);
	}

	function removeBadge() {
		if (badge) { badge.remove(); badge = null; }
	}

	// ── Highlight Images ──────────────────────────────

	function highlightAllImages() {
		imageEls = [];

		// Find all <img> elements
		var imgs = document.querySelectorAll("img");
		for (var i = 0; i < imgs.length; i++) {
			var img = imgs[i];
			if (img.src && img.offsetWidth > 20 && img.offsetHeight > 20) {
				img.classList.add("cg-img");
				imageEls.push({ el: img, type: "img" });
			}
		}

		// Find elements with background images
		var allEls = document.querySelectorAll("*");
		for (var j = 0; j < allEls.length; j++) {
			var el = allEls[j];
			if (el.classList.contains("cg-img") || el.id === "cg-overlay" || el.id === "cg-badge") continue;

			var style = window.getComputedStyle(el);
			var bg = style.backgroundImage;
			if (bg && bg !== "none") {
				var match = bg.match(/url\(["']?([^"')]+)["']?\)/);
				if (match && match[1] && !match[1].startsWith("data:")) {
					if (el.offsetWidth > 30 && el.offsetHeight > 30) {
						el.classList.add("cg-bg");
						imageEls.push({ el: el, type: "background", url: match[1] });
					}
				}
			}
		}
	}

	function unhighlightAllImages() {
		for (var i = 0; i < imageEls.length; i++) {
			imageEls[i].el.classList.remove("cg-img", "cg-bg", "cg-hover", "cg-success");
		}
		imageEls = [];
	}

	// ── Hover ─────────────────────────────────────────

	function handleMouseOver(e) {
		if (!captureMode) return;
		var target = findImageTarget(e.target);
		if (target && target.el) {
			target.el.classList.add("cg-hover");
		}
	}

	function handleMouseOut(e) {
		if (!captureMode) return;
		var target = findImageTarget(e.target);
		if (target && target.el) {
			target.el.classList.remove("cg-hover");
		}
	}

	// ── Click ─────────────────────────────────────────

	function handleClick(e) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();

		var target = findImageTarget(e.target);
		if (!target) {
			showToast("No se detectó una imagen", false, e.clientX, e.clientY);
			return;
		}

		var imageData = extractImageData(target);
		if (!imageData || !imageData.url) {
			showToast("No se pudo extraer la imagen", false, e.clientX, e.clientY);
			return;
		}

		// Visual feedback on the image
		if (target.el) {
			target.el.classList.remove("cg-hover");
			target.el.classList.add("cg-success");
			setTimeout(function () {
				if (target.el) target.el.classList.remove("cg-success");
			}, 1000);
		}

		// Send to background
		chrome.runtime.sendMessage({
			type: "IMAGE_CAPTURED",
			imageData: imageData,
		});

		// Show success toast to the side of the image
		var rect = target.el.getBoundingClientRect();
		var toastX = rect.right + 16;
		var toastY = rect.top + rect.height / 2;
		// If it would go off-screen right, show on the left
		if (toastX + 220 > window.innerWidth) {
			toastX = rect.left - 16;
			showToast("✓  Imagen enviada", true, toastX, toastY, true);
		} else {
			showToast("✓  Imagen enviada", true, toastX, toastY, false);
		}

		// Deactivate after a moment
		setTimeout(deactivateCaptureMode, 1000);
	}

	// ── Image Detection ───────────────────────────────

	function findImageTarget(el) {
		if (!el || el === document.body || el === document.documentElement) return null;

		// Skip overlay and badge
		if (el.id === "cg-overlay" || el.id === "cg-badge") return null;
		if (el.closest && el.closest("#cg-overlay")) return null;
		if (el.closest && el.closest("#cg-badge")) return null;

		// Direct <img>
		if (el.tagName === "IMG" && el.src) return { type: "img", el: el };

		// Check if parent is img
		if (el.parentElement && el.parentElement.tagName === "IMG" && el.parentElement.src) {
			return { type: "img", el: el.parentElement };
		}

		// <img> inside <a>
		var anchor = el.closest ? el.closest("a") : null;
		if (anchor) {
			var innerImg = anchor.querySelector("img");
			if (innerImg && innerImg.src) return { type: "img", el: innerImg };
		}

		// <picture>
		if (el.tagName === "PICTURE") {
			var picImg = el.querySelector("img");
			if (picImg && picImg.src) return { type: "img", el: picImg };
		}

		// Background image on element or ancestors
		var checkEl = el;
		for (var i = 0; i < 4 && checkEl; i++) {
			if (checkEl.id === "cg-overlay" || checkEl.id === "cg-badge") break;
			var bg = window.getComputedStyle(checkEl).backgroundImage;
			if (bg && bg !== "none") {
				var match = bg.match(/url\(["']?([^"')]+)["']?\)/);
				if (match && match[1] && !match[1].startsWith("data:")) {
					return { type: "background", url: match[1], el: checkEl };
				}
			}
			checkEl = checkEl.parentElement;
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

	// ── Toast ─────────────────────────────────────────

	function showToast(text, success, x, y, fromRight) {
		var toast = document.createElement("div");
		toast.className = "cg-toast " + (success ? "cg-toast-success" : "cg-toast-error");
		toast.textContent = text;
		toast.style.left = x + "px";
		toast.style.top = y + "px";
		toast.style.transform = "translateY(-50%)";
		if (fromRight) {
			toast.style.transform = "translateY(-50%) translateX(-100%)";
		}
		toast.style.opacity = "0";
		document.body.appendChild(toast);

		// Trigger reflow then animate in
		toast.offsetHeight;
		toast.style.transition = "opacity 0.25s ease, transform 0.3s cubic-bezier(0.16,1,0.3,1)";
		toast.style.opacity = "1";
		if (fromRight) {
			toast.style.transform = "translateY(-50%) translateX(0)";
		} else {
			toast.style.transform = "translateY(-50%) translateX(0)";
		}

		setTimeout(function () {
			toast.style.opacity = "0";
			toast.style.transform = "translateY(-50%) translateX(8px)";
			setTimeout(function () { toast.remove(); }, 300);
		}, 1800);
	}

	// ── Escape ────────────────────────────────────────

	function handleEscape(e) {
		if (e.key === "Escape") {
			deactivateCaptureMode();
		}
	}
})();
