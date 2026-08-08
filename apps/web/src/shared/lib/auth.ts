import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { apiKey } from "@better-auth/api-key";
import { getDbInstance } from "@/shared/lib/db";

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL || "http://localhost:4321",
	database: drizzleAdapter(getDbInstance(), {
		provider: "sqlite",
	}),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		maxPasswordLength: 128,
		revokeSessionsOnPasswordReset: true,
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60, // 5 min cache
		},
	},
	rateLimit: {
		enabled: true,
		window: 10, // 10 seconds
		max: 500, // 500 requests per window
	},
	plugins: [
		apiKey({
			defaultPrefix: "rldn_",
			enableSessionForAPIKeys: true,
			enableMetadata: true,
			permissions: {
				defaultPermissions: {
					canvas: ["read", "write"],
					images: ["read", "write"],
				},
			},
		}),
	],
});

export type Session = typeof auth.$Infer.Session;
