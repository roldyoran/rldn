import { canvasDocuments, canvases } from "@repo/db/schema";
import type { APIRoute } from "astro";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDbInstance } from "@/lib/db";

async function getUser(request: Request) {
	const session = await auth.api.getSession({
		headers: request.headers,
	});
	return session?.user ?? null;
}

/** GET /api/canvases - List user canvases */
export const GET: APIRoute = async ({ request }) => {
	const user = await getUser(request);
	if (!user) {
		return new Response("Unauthorized", { status: 401 });
	}

	const db = getDbInstance();
	const userCanvases = await db
		.select()
		.from(canvases)
		.where(eq(canvases.userId, user.id))
		.orderBy(desc(canvases.updatedAt))
		.all();

	return new Response(JSON.stringify(userCanvases), {
		headers: { "Content-Type": "application/json" },
	});
};

/** POST /api/canvases - Create new canvas */
export const POST: APIRoute = async ({ request }) => {
	const user = await getUser(request);
	if (!user) {
		return new Response("Unauthorized", { status: 401 });
	}

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
