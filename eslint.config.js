import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default [
  {
    ignores: [
      "node_modules/**",
      "Forms/**",
      "Consent forms/**",
      "eslint.config.js",
      "vitest.config.js",
    ],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-var": "error",
      eqeqeq: ["warn", "smart"],
    },
  },
  {
    // app.js and js/** are ES modules (loaded via <script type="module">) --
    // they import what they need (including the js/utils.js helpers) rather
    // than relying on shared globals.
    files: ["app.js", "js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
  {
    files: ["tests/**/*.js", "**/*.test.js", "**/*.spec.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  prettierConfig,
];
