import { canvasDocuments, canvases } from "@repo/db/schema";
import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDbInstance } from "@/lib/db";

async function getUser(request: Request) {
	const session = await auth.api.getSession({
		headers: request.headers,
	});
	return session?.user ?? null;
}

/** GET /api/canvases/:id - Get canvas with document */
export const GET: APIRoute = async ({ request, params }) => {
	const user = await getUser(request);
	if (!user) {
		return new Response("Unauthorized", { status: 401 });
	}

	const canvasId = params.id;
	if (!canvasId) {
		return new Response("Bad Request", { status: 400 });
	}

	const db = getDbInstance();
	const canvas = await db
		.select()
		.from(canvases)
		.where(and(eq(canvases.id, canvasId), eq(canvases.userId, user.id)))
		.get();

	if (!canvas) {
		return new Response("Not Found", { status: 404 });
	}

	const document = await db
		.select()
		.from(canvasDocuments)
		.where(eq(canvasDocuments.canvasId, canvasId))
		.get();

	return new Response(JSON.stringify({ ...canvas, document: document ?? null }), {
		headers: { "Content-Type": "application/json" },
	});
};

/** PUT /api/canvases/:id - Update canvas */
export const PUT: APIRoute = async ({ request, params }) => {
	const user = await getUser(request);
	if (!user) {
		return new Response("Unauthorized", { status: 401 });
	}

	const canvasId = params.id;
	if (!canvasId) {
		return new Response("Bad Request", { status: 400 });
	}

	const db = getDbInstance();
	const canvas = await db
		.select()
		.from(canvases)
		.where(and(eq(canvases.id, canvasId), eq(canvases.userId, user.id)))
		.get();

	if (!canvas) {
		return new Response("Not Found", { status: 404 });
	}

	const body = await request.json();
	const { name, description, storeData } = body;

	if (name !== undefined) {
		await db
			.update(canvases)
			.set({ name, updatedAt: new Date() })
			.where(eq(canvases.id, canvasId))
			.run();
	}

	if (description !== undefined) {
		await db
			.update(canvases)
			.set({ description, updatedAt: new Date() })
			.where(eq(canvases.id, canvasId))
			.run();
	}

	if (storeData !== undefined) {
		const doc = await db
			.select()
			.from(canvasDocuments)
			.where(eq(canvasDocuments.canvasId, canvasId))
			.get();

		if (doc) {
			await db
				.update(canvasDocuments)
				.set({
					storeData: typeof storeData === "string" ? storeData : JSON.stringify(storeData),
					version: doc.version + 1,
					updatedAt: new Date(),
				})
				.where(eq(canvasDocuments.canvasId, canvasId))
				.run();
		}
	}

	const updated = await db.select().from(canvases).where(eq(canvases.id, canvasId)).get();

	return new Response(JSON.stringify(updated), {
		headers: { "Content-Type": "application/json" },
	});
};

/** DELETE /api/canvases/:id - Delete canvas */
export const DELETE: APIRoute = async ({ request, params }) => {
	const user = await getUser(request);
	if (!user) {
		return new Response("Unauthorized", { status: 401 });
	}

	const canvasId = params.id;
	if (!canvasId) {
		return new Response("Bad Request", { status: 400 });
	}

	const db = getDbInstance();
	const canvas = await db
		.select()
		.from(canvases)
		.where(and(eq(canvases.id, canvasId), eq(canvases.userId, user.id)))
		.get();

	if (!canvas) {
		return new Response("Not Found", { status: 404 });
	}

	// Cascade delete: documents and images
	await db.delete(canvasDocuments).where(eq(canvasDocuments.canvasId, canvasId)).run();
	await db.delete(canvases).where(eq(canvases.id, canvasId)).run();

	return new Response(null, { status: 204 });
};
