import { reactConfig } from "@pi-os/config/eslint/react";

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...reactConfig,
  {
    ignores: ["dist/**", "src-tauri/**"],
  },
];
