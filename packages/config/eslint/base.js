import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/node_modules/**",
      "**/src-tauri/**",
      "**/*.config.js",
      "**/*.config.ts",
      "**/.turbo/**",
    ],
  },
];
