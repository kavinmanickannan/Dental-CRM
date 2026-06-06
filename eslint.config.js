import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default [
  {
    ignores: ["node_modules/**", "Forms/**", "Consent forms/**", "eslint.config.js"],
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