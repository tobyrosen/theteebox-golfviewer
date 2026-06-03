// Cowork shared ESLint flat config base.
// Copied into JS/TS repos by propagate.py.
// Repos can extend this with project-specific rules.
//
// To use in a repo:
//   1. Ensure eslint is installed: `npm install --save-dev eslint typescript-eslint eslint-plugin-astro eslint-config-prettier`
//   2. Confirm this file is at the repo root as eslint.config.mjs
//   3. The pre-commit eslint hook will run automatically on staged JS/TS files

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
    },
  },

  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/*.test.js", "**/*.spec.js"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },

  {
    ignores: [
      "dist/",
      "build/",
      ".astro/",
      "node_modules/",
      "src-tauri/target/",
      "coverage/",
      "*.min.js",
    ],
  },
);
