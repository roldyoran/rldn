import eslintPluginAstro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

export default [
	{
		ignores: ["node_modules", "dist", ".turbo", "*.db"],
	},
	...tseslint.configs.recommended,
	{
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-import-type-side-effects": "error",
		},
	},
	...eslintPluginAstro.configs["flat/recommended"],
	{
		files: ["**/*.astro"],
		rules: {
			"@typescript-eslint/no-unused-expressions": "off",
		},
	},
	{
		files: ["apps/web/env.d.ts"],
		rules: {
			"@typescript-eslint/triple-slash-reference": "off",
		},
	},
	// Feature boundary rules: pages/ → features/ → shared/
	{
		files: ["apps/web/src/features/**/*"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["@/pages/*"],
							message: "Features cannot import from pages/",
						},
						{
							group: ["@/features/*/!(index).*"],
							message:
								"Features cannot import from other features directly. Use shared/ for cross-feature code.",
						},
					],
				},
			],
		},
	},
	{
		files: ["apps/web/src/shared/**/*"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["@/pages/*"],
							message: "Shared code cannot import from pages/",
						},
						{
							group: ["@/features/*"],
							message: "Shared code cannot import from features/. Keep it business-agnostic.",
						},
					],
				},
			],
		},
	},
];
