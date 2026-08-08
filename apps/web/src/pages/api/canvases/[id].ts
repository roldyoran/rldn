import { canvasDocuments, canvases } from "@repo/db/schema";
import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { authenticateRequest } from "@/shared/lib/api-auth";
import { getDbInstance } from "@/shared/lib/db";

/** GET /api/canvases/:id - Get canvas with document */
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
	const startTime = Date.now();
	try {
		const authResult = await authenticateRequest(request);
		if (!authResult) {
			console.log(`[PUT /api/canvases/${params.id}] 401 Unauthorized`);
			return new Response("Unauthorized", { status: 401 });
		}
		const { user } = authResult;

		const canvasId = params.id;
		if (!canvasId) {
			console.log(`[PUT /api/canvases/${params.id}] 400 Bad Request - no canvasId`);
			return new Response("Bad Request", { status: 400 });
		}

		const db = getDbInstance();
		const canvas = await db
			.select()
			.from(canvases)
			.where(and(eq(canvases.id, canvasId), eq(canvases.userId, user.id)))
			.get();

		if (!canvas) {
			console.log(`[PUT /api/canvases/${canvasId}] 404 Canvas not found for user ${user.id}`);
			return new Response("Not Found", { status: 404 });
		}

		const body = await request.json();
		const { name, description, storeData, categoryId } = body;

		console.log(`[PUT /api/canvases/${canvasId}] Received:`, {
			hasName: name !== undefined,
			hasDescription: description !== undefined,
			hasStoreData: storeData !== undefined,
			storeDataType: typeof storeData,
			storeDataLength: typeof storeData === "string" ? storeData.length : "N/A",
		});

		if (name !== undefined) {
			await db
				.update(canvases)
				.set({ name, updatedAt: new Date() })
				.where(eq(canvases.id, canvasId))
				.run();
			console.log(`[PUT /api/canvases/${canvasId}] Updated name to:`, name);
		}

		if (description !== undefined) {
			await db
				.update(canvases)
				.set({ description, updatedAt: new Date() })
				.where(eq(canvases.id, canvasId))
				.run();
			console.log(`[PUT /api/canvases/${canvasId}] Updated description`);
		}

		if (categoryId !== undefined) {
			await db
				.update(canvases)
				.set({ categoryId: categoryId ?? null, updatedAt: new Date() })
				.where(eq(canvases.id, canvasId))
				.run();
			console.log(`[PUT /api/canvases/${canvasId}] Updated categoryId`);
		}

		if (storeData !== undefined) {
			const doc = await db
				.select()
				.from(canvasDocuments)
				.where(eq(canvasDocuments.canvasId, canvasId))
				.get();

			const serializedStoreData =
				typeof storeData === "string" ? storeData : JSON.stringify(storeData);

			console.log(`[PUT /api/canvases/${canvasId}] storeData doc exists:`, !!doc, {
				docVersion: doc?.version,
				newDataLength: serializedStoreData.length,
			});

			if (doc) {
				await db
					.update(canvasDocuments)
					.set({
						storeData: serializedStoreData,
						version: doc.version + 1,
						updatedAt: new Date(),
					})
					.where(eq(canvasDocuments.canvasId, canvasId))
					.run();
				console.log(
					`[PUT /api/canvases/${canvasId}] Updated storeData, version: ${doc.version} -> ${doc.version + 1}`,
				);
			} else {
				// Insert a new document row if none exists
				const newDocId = crypto.randomUUID();
				await db
					.insert(canvasDocuments)
					.values({
						id: newDocId,
						canvasId: canvasId,
						storeData: serializedStoreData,
						version: 1,
					})
					.run();
				console.log(`[PUT /api/canvases/${canvasId}] INSERTED new document row, id: ${newDocId}`);
			}

			// Verify the save
			const verifyDoc = await db
				.select()
				.from(canvasDocuments)
				.where(eq(canvasDocuments.canvasId, canvasId))
				.get();
			console.log(`[PUT /api/canvases/${canvasId}] Verification:`, {
				exists: !!verifyDoc,
				version: verifyDoc?.version,
				dataLength: verifyDoc?.storeData?.length,
			});
		}

		const updated = await db.select().from(canvases).where(eq(canvases.id, canvasId)).get();

		const elapsed = Date.now() - startTime;
		console.log(`[PUT /api/canvases/${canvasId}] 200 OK (${elapsed}ms)`);

		return new Response(JSON.stringify(updated), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		const elapsed = Date.now() - startTime;
		console.error(`[PUT /api/canvases/${params.id}] 500 Error (${elapsed}ms):`, err);
		const message = err instanceof Error ? err.message : "Internal Server Error";
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};

/** DELETE /api/canvases/:id - Delete canvas */
export const DELETE: APIRoute = async ({ request, params }) => {
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
