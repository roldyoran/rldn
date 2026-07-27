import { createAuthClient } from "better-auth/client";
import { apiKeyClient } from "@better-auth/api-key/client";

export const authClient = createAuthClient({
	baseURL: import.meta.env.BETTER_AUTH_URL || "http://localhost:4321",
	plugins: [apiKeyClient()],
});
