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

	// Firefox/Zen compat
	var api = (typeof chrome !== "undefined" && chrome.runtime) ? chrome : (typeof browser !== "undefined" ? browser : null);

	// ── Message Listener ──────────────────────────────

	if (api) {
		api.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
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
	}

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

		keyframesEl = document.createElement("style");
		keyframesEl.id = "canvas-grab-kf";
		keyframesEl.textContent =
			"@keyframes cg-fadeIn{from{opacity:0;transform:translateY(-10px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}" +
			"@keyframes cg-overlayIn{from{opacity:0}to{opacity:1}}" +
			"@keyframes cg-pulse{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,0)}50%{box-shadow:0 0 0 8px rgba(59,130,246,0.15)}}";
		document.head.appendChild(keyframesEl);

		styleEl = document.createElement("style");
		styleEl.id = "canvas-grab-css";
		styleEl.textContent =
			"#cg-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:2147483645;pointer-events:none;animation:cg-overlayIn 0.25s ease;}" +
			"#cg-badge{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#111110;color:#eae8e4;padding:12px 20px;border-radius:14px;font-family:-apple-system,'Segoe UI',system-ui,sans-serif;font-size:14px;font-weight:600;box-shadow:0 12px 40px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.06);pointer-events:none;display:flex;align-items:center;gap:12px;animation:cg-fadeIn 0.3s cubic-bezier(0.16,1,0.3,1);}" +
			"#cg-badge .cg-badge-dot{width:8px;height:8px;border-radius:50%;background:#3b82f6;animation:cg-pulse 2s ease-in-out infinite;}" +
			"#cg-badge .cg-badge-esc{color:#6b7280;font-size:11px;font-weight:500;background:rgba(255,255,255,0.06);padding:3px 8px;border-radius:6px;margin-left:4px;}" +
			".cg-img{position:relative !important;z-index:2147483646 !important;cursor:pointer !important;border-radius:6px;transition:all 0.2s cubic-bezier(0.16,1,0.3,1) !important;filter:brightness(1) !important;}" +
			".cg-img.cg-hover{outline:3px solid #3b82f6 !important;outline-offset:3px !important;filter:brightness(1.08) !important;transform:scale(1.02);box-shadow:0 0 0 6px rgba(59,130,246,0.15),0 8px 32px rgba(0,0,0,0.3) !important;}" +
			".cg-img.cg-success{outline:3px solid #22c55e !important;outline-offset:3px !important;filter:brightness(1.05) !important;box-shadow:0 0 0 6px rgba(34,197,94,0.2),0 8px 32px rgba(0,0,0,0.3) !important;}" +
			".cg-bg{position:relative !important;z-index:2147483646 !important;cursor:pointer !important;border-radius:8px;transition:all 0.2s cubic-bezier(0.16,1,0.3,1) !important;overflow:hidden;}" +
			".cg-bg.cg-hover{outline:3px solid #3b82f6 !important;outline-offset:3px !important;box-shadow:0 0 0 6px rgba(59,130,246,0.15),0 8px 32px rgba(0,0,0,0.3) !important;transform:scale(1.01);}" +
			".cg-toast{position:fixed;z-index:2147483647;padding:10px 18px;border-radius:10px;font-family:-apple-system,'Segoe UI',system-ui,sans-serif;font-size:13px;font-weight:600;pointer-events:none;white-space:nowrap;animation:cg-fadeIn 0.2s cubic-bezier(0.16,1,0.3,1);backdrop-filter:blur(8px);}" +
			".cg-toast-success{background:rgba(22,101,52,0.95);color:#bbf7d0;border:1px solid rgba(34,197,94,0.4);box-shadow:0 12px 48px rgba(0,0,0,0.5);font-size:18px;font-weight:700;padding:16px 28px;border-radius:14px;}" +
			".cg-toast-error{background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);box-shadow:0 8px 32px rgba(0,0,0,0.3);}";
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

	// ── Helpers ───────────────────────────────────────

	function isValidImageUrl(url) {
		if (!url) return false;
		if (url.indexOf("data:") === 0) return false;
		if (url.indexOf("blob:") === 0) return false;
		if (url.indexOf("abs-0.twimg.com/images/themes/") > -1) return false;
		return true;
	}

	function imgHasRealSrc(img) {
		if (img.src && isValidImageUrl(img.src)) return true;
		if (img.currentSrc && isValidImageUrl(img.currentSrc)) return true;
		if (img.srcset && img.srcset.length > 5) return true;
		if (img.getAttribute("data-src") && isValidImageUrl(img.getAttribute("data-src"))) return true;
		if (img.getAttribute("data-original") && isValidImageUrl(img.getAttribute("data-original"))) return true;
		return false;
	}

	/**
	 * Very lenient visibility check.
	 * For Twitter feed images that may be lazy-loaded, we also accept
	 * images with a valid src even if offset dimensions are 0.
	 */
	function imgIsVisible(img) {
		if (img.offsetWidth > 10 || img.offsetHeight > 10) return true;
		if (img.naturalWidth > 10 || img.naturalHeight > 10) return true;
		var w = parseInt(img.getAttribute("width"), 10);
		var h = parseInt(img.getAttribute("height"), 10);
		if (w > 10 || h > 10) return true;
		try {
			var cs = window.getComputedStyle(img);
			var cw = parseInt(cs.width, 10);
			var ch = parseInt(cs.height, 10);
			if (cw > 10 || ch > 10) return true;
		} catch (e) {}
		return false;
	}

	/**
	 * Check if element looks like it contains/is an image worth capturing.
	 * Very aggressive: checks tags, srcset, data attributes, background images.
	 */
	function elementHasImage(el) {
		if (!el || el === document.body || el === document.documentElement) return false;
		if (el.id === "cg-overlay" || el.id === "cg-badge") return false;

		// It's an <img>
		if (el.tagName === "IMG") return imgHasRealSrc(el);

		// It's a <picture> or <figure>
		if (el.tagName === "PICTURE" || el.tagName === "FIGURE") {
			var inner = el.querySelector("img");
			if (inner) return imgHasRealSrc(inner);
		}

		// It has a background image
		try {
			var bg = window.getComputedStyle(el).backgroundImage;
			if (bg && bg !== "none") {
				var m = bg.match(/url\(["']?([^"')]+)["']?\)/);
				if (m && m[1] && isValidImageUrl(m[1])) return true;
			}
		} catch (e) {}

		return false;
	}

	/**
	 * Given any element, try to find the actual image element nearby.
	 * Walks up ancestors and searches children aggressively.
	 */
	function findImageElement(el) {
		if (!el || el === document.body || el === document.documentElement) return null;
		if (el.id === "cg-overlay" || el.id === "cg-badge") return null;
		if (el.closest && el.closest("#cg-overlay")) return null;
		if (el.closest && el.closest("#cg-badge")) return null;

		// Direct <img>
		if (el.tagName === "IMG" && imgHasRealSrc(el)) return el;

		// Parent is <img>
		if (el.parentElement && el.parentElement.tagName === "IMG" && imgHasRealSrc(el.parentElement)) {
			return el.parentElement;
		}

		// Walk up ancestors (up to 8 levels) looking for <img>, background-image, or <a> with <img>
		var checkEl = el;
		for (var i = 0; i < 8 && checkEl; i++) {
			if (checkEl.id === "cg-overlay" || checkEl.id === "cg-badge") break;

			// Direct <img> in ancestor
			if (checkEl.tagName === "IMG" && imgHasRealSrc(checkEl)) return checkEl;

			// <img> inside <a> (Twitter feed wraps images in links)
			if (checkEl.tagName === "A") {
				var anchorImg = checkEl.querySelector("img");
				if (anchorImg && imgHasRealSrc(anchorImg)) return anchorImg;
				// Also check for background image on the anchor
				try {
					var aBg = window.getComputedStyle(checkEl).backgroundImage;
					if (aBg && aBg !== "none") {
						var aM = aBg.match(/url\(["']?([^"')]+)["']?\)/);
						if (aM && aM[1] && isValidImageUrl(aM[1])) return checkEl;
					}
				} catch (e) {}
			}

			// Background image on ancestor
			try {
				var bg = window.getComputedStyle(checkEl).backgroundImage;
				if (bg && bg !== "none") {
					var m = bg.match(/url\(["']?([^"')]+)["']?\)/);
					if (m && m[1] && isValidImageUrl(m[1])) return checkEl;
				}
			} catch (e) {}

			// <div> with role="img" (Twitter uses these)
			if (checkEl.getAttribute && checkEl.getAttribute("role") === "img") {
				try {
					var rBg = window.getComputedStyle(checkEl).backgroundImage;
					if (rBg && rBg !== "none") {
						var rM = rBg.match(/url\(["']?([^"')]+)["']?\)/);
						if (rM && rM[1] && isValidImageUrl(rM[1])) return checkEl;
					}
				} catch (e) {}
			}

			// <picture> or <figure>
			if (checkEl.tagName === "PICTURE" || checkEl.tagName === "FIGURE") {
				var picImg = checkEl.querySelector("img");
				if (picImg && imgHasRealSrc(picImg)) return picImg;
			}

			// [data-testid="tweetPhoto"] Twitter-specific container
			if (checkEl.getAttribute && checkEl.getAttribute("data-testid") === "tweetPhoto") {
				var tpImg = checkEl.querySelector("img");
				if (tpImg && imgHasRealSrc(tpImg)) return tpImg;
				try {
					var tpBg = window.getComputedStyle(checkEl).backgroundImage;
					if (tpBg && tpBg !== "none") {
						var tpM = tpBg.match(/url\(["']?([^"')]+)["']?\)/);
						if (tpM && tpM[1] && isValidImageUrl(tpM[1])) return checkEl;
					}
				} catch (e) {}
			}

			checkEl = checkEl.parentElement;
		}

		return null;
	}

	// ── Highlight Images ──────────────────────────────

	function highlightAllImages() {
		imageEls = [];

		// 1) Find all <img> elements with real sources
		var imgs = document.querySelectorAll("img");
		for (var i = 0; i < imgs.length; i++) {
			var img = imgs[i];
			if (imgHasRealSrc(img)) {
				img.classList.add("cg-img");
				imageEls.push({ el: img, type: "img" });
			}
		}

		// 2) Find elements with background images (not too many DOM nodes to avoid perf issues)
		var allEls = document.querySelectorAll("div, a, figure, section, span");
		for (var j = 0; j < allEls.length; j++) {
			var el = allEls[j];
			if (el.classList.contains("cg-img") || el.classList.contains("cg-bg")) continue;
			if (el.id === "cg-overlay" || el.id === "cg-badge") continue;

			try {
				var style = window.getComputedStyle(el);
				var bg = style.backgroundImage;
				if (bg && bg !== "none") {
					var match = bg.match(/url\(["']?([^"')]+)["']?\)/);
					if (match && match[1] && isValidImageUrl(match[1])) {
						el.classList.add("cg-bg");
						imageEls.push({ el: el, type: "background", url: match[1] });
					}
				}
			} catch (e) {}
		}

		// 3) Twitter-specific: scan <article> elements for images (feed posts)
		var articles = document.querySelectorAll("article");
		for (var k = 0; k < articles.length; k++) {
			var article = articles[k];
			var artImgs = article.querySelectorAll("img");
			for (var m = 0; m < artImgs.length; m++) {
				var artImg = artImgs[m];
				if (artImg.classList.contains("cg-img")) continue;
				if (imgHasRealSrc(artImg)) {
					artImg.classList.add("cg-img");
					imageEls.push({ el: artImg, type: "img" });
				}
			}
			// tweetPhoto containers
			var tweetPhotos = article.querySelectorAll("[data-testid='tweetPhoto']");
			for (var p = 0; p < tweetPhotos.length; p++) {
				var tp = tweetPhotos[p];
				if (tp.classList.contains("cg-img") || tp.classList.contains("cg-bg")) continue;
				var tpImg = tp.querySelector("img");
				if (tpImg && imgHasRealSrc(tpImg) && !tpImg.classList.contains("cg-img")) {
					tpImg.classList.add("cg-img");
					imageEls.push({ el: tpImg, type: "img" });
				}
				try {
					var tpBg = window.getComputedStyle(tp).backgroundImage;
					if (tpBg && tpBg !== "none") {
						var tpM = tpBg.match(/url\(["']?([^"')]+)["']?\)/);
						if (tpM && tpM[1] && isValidImageUrl(tpM[1]) && !tp.classList.contains("cg-bg")) {
							tp.classList.add("cg-bg");
							imageEls.push({ el: tp, type: "background", url: tpM[1] });
						}
					}
				} catch (e) {}
			}
			// div[role="img"] containers
			var roleImgs = article.querySelectorAll("div[role='img']");
			for (var r = 0; r < roleImgs.length; r++) {
				var ri = roleImgs[r];
				if (ri.classList.contains("cg-img") || ri.classList.contains("cg-bg")) continue;
				try {
					var riBg = window.getComputedStyle(ri).backgroundImage;
					if (riBg && riBg !== "none") {
						var riM = riBg.match(/url\(["']?([^"')]+)["']?\)/);
						if (riM && riM[1] && isValidImageUrl(riM[1])) {
							ri.classList.add("cg-bg");
							imageEls.push({ el: ri, type: "background", url: riM[1] });
						}
					}
				} catch (e) {}
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
		var el = findImageElement(e.target);
		if (el && el.classList) {
			if (el.tagName === "IMG") {
				el.classList.add("cg-hover");
			} else {
				el.classList.add("cg-hover");
			}
		}
	}

	function handleMouseOut(e) {
		if (!captureMode) return;
		var el = findImageElement(e.target);
		if (el && el.classList) {
			el.classList.remove("cg-hover");
		}
	}

	// ── Click ─────────────────────────────────────────

	function handleClick(e) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();

		var el = findImageElement(e.target);
		if (!el) {
			showToast("No se detectó una imagen", false, e.clientX, e.clientY);
			return;
		}

		var imageData = extractImageData(el);
		if (!imageData || !imageData.url) {
			showToast("No se pudo extraer la imagen", false, e.clientX, e.clientY);
			return;
		}

		// Visual feedback
		el.classList.remove("cg-hover");
		el.classList.add("cg-success");
		setTimeout(function () {
			el.classList.remove("cg-success");
		}, 1000);

		// Send to background
		if (api) {
			api.runtime.sendMessage({
				type: "IMAGE_CAPTURED",
				imageData: imageData,
			});
		}

		// Show success toast
		var rect = el.getBoundingClientRect();
		var toastX = rect.right + 16;
		var toastY = rect.top + rect.height / 2;
		if (toastX + 220 > window.innerWidth) {
			toastX = rect.left - 16;
			showToast("Imagen enviada", true, toastX, toastY, true);
		} else {
			showToast("Imagen enviada", true, toastX, toastY, false);
		}

		setTimeout(deactivateCaptureMode, 1000);
	}

	// ── Image Data Extraction ─────────────────────────

	function extractImageData(el) {
		if (el.tagName === "IMG") {
			var url = getBestImageUrl(el);
			return {
				url: url,
				name: extractFileName(url, el.alt || ""),
				width: el.naturalWidth || null,
				height: el.naturalHeight || null,
			};
		}
		// Background image element
		try {
			var bg = window.getComputedStyle(el).backgroundImage;
			if (bg && bg !== "none") {
				var m = bg.match(/url\(["']?([^"')]+)["']?\)/);
				if (m && m[1]) {
					return {
						url: m[1],
						name: extractFileName(m[1], ""),
						width: null,
						height: null,
					};
				}
			}
		} catch (e) {}
		return null;
	}

	/**
	 * Get the best quality image URL from an <img> element.
	 * For Twitter: parse srcset for largest, remove name= param.
	 * For others: check parent <a> href.
	 */
	function getBestImageUrl(el) {
		// Try srcset first (often has the best quality)
		var srcsetUrl = getBestFromSrcset(el);
		if (srcsetUrl) {
			return cleanTwitterUrl(srcsetUrl);
		}

		var url = el.src || el.currentSrc || "";

		// Also check data-src and data-original (lazy-loaders)
		if (!url || !isValidImageUrl(url)) {
			url = el.getAttribute("data-src") || el.getAttribute("data-original") || url;
		}

		// Check parent <a> for a full-size link
		var anchor = el.closest ? el.closest("a") : null;
		if (anchor && anchor.href) {
			var href = anchor.href;
			if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(href) ||
				href.indexOf("pbs.twimg.com") > -1 ||
				href.indexOf("pinimg.com") > -1) {
				return href;
			}
		}

		if (url.indexOf("pbs.twimg.com") > -1) {
			return cleanTwitterUrl(url);
		}

		return url;
	}

	function cleanTwitterUrl(url) {
		// Remove name= parameter (small, medium, large, etc.)
		url = url.replace(/[?&]name=\w+/g, "");
		// Remove format= parameter
		url = url.replace(/[?&]format=\w+/g, "");
		// Clean up leftover ? or & at start of params
		url = url.replace(/\?&/, "?").replace(/\?$/, "");
		return url;
	}

	function getBestFromSrcset(el) {
		if (!el.srcset) return null;

		var entries = el.srcset.split(",");
		var best = null;
		var bestValue = 0;

		for (var i = 0; i < entries.length; i++) {
			var parts = entries[i].trim().split(/\s+/);
			if (parts.length < 2) continue;

			var entryUrl = parts[0];
			var descriptor = parts[1];

			var value = 0;
			if (descriptor.indexOf("w") === descriptor.length - 1) {
				value = parseInt(descriptor, 10);
			} else if (descriptor.indexOf("x") === descriptor.length - 1) {
				value = parseFloat(descriptor) * 1000;
			}

			if (value > bestValue) {
				bestValue = value;
				best = entryUrl;
			}
		}

		return best;
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

		toast.offsetHeight;
		toast.style.transition = "opacity 0.25s ease, transform 0.3s cubic-bezier(0.16,1,0.3,1)";
		toast.style.opacity = "1";
		toast.style.transform = "translateY(-50%) translateX(0)";

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
