import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as authSchema from "@repo/db/auth-schema";
import * as schema from "@repo/db/schema";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";

/**
 * Create a Better Auth instance with a given database
 */
export function createAuth(db: ReturnType<typeof import("@repo/db").getDb>) {
	return betterAuth({
		baseURL: process.env.BETTER_AUTH_URL || "http://localhost:4321",
		database: drizzleAdapter(db, {
			provider: "sqlite",
			schema: {
				...schema,
				...authSchema,
			},
		}),
		emailAndPassword: {
			enabled: true,
		},
		session: {
			expiresIn: 60 * 60 * 24 * 7, // 7 days
			updateAge: 60 * 60 * 24, // 1 day
		},
	} satisfies BetterAuthOptions);
}

/**
 * Type helpers for better-auth
 */
export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
export type User = Session["user"];
