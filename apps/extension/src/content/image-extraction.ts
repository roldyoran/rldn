/**
 * Canvas Grab — Image Extraction
 * Extract the best quality image URL from DOM elements
 */

import type { ImageData } from "../utils/messages";
import {
	isValidImageUrl,
	getBestFromSrcset,
	cleanTwitterUrl,
	extractFileName,
} from "../utils/url";
import type { DetectedImage } from "./image-detection";

/**
 * Extract image data from a detected image element
 */
export function extractImageData(detected: DetectedImage): ImageData | null {
	const { el } = detected;

	if (el.tagName === "IMG") {
		return extractFromImg(el as HTMLImageElement);
	}

	// Background image element
	try {
		const bg = window.getComputedStyle(el).backgroundImage;
		if (bg && bg !== "none") {
			const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
			if (m?.[1]) {
				return {
					url: m[1],
					name: extractFileName(m[1], ""),
					width: null,
					height: null,
				};
			}
		}
	} catch {}

	return null;
}

/**
 * Extract best image URL from an <img> element
 * Checks srcset, parent <a>, lazy-load attrs, and Twitter CDN
 */
function extractFromImg(img: HTMLImageElement): ImageData {
	const url = getBestImageUrl(img);
	return {
		url,
		name: extractFileName(url, img.alt || ""),
		width: img.naturalWidth || null,
		height: img.naturalHeight || null,
	};
}

/**
 * Get the best quality URL from an <img> element
 */
function getBestImageUrl(img: HTMLImageElement): string {
	// 1. Try srcset for highest resolution
	const srcsetUrl = getBestFromSrcset(img.srcset);
	if (srcsetUrl) {
		const resolved = resolveUrl(srcsetUrl, img);
		return isTwitterUrl(resolved) ? cleanTwitterUrl(resolved) : resolved;
	}

	// 2. Check data-src / data-original (lazy-loaders)
	let url = img.src || img.currentSrc || "";
	if (!url || !isValidImageUrl(url)) {
		url = img.getAttribute("data-src") || img.getAttribute("data-original") || url;
	}

	// 3. Check parent <a> for a full-size link
	const anchor = img.closest("a");
	if (anchor?.href) {
		const href = anchor.href;
		if (
			/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(href) ||
			href.includes("pbs.twimg.com") ||
			href.includes("pinimg.com")
		) {
			return href;
		}
	}

	// 4. Clean Twitter URLs
	if (isTwitterUrl(url)) {
		return cleanTwitterUrl(url);
	}

	return url;
}

/**
 * Check if a URL is from Twitter/X CDN
 */
function isTwitterUrl(url: string): boolean {
	return url.includes("pbs.twimg.com");
}

/**
 * Resolve a relative URL against an element's document
 */
function resolveUrl(url: string, el: Element): string {
	try {
		return new URL(url, el.ownerDocument?.location?.href || window.location.href).href;
	} catch {
		return url;
	}
}
