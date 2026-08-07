/**
 * Canvas Grab — Image Detection
 * Detects all images on a page using MutationObserver for dynamic content
 */

import { isValidImageUrl } from "../utils/url";

export interface DetectedImage {
	el: HTMLElement;
	type: "img" | "background" | "picture";
	url: string;
}

/**
 * Check if an <img> has a real, usable source
 */
export function imgHasRealSrc(img: HTMLImageElement): boolean {
	if (img.src && isValidImageUrl(img.src)) return true;
	if (img.currentSrc && isValidImageUrl(img.currentSrc)) return true;
	if (img.srcset && img.srcset.length > 5) return true;
	const dataSrc = img.getAttribute("data-src");
	if (dataSrc && isValidImageUrl(dataSrc)) return true;
	const dataOriginal = img.getAttribute("data-original");
	if (dataOriginal && isValidImageUrl(dataOriginal)) return true;
	return false;
}

/**
 * Lenient visibility check — accepts images that might be lazy-loaded
 */
export function imgIsVisible(img: HTMLImageElement): boolean {
	if (img.offsetWidth > 10 || img.offsetHeight > 10) return true;
	if (img.naturalWidth > 10 || img.naturalHeight > 10) return true;
	const w = Number.parseInt(img.getAttribute("width") || "0", 10);
	const h = Number.parseInt(img.getAttribute("height") || "0", 10);
	if (w > 10 || h > 10) return true;
	try {
		const cs = window.getComputedStyle(img);
		const cw = Number.parseInt(cs.width, 10);
		const ch = Number.parseInt(cs.height, 10);
		if (cw > 10 || ch > 10) return true;
	} catch {}
	return false;
}

/**
 * Check if an element has/is an image worth capturing
 */
export function elementHasImage(el: Element): boolean {
	if (!el || el === document.body || el === document.documentElement) return false;
	if ((el as HTMLElement).id?.startsWith("cg-")) return false;

	// Direct <img>
	if (el.tagName === "IMG") return imgHasRealSrc(el as HTMLImageElement);

	// <picture> or <figure>
	if (el.tagName === "PICTURE" || el.tagName === "FIGURE") {
		const inner = el.querySelector("img");
		if (inner) return imgHasRealSrc(inner);
	}

	// Background image
	try {
		const bg = window.getComputedStyle(el).backgroundImage;
		if (bg && bg !== "none") {
			const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
			if (m?.[1] && isValidImageUrl(m[1])) return true;
		}
	} catch {}

	return false;
}

/**
 * Find the actual image element from any element the user interacts with
 * Walks up ancestors and searches children
 */
export function findImageElement(el: Element | null): HTMLElement | null {
	if (!el || el === document.body || el === document.documentElement) return null;
	if ((el as HTMLElement).id?.startsWith("cg-")) return null;
	if (el.closest?.("#cg-overlay") || el.closest?.("#cg-badge")) return null;

	// Direct <img>
	if (el.tagName === "IMG" && imgHasRealSrc(el as HTMLImageElement)) return el as HTMLElement;

	// Parent is <img>
	const parent = el.parentElement;
	if (parent?.tagName === "IMG" && imgHasRealSrc(parent as HTMLImageElement)) return parent;

	// Walk up ancestors (up to 8 levels)
	let checkEl: Element | null = el;
	for (let i = 0; i < 8 && checkEl; i++) {
		if ((checkEl as HTMLElement).id?.startsWith("cg-")) break;

		// Direct <img>
		if (checkEl.tagName === "IMG" && imgHasRealSrc(checkEl as HTMLImageElement))
			return checkEl as HTMLElement;

		// <img> inside <a> (Twitter wraps images in links)
		if (checkEl.tagName === "A") {
			const anchorImg = checkEl.querySelector("img");
			if (anchorImg && imgHasRealSrc(anchorImg)) return anchorImg;
			try {
				const aBg = window.getComputedStyle(checkEl).backgroundImage;
				if (aBg && aBg !== "none") {
					const aM = aBg.match(/url\(["']?([^"')]+)["']?\)/);
					if (aM?.[1] && isValidImageUrl(aM[1])) return checkEl as HTMLElement;
				}
			} catch {}
		}

		// Background image
		try {
			const bg = window.getComputedStyle(checkEl).backgroundImage;
			if (bg && bg !== "none") {
				const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
				if (m?.[1] && isValidImageUrl(m[1])) return checkEl as HTMLElement;
			}
		} catch {}

		// div[role="img"] (Twitter)
		if (checkEl.getAttribute?.("role") === "img") {
			try {
				const rBg = window.getComputedStyle(checkEl).backgroundImage;
				if (rBg && rBg !== "none") {
					const rM = rBg.match(/url\(["']?([^"')]+)["']?\)/);
					if (rM?.[1] && isValidImageUrl(rM[1])) return checkEl as HTMLElement;
				}
			} catch {}
		}

		// <picture> or <figure>
		if (checkEl.tagName === "PICTURE" || checkEl.tagName === "FIGURE") {
			const picImg = checkEl.querySelector("img");
			if (picImg && imgHasRealSrc(picImg)) return picImg;
		}

		// Twitter tweetPhoto container
		if (checkEl.getAttribute?.("data-testid") === "tweetPhoto") {
			const tpImg = checkEl.querySelector("img");
			if (tpImg && imgHasRealSrc(tpImg)) return tpImg;
			try {
				const tpBg = window.getComputedStyle(checkEl).backgroundImage;
				if (tpBg && tpBg !== "none") {
					const tpM = tpBg.match(/url\(["']?([^"')]+)["']?\)/);
					if (tpM?.[1] && isValidImageUrl(tpM[1])) return checkEl as HTMLElement;
				}
			} catch {}
		}

		checkEl = checkEl.parentElement;
	}

	return null;
}

/**
 * Scan the DOM for all images and return them
 */
export function scanForImages(): DetectedImage[] {
	const results: DetectedImage[] = [];
	const seen = new Set<Element>();

	// 1) All <img> elements with real sources
	const imgs = document.querySelectorAll("img");
	for (const img of imgs) {
		if (seen.has(img)) continue;
		if (imgHasRealSrc(img)) {
			seen.add(img);
			results.push({ el: img as HTMLElement, type: "img", url: "" });
		}
	}

	// 2) Elements with background images
	const bgElements = document.querySelectorAll("div, a, figure, section, span");
	for (const el of bgElements) {
		if (seen.has(el)) continue;
		if ((el as HTMLElement).id?.startsWith("cg-")) continue;
		try {
			const bg = window.getComputedStyle(el).backgroundImage;
			if (bg && bg !== "none") {
				const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
				if (match?.[1] && isValidImageUrl(match[1])) {
					seen.add(el);
					results.push({ el: el as HTMLElement, type: "background", url: match[1] });
				}
			}
		} catch {}
	}

	// 3) Twitter-specific: <article> elements
	const articles = document.querySelectorAll("article");
	for (const article of articles) {
		const artImgs = article.querySelectorAll("img");
		for (const artImg of artImgs) {
			if (seen.has(artImg)) continue;
			if (imgHasRealSrc(artImg)) {
				seen.add(artImg);
				results.push({ el: artImg as HTMLElement, type: "img", url: "" });
			}
		}
		// tweetPhoto containers
		const tweetPhotos = article.querySelectorAll("[data-testid='tweetPhoto']");
		for (const tp of tweetPhotos) {
			if (seen.has(tp)) continue;
			const tpImg = tp.querySelector("img");
			if (tpImg && imgHasRealSrc(tpImg) && !seen.has(tpImg)) {
				seen.add(tpImg);
				results.push({ el: tpImg as HTMLElement, type: "img", url: "" });
			}
			try {
				const tpBg = window.getComputedStyle(tp).backgroundImage;
				if (tpBg && tpBg !== "none") {
					const tpM = tpBg.match(/url\(["']?([^"')]+)["']?\)/);
					if (tpM?.[1] && isValidImageUrl(tpM[1]) && !seen.has(tp)) {
						seen.add(tp);
						results.push({ el: tp as HTMLElement, type: "background", url: tpM[1] });
					}
				}
			} catch {}
		}
	}

	return results;
}

/**
 * Set up MutationObserver to detect dynamically added images
 * Returns a disconnect function
 */
export function watchForNewImages(
	callback: (newImages: DetectedImage[]) => void,
): () => void {
	const seen = new WeakSet<Element>();
	let throttleTimer: ReturnType<typeof setTimeout> | null = null;

	const observer = new MutationObserver((mutations) => {
		if (throttleTimer) return;

		throttleTimer = setTimeout(() => {
			throttleTimer = null;
			const newImages: DetectedImage[] = [];

			for (const mutation of mutations) {
				for (const node of Array.from(mutation.addedNodes)) {
					if (node.nodeType !== Node.ELEMENT_NODE) continue;
					const el = node as Element;

					// Check if the added node itself is an image
					if (el.tagName === "IMG" && !seen.has(el) && imgHasRealSrc(el as HTMLImageElement)) {
						seen.add(el);
						newImages.push({ el: el as HTMLElement, type: "img", url: "" });
					}

					// Check children
					const imgs = el.querySelectorAll?.("img");
					if (imgs) {
						for (const img of imgs) {
							if (!seen.has(img) && imgHasRealSrc(img)) {
								seen.add(img);
								newImages.push({ el: img as HTMLElement, type: "img", url: "" });
							}
						}
					}

					// Check background images
					if (el.tagName && ["DIV", "A", "FIGURE", "SECTION", "SPAN"].includes(el.tagName)) {
						if (!seen.has(el)) {
							try {
								const bg = window.getComputedStyle(el).backgroundImage;
								if (bg && bg !== "none") {
									const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
									if (match?.[1] && isValidImageUrl(match[1])) {
										seen.add(el);
										newImages.push({
											el: el as HTMLElement,
											type: "background",
											url: match[1],
										});
									}
								}
							} catch {}
						}
					}
				}
			}

			if (newImages.length > 0) {
				callback(newImages);
			}
		}, 200);
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});

	return () => {
		observer.disconnect();
		if (throttleTimer) clearTimeout(throttleTimer);
	};
}
