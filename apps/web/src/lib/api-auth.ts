import { eq } from "drizzle-orm";
import { user } from "@repo/db/auth-schema";
import { auth } from "@/lib/auth";
import { getDbInstance } from "@/lib/db";

export interface AuthResult {
	user: { id: string; name: string; email: string; image?: string | null };
	authMethod: "session" | "apikey";
}

/**
 * Authenticate a request using either session cookie or API key.
 * Returns the authenticated user or null if unauthorized.
 */
export async function authenticateRequest(request: Request): Promise<AuthResult | null> {
	// 1. Try session by cookie
	const session = await auth.api.getSession({
		headers: request.headers,
	});
	if (session?.user) {
		return { user: session.user, authMethod: "session" };
	}

	// 2. Try API key via x-api-key header
	const apiKey = request.headers.get("x-api-key");
	if (apiKey) {
		const result = await auth.api.verifyApiKey({
			body: { key: apiKey },
		});
		if (result.valid && result.key) {
			// Look up user by referenceId (the owner of the API key)
			const db = getDbInstance();
			const dbUser = await db.select().from(user).where(eq(user.id, result.key.referenceId)).get();
			if (dbUser) {
				return {
					user: {
						id: dbUser.id,
						name: dbUser.name,
						email: dbUser.email,
						image: dbUser.image,
					},
					authMethod: "apikey" as const,
				};
			}
		}
	}

	return null;
}
