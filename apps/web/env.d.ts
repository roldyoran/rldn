/// <reference path="../.astro/types.d.ts" />

declare namespace App {
	interface Locals {
		user: import("better-auth").User | null;
		session: import("better-auth").Session | null;
	}
}

// SVG React component imports (vite-plugin-svgr)
declare module "*.svg?react" {
	import type { ComponentType, SVGProps } from "react";
	const ReactComponent: ComponentType<
		SVGProps<SVGSVGElement> & { width?: number | string; height?: number | string }
	>;
	export default ReactComponent;
}
