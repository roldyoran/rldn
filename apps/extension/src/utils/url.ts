/**
 * Canvas Grab — URL utilities
 * Clean and normalize image URLs (Twitter/X, Pinterest, etc.)
 */

/**
 * Remove name= and format= params from Twitter CDN URLs
 * to get the highest resolution version
 */
export function cleanTwitterUrl(url: string): string {
	let cleaned = url.replace(/[?&]name=\w+/g, "");
	cleaned = cleaned.replace(/[?&]format=\w+/g, "");
	// Clean leftover ? or & at start of params
	cleaned = cleaned.replace(/\?&/, "?").replace(/\?$/, "");
	return cleaned;
}

/**
 * Check if a URL is a valid image URL (not data: or blob:)
 */
export function isValidImageUrl(url: string): boolean {
	if (!url) return false;
	if (url.startsWith("data:")) return false;
	if (url.startsWith("blob:")) return false;
	// Skip Twitter theme images
	if (url.includes("abs-0.twimg.com/images/themes/")) return false;
	return true;
}

/**
 * Extract a filename from a URL and alt text fallback
 */
export function extractFileName(url: string, alt: string): string {
	try {
		const pathname = new URL(url).pathname;
		const segments = pathname.split("/");
		const last = segments[segments.length - 1];
		if (last && last.includes(".")) {
			return decodeURIComponent(last);
		}
	} catch {}
	return alt || "imagen";
}

/**
 * Get the best quality image URL from srcset
 * Parses w descriptors and returns the highest resolution
 */
export function getBestFromSrcset(srcset: string): string | null {
	if (!srcset) return null;

	const entries = srcset.split(",");
	let best: string | null = null;
	let bestValue = 0;

	for (const entry of entries) {
		const parts = entry.trim().split(/\s+/);
		if (parts.length < 2) continue;

		const entryUrl = parts[0];
		const descriptor = parts[1];

		let value = 0;
		if (descriptor.endsWith("w")) {
			value = Number.parseInt(descriptor, 10);
		} else if (descriptor.endsWith("x")) {
			value = Number.parseFloat(descriptor) * 1000;
		}

		if (value > bestValue) {
			bestValue = value;
			best = entryUrl;
		}
	}

	return best;
}
