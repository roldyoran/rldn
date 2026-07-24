import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as authSchema from "./auth-schema.ts";
import * as schema from "./schema.ts";

/**
 * Create a database connection
 * @param databasePath - Path to the SQLite database file
 * @returns Drizzle database instance
 */
export function createDb(databasePath: string) {
	const sqlite = new Database(databasePath);
	return drizzle(sqlite, { schema: { ...schema, ...authSchema } });
}

// Default export for convenience (uses DATABASE_URL env var)
let _db: ReturnType<typeof createDb> | null = null;

export function getDb(databasePath?: string) {
	if (!_db) {
		const dbPath = databasePath || process.env.DATABASE_URL;
		if (!dbPath) {
			throw new Error("DATABASE_URL environment variable is not set");
		}
		_db = createDb(dbPath);
	}
	return _db;
}

export * from "./auth-schema.ts";
// Re-export all schemas and types
export * from "./schema.ts";
