import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "@repo/db";
import * as schema from "@repo/db/schema";
import * as authSchema from "@repo/db/auth-schema";

/**
 * Server-side Better Auth configuration with Drizzle adapter
 * Use this in your API routes and server-side code
 */
export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
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
});

/**
 * Type helpers for better-auth
 */
export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];
