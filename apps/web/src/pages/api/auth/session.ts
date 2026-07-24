import type { APIRoute } from "astro";
import { getAuth } from "@/lib/auth";

/** GET /api/auth/session - Get current session */
export const GET: APIRoute = async ({ request }) => {
	try {
		const auth = getAuth();

		// Log the cookie header for debugging
		const cookieHeader = request.headers.get("cookie");
		console.log("[auth] session check, cookies:", cookieHeader ? "present" : "MISSING");

		const session = await auth.api.getSession({
			headers: request.headers,
		});

		console.log("[auth] session result:", session ? `user=${session.user.email}` : "null");

		return new Response(JSON.stringify(session ?? null), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("[auth] session error:", error);
		return new Response(JSON.stringify(null), {
			headers: { "Content-Type": "application/json" },
		});
	}
};
