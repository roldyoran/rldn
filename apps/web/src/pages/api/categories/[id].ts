import { categories } from "@repo/db/schema";
import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { authenticateRequest } from "@/shared/lib/api-auth";
import { getDbInstance } from "@/shared/lib/db";

/** PUT /api/categories/:id - Update category */
export const PUT: APIRoute = async ({ request, params }) => {
	const authResult = await authenticateRequest(request);
	if (!authResult) {
		return new Response("Unauthorized", { status: 401 });
	}
	const { user } = authResult;

	const categoryId = params.id;
	if (!categoryId) {
		return new Response("Bad Request", { status: 400 });
	}

	const db = getDbInstance();
	const category = await db
		.select()
		.from(categories)
		.where(and(eq(categories.id, categoryId), eq(categories.userId, user.id)))
		.get();

	if (!category) {
		return new Response("Not Found", { status: 404 });
	}

	const body = await request.json();
	const { name, color } = body;

	if (name !== undefined) {
		await db
			.update(categories)
			.set({ name: name.trim(), updatedAt: new Date() })
			.where(eq(categories.id, categoryId))
			.run();
	}

	if (color !== undefined) {
		await db
			.update(categories)
			.set({ color, updatedAt: new Date() })
			.where(eq(categories.id, categoryId))
			.run();
	}

	const updated = await db.select().from(categories).where(eq(categories.id, categoryId)).get();

	return new Response(JSON.stringify(updated), {
		headers: { "Content-Type": "application/json" },
	});
};

/** DELETE /api/categories/:id - Delete category (canvases keep their categoryId set to null) */
export const DELETE: APIRoute = async ({ request, params }) => {
	const authResult = await authenticateRequest(request);
	if (!authResult) {
		return new Response("Unauthorized", { status: 401 });
	}
	const { user } = authResult;

	const categoryId = params.id;
	if (!categoryId) {
		return new Response("Bad Request", { status: 400 });
	}

	const db = getDbInstance();
	const category = await db
		.select()
		.from(categories)
		.where(and(eq(categories.id, categoryId), eq(categories.userId, user.id)))
		.get();

	if (!category) {
		return new Response("Not Found", { status: 404 });
	}

	await db.delete(categories).where(eq(categories.id, categoryId)).run();

	return new Response(null, { status: 204 });
};
