import { canvasDocuments, canvases, images } from "@repo/db/schema";
import type { APIRoute } from "astro";
import { desc, eq, count, and, sql } from "drizzle-orm";
import { authenticateRequest } from "@/shared/lib/api-auth";
import { getDbInstance } from "@/shared/lib/db";

/** GET /api/canvases - List user canvases with enriched info */
export const GET: APIRoute = async ({ request }) => {
	const authResult = await authenticateRequest(request);
	if (!authResult) {
		return new Response("Unauthorized", { status: 401 });
	}
	const { user } = authResult;

	const url = new URL(request.url);
	const categoryId = url.searchParams.get("categoryId");

	const db = getDbInstance();

	// Build where conditions
	const conditions = [eq(canvases.userId, user.id)];
	if (categoryId) {
		conditions.push(eq(canvases.categoryId, categoryId));
	}

	// Get canvases with element count and image count via subqueries
	const userCanvases = await db
		.select({
			id: canvases.id,
			name: canvases.name,
			description: canvases.description,
			categoryId: canvases.categoryId,
			thumbnail: canvases.thumbnail,
			createdAt: canvases.createdAt,
			updatedAt: canvases.updatedAt,
		})
		.from(canvases)
		.where(and(...conditions))
		.orderBy(desc(canvases.updatedAt))
		.all();

	// Enrich each canvas with image count
	const enriched = await Promise.all(
		userCanvases.map(async (canvas) => {
			// Get image count
			const imageCount = await db
				.select({ value: count() })
				.from(images)
				.where(eq(images.canvasId, canvas.id))
				.get();

			return {
				...canvas,
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
	const { name = "Sin título", description, categoryId } = body;

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
			categoryId: categoryId ?? null,
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
