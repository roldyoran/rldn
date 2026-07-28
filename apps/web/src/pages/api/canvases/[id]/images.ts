import { canvases, canvasDocuments, images } from "@repo/db/schema";
import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authenticateRequest } from "@/lib/api-auth";
import { getDbInstance } from "@/lib/db";

/** GET /api/canvases/:id/images - List images for a canvas */
export const GET: APIRoute = async ({ request, params }) => {
	const authResult = await authenticateRequest(request);
	if (!authResult) {
		return new Response("Unauthorized", { status: 401 });
	}
	const { user } = authResult;

	const canvasId = params.id;
	if (!canvasId) {
		return new Response("Bad Request", { status: 400 });
	}

	const db = getDbInstance();

	// Verify canvas ownership
	const canvas = await db
		.select()
		.from(canvases)
		.where(and(eq(canvases.id, canvasId), eq(canvases.userId, user.id)))
		.get();

	if (!canvas) {
		return new Response("Not Found", { status: 404 });
	}

	// Get all images for this canvas
	const canvasImages = await db.select().from(images).where(eq(images.canvasId, canvasId)).all();

	return new Response(JSON.stringify(canvasImages), {
		headers: { "Content-Type": "application/json" },
	});
};

/** POST /api/canvases/:id/images - Save an image URL to a canvas AND inject into Excalidraw storeData */
export const POST: APIRoute = async ({ request, params }) => {
	const authResult = await authenticateRequest(request);
	if (!authResult) {
		return new Response("Unauthorized", { status: 401 });
	}
	const { user } = authResult;

	const canvasId = params.id;
	if (!canvasId) {
		return new Response("Bad Request", { status: 400 });
	}

	const db = getDbInstance();

	// Verify canvas ownership
	const canvas = await db
		.select()
		.from(canvases)
		.where(and(eq(canvases.id, canvasId), eq(canvases.userId, user.id)))
		.get();

	if (!canvas) {
		return new Response("Not Found", { status: 404 });
	}

	// Parse request body
	const body = await request.json();
	const { url, name, width, height, positionX, positionY } = body;

	if (!url || typeof url !== "string") {
		return new Response(JSON.stringify({ error: "url is required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Insert image record in the images table
	const imageId = nanoid();
	await db
		.insert(images)
		.values({
			id: imageId,
			canvasId,
			url,
			name: name ?? null,
			width: width ?? null,
			height: height ?? null,
			positionX: positionX ?? 0,
			positionY: positionY ?? 0,
		})
		.run();

	// ── Fetch image and inject into Excalidraw storeData ──
	try {
		// Fetch image as base64 via proxy or directly
		const baseUrl = new URL(request.url).origin;
		const dataURL = await fetchImageAsDataURL(url, baseUrl);

		if (dataURL) {
			// Get current storeData
			const doc = await db
				.select()
				.from(canvasDocuments)
				.where(eq(canvasDocuments.canvasId, canvasId))
				.get();

			if (doc) {
				const store = JSON.parse(doc.storeData);
				const fileId = nanoid();
				const elementId = nanoid();

				// Determine image dimensions from data if not provided
				let imgWidth = width ?? 300;
				let imgHeight = height ?? 200;

				// Calculate position: place next to the rightmost existing element
				const GAP = 20;
				const elements = store.elements || [];
				const posX = positionX ?? calculateNextX(elements, imgWidth, GAP);
				const posY = positionY ?? calculateNextY(elements, imgHeight, GAP);

				// Create Excalidraw file entry
				const fileEntry = {
					mimeType: guessMimeType(dataURL),
					id: fileId,
					name: name || "image",
					dataURL: dataURL,
					size: Math.round((dataURL.length * 3) / 4),
					createdAt: Date.now(),
				};

				// Create Excalidraw image element
				const imageElement = {
					type: "image",
					version: 1,
					versionNonce: Math.floor(Math.random() * 2000000000),
					isDeleted: false,
					id: elementId,
					fillStyle: "solid",
					strokeWidth: 2,
					strokeStyle: "solid",
					roughness: 1,
					opacity: 100,
					angle: 0,
					x: posX,
					y: posY,
					strokeColor: "#1e1e1e",
					backgroundColor: "transparent",
					width: imgWidth,
					height: imgHeight,
					seed: Math.floor(Math.random() * 2000000000),
					groupIds: [],
					frameId: null,
					roundness: null,
					boundElements: [],
					updated: Date.now(),
					link: null,
					locked: false,
					fileId: fileId,
					scale: [1, 1],
				};

				// Ensure files object exists
				if (!store.files) store.files = {};

				// Add file and element
				store.files[fileId] = fileEntry;
				store.elements = [...(store.elements || []), imageElement];

				// Update storeData in DB
				await db
					.update(canvasDocuments)
					.set({
						storeData: JSON.stringify(store),
						version: doc.version + 1,
						updatedAt: new Date(),
					})
					.where(eq(canvasDocuments.canvasId, canvasId))
					.run();

				console.log(
					`[POST /api/canvases/${canvasId}/images] Injected image into Excalidraw: fileId=${fileId}, elementId=${elementId}`,
				);
			}
		}
	} catch (err) {
		// Image record was saved, but Excalidraw injection failed — log but don't fail the request
		console.error(`[POST /api/canvases/${canvasId}/images] Failed to inject into Excalidraw:`, err);
	}

	const image = await db.select().from(images).where(eq(images.id, imageId)).get();

	return new Response(JSON.stringify(image), {
		status: 201,
		headers: { "Content-Type": "application/json" },
	});
};

// ── Helpers ───────────────────────────────────────────

async function fetchImageAsDataURL(url: string, baseUrl: string): Promise<string | null> {
	try {
		// Try fetching via proxy to bypass CORS
		const proxyUrl = `${baseUrl}/api/proxy-image?url=${encodeURIComponent(url)}`;
		const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });

		if (!res.ok) return null;

		const contentType = res.headers.get("Content-Type") || "image/png";
		const buffer = await res.arrayBuffer();
		const base64 = bufferToBase64(buffer);
		return `data:${contentType};base64,${base64}`;
	} catch {
		// Fallback: try direct fetch
		try {
			const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
			if (!res.ok) return null;
			const contentType = res.headers.get("Content-Type") || "image/png";
			const buffer = await res.arrayBuffer();
			const base64 = bufferToBase64(buffer);
			return `data:${contentType};base64,${base64}`;
		} catch {
			return null;
		}
	}
}

function bufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function guessMimeType(dataURL: string): string {
	const match = dataURL.match(/^data:([^;]+);/);
	return match ? match[1] : "image/png";
}

/**
 * Calculate X position: place to the right of the rightmost existing element.
 * If no elements or would go past 2000px, start a new row at x=100.
 */
function calculateNextX(elements: any[], newWidth: number, gap: number): number {
	const visible = elements.filter((e: any) => !e.isDeleted && e.x !== undefined);
	if (visible.length === 0) return 100;

	// Find the rightmost edge of all elements
	let maxRight = 0;
	for (const el of visible) {
		const elWidth = el.width ?? 0;
		const right = (el.x ?? 0) + elWidth;
		if (right > maxRight) maxRight = right;
	}

	const nextX = maxRight + gap;

	// If it would go past 2000px, wrap to a new row
	if (nextX > 2000) return 100;

	return nextX;
}

/**
 * Calculate Y position: align with the last row of elements.
 * If wrapping (x=100), place below the tallest element in the current row.
 */
function calculateNextY(elements: any[], newHeight: number, gap: number): number {
	const visible = elements.filter((e: any) => !e.isDeleted && e.x !== undefined);
	if (visible.length === 0) return 100;

	// Find the rightmost element to determine which "row" we're on
	let maxRight = 0;
	let rightmostEl: any = null;
	for (const el of visible) {
		const right = (el.x ?? 0) + (el.width ?? 0);
		if (right > maxRight) {
			maxRight = right;
			rightmostEl = el;
		}
	}

	// If wrapping (next x would be 100), find the max bottom of elements near x=100
	if (maxRight + gap > 2000) {
		// Find elements in the first "column" area to stack below them
		const leftElements = visible.filter((e: any) => (e.x ?? 0) < 500);
		let maxBottom = 0;
		for (const el of leftElements) {
			const bottom = (el.y ?? 0) + (el.height ?? 0);
			if (bottom > maxBottom) maxBottom = bottom;
		}
		return maxBottom + gap;
	}

	// Align Y with the rightmost element
	return rightmostEl?.y ?? 100;
}
