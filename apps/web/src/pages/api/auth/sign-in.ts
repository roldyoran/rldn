import type { APIRoute } from "astro";
import { getAuth } from "@/lib/auth";

/** POST /api/auth/sign-in - Sign in with email/password (sets session cookie) */
export const POST: APIRoute = async ({ request }) => {
	try {
		const auth = getAuth();
		const body = await request.json();
		const { email, password } = body;

		console.log("[auth] sign-in attempt:", { email });

		// Use handler so Better Auth sets the session cookie in Set-Cookie header
		const handlerResponse = await auth.handler(
			new Request("http://localhost/sign-in/email", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...Object.fromEntries(request.headers),
				},
				body: JSON.stringify({ email, password, callbackURL: "/dashboard" }),
			}),
		);

		console.log("[auth] sign-in result:", { status: handlerResponse.status });

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
		console.error("[auth] sign-in error:", error.message);
		return new Response(
			JSON.stringify({ error: { message: error.message || "Error al iniciar sesión" } }),
			{ status: 400, headers: { "Content-Type": "application/json" } },
		);
	}
};
