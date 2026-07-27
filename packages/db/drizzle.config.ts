import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ["../../.env.local", "../../.env"] });

export default defineConfig({
	out: "./src/migrations",
	schema: ["./src/schema.ts", "./src/auth-schema.ts"],
	dialect: "turso",
	dbCredentials: {
		url: process.env.TURSO_DB_URL!,
		authToken: process.env.TURSO_SECRET,
	},
});
