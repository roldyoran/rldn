import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDbInstance } from "@/lib/db";

export const auth = betterAuth({
	baseURL: import.meta.env.BETTER_AUTH_URL || "http://localhost:4321",
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
		max: 100, // 100 requests per window
	},
});

export type Session = typeof auth.$Infer.Session;
