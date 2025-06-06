import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

// Make sure you have installed the Prettier packages:
// npm install --save-dev eslint-plugin-prettier eslint-config-prettier

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    // 1) Register the Prettier plugin alongside @eslint/js
    plugins: { js, prettier: "eslint-plugin-prettier" },
    // 2) Extend both the js/recommended rules and Prettier’s recommended integration
    extends: ["js/recommended", "plugin:prettier/recommended"],
    // 3) Enable browser globals (window, document, etc.)
    languageOptions: {
      globals: globals.browser,
    },
  },
]);
