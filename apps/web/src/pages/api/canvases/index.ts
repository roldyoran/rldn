import { canvasDocuments, canvases, images } from "@repo/db/schema";
import type { APIRoute } from "astro";
import { desc, eq, count } from "drizzle-orm";
import { authenticateRequest } from "@/shared/lib/api-auth";
import { getDbInstance } from "@/shared/lib/db";

/** GET /api/canvases - List user canvases with enriched info */
export const GET: APIRoute = async ({ request }) => {
	const authResult = await authenticateRequest(request);
	if (!authResult) {
		return new Response("Unauthorized", { status: 401 });
	}
	const { user } = authResult;

	const db = getDbInstance();

	// Get canvases with element count and image count via subqueries
	const userCanvases = await db
		.select({
			id: canvases.id,
			name: canvases.name,
			description: canvases.description,
			thumbnail: canvases.thumbnail,
			createdAt: canvases.createdAt,
			updatedAt: canvases.updatedAt,
		})
		.from(canvases)
		.where(eq(canvases.userId, user.id))
		.orderBy(desc(canvases.updatedAt))
		.all();

	// Enrich each canvas with element count and image count
	const enriched = await Promise.all(
		userCanvases.map(async (canvas) => {
			// Get element count from storeData
			let elementCount = 0;
			const doc = await db
				.select()
				.from(canvasDocuments)
				.where(eq(canvasDocuments.canvasId, canvas.id))
				.get();
			if (doc?.storeData) {
				try {
					const parsed = JSON.parse(doc.storeData);
					elementCount = parsed.elements?.length ?? 0;
				} catch {
					// ignore parse errors
				}
			}

			// Get image count
			const imageCount = await db
				.select({ value: count() })
				.from(images)
				.where(eq(images.canvasId, canvas.id))
				.get();

			return {
				...canvas,
				elementCount,
				imageCount: imageCount?.value ?? 0,
			};
		}),
	);

	return new Response(JSON.stringify(enriched), {
		headers: { "Content-Type": "application/json" },
	});
};

/** POST /api/canvases - Create new canvas */
export const POST: APIRoute = async ({ request }) => {
	const authResult = await authenticateRequest(request);
	if (!authResult) {
		return new Response("Unauthorized", { status: 401 });
	}
	const { user } = authResult;

	const body = await request.json();
	const { name = "Sin título", description } = body;

	const { nanoid } = await import("nanoid");
	const canvasId = nanoid();
	const docId = nanoid();

	const db = getDbInstance();

	await db
		.insert(canvases)
		.values({
			id: canvasId,
			name,
			description: description ?? null,
			userId: user.id,
		})
		.run();

	await db
		.insert(canvasDocuments)
		.values({
			id: docId,
			canvasId,
			storeData: JSON.stringify({ elements: [], appState: {}, files: {} }),
		})
		.run();

	const canvas = await db.select().from(canvases).where(eq(canvases.id, canvasId)).get();

	return new Response(JSON.stringify(canvas), {
		status: 201,
		headers: { "Content-Type": "application/json" },
	});
};
