import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import svgr from "vite-plugin-svgr";

export default defineConfig({
	output: "server",
	adapter: vercel(),
	integrations: [react({ experimentalDisableStreaming: true })],
	vite: {
		plugins: [tailwindcss(), svgr()],
		build: {
			chunkSizeWarningLimit: 800,
		},
	},
	devToolbar: {
		enabled: false,
	},
});
