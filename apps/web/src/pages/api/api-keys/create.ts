import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";

export const POST: APIRoute = async ({ request }) => {
	try {
		const session = await auth.api.getSession({
			headers: request.headers,
		});

		if (!session?.user) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		const body = await request.json();

		const result = await auth.api.createApiKey({
			body: {
				userId: session.user.id,
				name: body.name,
				expiresIn: body.expiresIn,
				prefix: body.prefix,
				metadata: body.metadata,
				permissions: body.permissions,
				rateLimitEnabled: body.rateLimitEnabled,
				rateLimitMax: body.rateLimitMax,
				rateLimitTimeWindow: body.rateLimitTimeWindow,
				remaining: body.remaining,
				refillAmount: body.refillAmount,
				refillInterval: body.refillInterval,
			},
		});

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message || "Failed to create API key" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
