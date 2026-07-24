import { getDb } from "@repo/db";

let _db: ReturnType<typeof getDb> | null = null;

export function getDbInstance() {
	if (!_db) {
		const url = import.meta.env.TURSO_DB_URL || import.meta.env.DATABASE_URL;
		const authToken = import.meta.env.TURSO_SECRET;

		if (!url) {
			throw new Error("TURSO_DB_URL or DATABASE_URL environment variable is not set");
		}

		_db = getDb({ url, authToken });
	}
	return _db;
}
