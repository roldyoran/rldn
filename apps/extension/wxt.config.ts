import { defineConfig } from "wxt";

export default defineConfig({
	srcDir: "src",
	modules: ["@wxt-dev/module-react"],
	manifest: {
		name: "Canvas Grab",
		description: "Captura imágenes de cualquier página y envíalas a tus lienzos.",
		version: "2.0.0",
		permissions: ["storage", "activeTab", "notifications"],
		host_permissions: ["<all_urls>"],
		icons: {
			16: "icon16.png",
			48: "icon48.png",
			128: "icon128.png",
		},
		action: {
			default_icon: {
				16: "icon16.png",
				48: "icon48.png",
				128: "icon128.png",
			},
		},
	},
});
