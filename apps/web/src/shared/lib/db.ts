import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@repo/db";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDbInstance() {
	if (!_db) {
		const url = process.env.TURSO_DB_URL;
		const authToken = process.env.TURSO_SECRET;

		if (!url) {
			throw new Error("TURSO_DB_URL environment variable is not set");
		}

		const client = createClient({ url, authToken });
		_db = drizzle(client, { schema });
	}
	return _db;
}
