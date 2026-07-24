import type { APIRoute } from "astro";
import { getAuth } from "@/lib/auth";

/** POST /api/auth/sign-out - Sign out (clears session cookie) */
export const POST: APIRoute = async ({ request }) => {
	try {
		const auth = getAuth();

		console.log("[auth] sign-out attempt");

		const handlerResponse = await auth.handler(
			new Request("http://localhost/sign-out", {
				method: "POST",
				headers: Object.fromEntries(request.headers),
			}),
		);

		console.log("[auth] sign-out result:", { status: handlerResponse.status });

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
	} catch (error) {
		console.error("[auth] sign-out error:", error);
		return new Response(null, { status: 200 });
	}
};
