import type { APIRoute } from "astro";

/**
 * GET /api/proxy-image?url=<encodedUrl>
 * Proxies an image URL to bypass CORS restrictions.
 * Returns the image as a blob with the original content type.
 */
export const GET: APIRoute = async ({ request }) => {
	const url = new URL(request.url);
	const targetUrl = url.searchParams.get("url");

	if (!targetUrl) {
		return new Response(JSON.stringify({ error: "Missing 'url' query parameter" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Validate URL
	let parsed: URL;
	try {
		parsed = new URL(targetUrl);
	} catch {
		return new Response(JSON.stringify({ error: "Invalid URL" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Only allow http/https
	if (!["http:", "https:"].includes(parsed.protocol)) {
		return new Response(JSON.stringify({ error: "Only http/https URLs are allowed" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const res = await fetch(targetUrl, {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; ImageProxy/1.0)",
				Accept: "image/*",
			},
			// 10 second timeout
			signal: AbortSignal.timeout(10000),
		});

		if (!res.ok) {
			return new Response(JSON.stringify({ error: `Upstream returned ${res.status}` }), {
				status: 502,
				headers: { "Content-Type": "application/json" },
			});
		}

		const contentType = res.headers.get("Content-Type") || "application/octet-stream";

		// Validate it's an image
		if (!contentType.startsWith("image/")) {
			return new Response(
				JSON.stringify({ error: `URL does not point to an image (${contentType})` }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Limit size to 10MB
		const contentLength = res.headers.get("Content-Length");
		if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
			return new Response(JSON.stringify({ error: "Image too large (max 10MB)" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const body = await res.arrayBuffer();

		return new Response(body, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=86400",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (err: any) {
		const message = err.name === "TimeoutError" ? "Image fetch timed out" : err.message;
		return new Response(JSON.stringify({ error: message }), {
			status: 502,
			headers: { "Content-Type": "application/json" },
		});
	}
};
