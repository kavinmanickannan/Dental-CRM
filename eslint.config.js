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
    // app.js and data-management.js are loaded as separate classic <script>
    // tags sharing one global scope with js/utils.js -- declare the helpers
    // utils.js exposes (see its `exported` directive) so ESLint doesn't flag
    // cross-file globals as undefined.
    files: ["app.js", "data-management.js"],
    languageOptions: {
      globals: {
        formatINR: "readonly",
        formatCost: "readonly",
        escapeHtml: "readonly",
        normalizeCategory: "readonly",
        calculateEarnedPoints: "readonly",
        calculateRedeemFromPoints: "readonly",
        formatFileSize: "readonly",
        slugifyFormName: "readonly",
      },
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
