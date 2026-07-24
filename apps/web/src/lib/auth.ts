import { createAuth } from "@repo/auth";
import { getDb } from "@/lib/db";

export type { Session, User } from "@repo/auth";

let _auth: ReturnType<typeof createAuth> | null = null;

export function getAuth() {
	if (!_auth) {
		_auth = createAuth(getDb());
	}
	return _auth;
}
