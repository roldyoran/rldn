import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as authSchema from "@repo/db/auth-schema";
import * as appSchema from "@repo/db/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDbInstance() {
	if (!_db) {
		const url = import.meta.env.TURSO_DB_URL || import.meta.env.DATABASE_URL;
		const authToken = import.meta.env.TURSO_SECRET;

		if (!url) {
			throw new Error("TURSO_DB_URL or DATABASE_URL environment variable is not set");
		}

		const client = createClient({ url, authToken });
		_db = drizzle(client, {
			schema: {
				user: authSchema.user,
				session: authSchema.session,
				account: authSchema.account,
				verification: authSchema.verification,
				apikey: authSchema.apikey,
				canvases: appSchema.canvases,
				canvasDocuments: appSchema.canvasDocuments,
				images: appSchema.images,
				// Relations
				userRelations: authSchema.userRelations,
				sessionRelations: authSchema.sessionRelations,
				accountRelations: authSchema.accountRelations,
				canvasesRelations: appSchema.canvasesRelations,
				canvasDocumentsRelations: appSchema.canvasDocumentsRelations,
				imagesRelations: appSchema.imagesRelations,
			},
		});
	}
	return _db;
}
