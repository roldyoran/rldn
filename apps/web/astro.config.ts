import { defineConfig } from "astro/config";
import bun from "@wyattjoh/astro-bun-adapter";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	output: "server",
	adapter: bun(),
	vite: {
		plugins: [tailwindcss()],
	},
});
