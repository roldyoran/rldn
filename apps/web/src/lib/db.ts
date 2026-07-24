import { createDb } from "@repo/db";

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
	if (!_db) {
		const dbPath = import.meta.env.DATABASE_URL;
		if (!dbPath) {
			throw new Error("DATABASE_URL environment variable is not set");
		}
		_db = createDb(dbPath);
	}
	return _db;
}
