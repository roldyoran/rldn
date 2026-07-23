import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.ts";
import * as authSchema from "./auth-schema.ts";

/**
 * Create a database connection
 * @param databasePath - Path to the SQLite database file
 * @returns Drizzle database instance
 */
export function createDb(databasePath: string) {
  return drizzle(databasePath, { schema: { ...schema, ...authSchema } });
}

// Default export for convenience (uses DATABASE_URL env var)
let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) {
    const dbPath = process.env.DATABASE_URL;
    if (!dbPath) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _db = createDb(dbPath);
  }
  return _db;
}

// Re-export all schemas and types
export * from "./schema.ts";
export * from "./auth-schema.ts";
