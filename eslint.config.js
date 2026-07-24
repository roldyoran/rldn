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
];
