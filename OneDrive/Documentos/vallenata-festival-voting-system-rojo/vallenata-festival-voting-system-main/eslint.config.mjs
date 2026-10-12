import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["assets/js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: {
      "no-unused-vars": ["error", { args: "none" }],
      "no-console": "error",
      eqeqeq: "error",
      "prefer-const": "error",
      "no-var": "error",
    },
  },
];
