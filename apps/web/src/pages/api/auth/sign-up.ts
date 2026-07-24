import type { APIRoute } from "astro";
import { getAuth } from "@/lib/auth";

/** POST /api/auth/sign-up - Register new user (sets session cookie) */
export const POST: APIRoute = async ({ request }) => {
	try {
		const auth = getAuth();
		const body = await request.json();
		const { name, email, password } = body;

		console.log("[auth] sign-up attempt:", { email });

		// Use handler so Better Auth sets the session cookie in Set-Cookie header
		const handlerResponse = await auth.handler(
			new Request("http://localhost/sign-up/email", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...Object.fromEntries(request.headers),
				},
				body: JSON.stringify({ name, email, password }),
			}),
		);

		console.log("[auth] sign-up result:", { status: handlerResponse.status });

		// Forward Set-Cookie headers from Better Auth to the browser
		const setCookies = handlerResponse.headers.getSetCookie?.() ?? [];
		const headers = new Headers();
		for (const cookie of setCookies) {
			headers.append("Set-Cookie", cookie);
		}
		headers.set("Content-Type", "application/json");

		return new Response(handlerResponse.body, {
			status: handlerResponse.status,
			headers,
		});
	} catch (error: any) {
		console.error("[auth] sign-up error:", error.message);
		return new Response(
			JSON.stringify({ error: { message: error.message || "Error al registrar" } }),
			{ status: 400, headers: { "Content-Type": "application/json" } },
		);
	}
};
