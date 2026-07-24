import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "@/lib/db";

export const auth = betterAuth({
	baseURL: import.meta.env.BETTER_AUTH_URL || "http://localhost:4321",
	database: drizzleAdapter(getDb(), {
		provider: "sqlite",
	}),
	emailAndPassword: {
		enabled: true,
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
	},
});

export type Session = typeof auth.$Infer.Session;
