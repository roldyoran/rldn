/**
 * Canvas Grab — Twitter/X specific detection
 * Handles Twitter-specific selectors and image containers
 */

import { imgHasRealSrc } from "./image-detection";
import { isValidImageUrl } from "../utils/url";
import type { DetectedImage } from "./image-detection";

const TWITTER_SELECTORS = {
	article: "article",
	tweetPhoto: "[data-testid='tweetPhoto']",
	roleImg: "div[role='img']",
	tweetImage: "[data-testid='tweetPhoto'] img",
} as const;

/**
 * Detect Twitter-specific image containers in articles
 */
export function detectTwitterImages(): DetectedImage[] {
	const results: DetectedImage[] = [];
	const seen = new WeakSet<Element>();

	// Only run on Twitter/X
	if (!isTwitterPage()) return results;

	const articles = document.querySelectorAll(TWITTER_SELECTORS.article);
	for (const article of articles) {
		// tweetPhoto containers (background images)
		const tweetPhotos = article.querySelectorAll(TWITTER_SELECTORS.tweetPhoto);
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
					const m = tpBg.match(/url\(["']?([^"')]+)["']?\)/);
					if (m?.[1] && isValidImageUrl(m[1]) && !seen.has(tp)) {
						seen.add(tp);
						results.push({ el: tp as HTMLElement, type: "background", url: m[1] });
					}
				}
			} catch {}
		}

		// div[role="img"] containers
		const roleImgs = article.querySelectorAll(TWITTER_SELECTORS.roleImg);
		for (const ri of roleImgs) {
			if (seen.has(ri)) continue;
			try {
				const riBg = window.getComputedStyle(ri).backgroundImage;
				if (riBg && riBg !== "none") {
					const m = riBg.match(/url\(["']?([^"')]+)["']?\)/);
					if (m?.[1] && isValidImageUrl(m[1])) {
						seen.add(ri);
						results.push({ el: ri as HTMLElement, type: "background", url: m[1] });
					}
				}
			} catch {}
		}
	}

	return results;
}

/**
 * Check if the current page is Twitter/X
 */
export function isTwitterPage(): boolean {
	return (
		window.location.hostname === "twitter.com" ||
		window.location.hostname === "x.com" ||
		window.location.hostname === "mobile.twitter.com" ||
		window.location.hostname === "mobile.x.com"
	);
}
