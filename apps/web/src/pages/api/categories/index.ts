import { categories } from "@repo/db/schema";
import type { APIRoute } from "astro";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authenticateRequest } from "@/shared/lib/api-auth";
import { getDbInstance } from "@/shared/lib/db";

/** GET /api/categories - List user categories */
export const GET: APIRoute = async ({ request }) => {
	const authResult = await authenticateRequest(request);
	if (!authResult) {
		return new Response("Unauthorized", { status: 401 });
	}
	const { user } = authResult;

	const db = getDbInstance();
	const userCategories = await db
		.select()
		.from(categories)
		.where(eq(categories.userId, user.id))
		.orderBy(desc(categories.createdAt))
		.all();

	return new Response(JSON.stringify(userCategories), {
		headers: { "Content-Type": "application/json" },
	});
};

/** POST /api/categories - Create new category */
export const POST: APIRoute = async ({ request }) => {
	const authResult = await authenticateRequest(request);
	if (!authResult) {
		return new Response("Unauthorized", { status: 401 });
	}
	const { user } = authResult;

	const body = await request.json();
	const { name, color = "#6b7280" } = body;

	if (!name || typeof name !== "string" || name.trim().length === 0) {
		return new Response(JSON.stringify({ error: "El nombre es obligatorio" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const db = getDbInstance();
	const id = nanoid();

	await db
		.insert(categories)
		.values({
			id,
			name: name.trim(),
			color,
			userId: user.id,
		})
		.run();

	const category = await db.select().from(categories).where(eq(categories.id, id)).get();

	return new Response(JSON.stringify(category), {
		status: 201,
		headers: { "Content-Type": "application/json" },
	});
};
