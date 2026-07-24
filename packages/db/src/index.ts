import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as authSchema from "./auth-schema.ts";
import * as schema from "./schema.ts";

/**
 * Create a database connection
 * Supports both Turso (libSQL) and local SQLite via @libsql/client
 * @param config - Database config (url + optional authToken)
 * @returns Drizzle database instance
 */
export function createDb(config: { url: string; authToken?: string }) {
	const client = createClient({
		url: config.url,
		authToken: config.authToken,
	});
	return drizzle(client, { schema: { ...schema, ...authSchema } });
}

// Default export for convenience (uses env vars)
let _db: ReturnType<typeof createDb> | null = null;

export function getDb(config?: { url?: string; authToken?: string }) {
	if (!_db) {
		const url = config?.url || process.env.TURSO_DB_URL || process.env.DATABASE_URL;
		const authToken = config?.authToken || process.env.TURSO_SECRET;

		if (!url) {
			throw new Error("TURSO_DB_URL or DATABASE_URL environment variable is not set");
		}

		_db = createDb({ url, authToken });
	}
	return _db;
}

export type Database = ReturnType<typeof getDb>;

export * from "./auth-schema.ts";
// Re-export all schemas and types
export * from "./schema.ts";
