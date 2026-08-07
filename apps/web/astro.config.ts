import { defineConfig } from "astro/config";
import bun from "@wyattjoh/astro-bun-adapter";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import svgr from "vite-plugin-svgr";

export default defineConfig({
	output: "server",
	adapter: bun(),
	integrations: [react({ experimentalDisableStreaming: true })],
	vite: {
		plugins: [tailwindcss(), svgr()],
	},
	devToolbar: {
		enabled: false,
	},
});
