import { auth } from "@/lib/auth";
import type { APIRoute } from "astro";

/**
 * Catch-all route for Better Auth.
 * Handles /api/auth/sign-up, /api/auth/sign-in, /api/auth/sign-out,
 * /api/auth/session, and all other auth endpoints.
 */
export const ALL: APIRoute = async (ctx) => {
	return auth.handler(ctx.request);
};
