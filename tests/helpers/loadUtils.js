import { readFileSync } from "node:fs";
import path from "node:path";

// js/utils.js is a classic script (no module exports -- see its header comment
// for why) that defines its helpers as plain top-level `const`/`function`
// bindings, loaded into the browser's global scope via <script src="...">.
//
// To unit-test it without changing how the app loads it, evaluate its source
// in a function body and return the bindings it declares -- `new Function`
// runs in the global scope (so `document` resolves to jsdom's global in tests,
// just as it resolves to the browser's `document` in production), and the
// appended `return { ... }` captures the const/function declarations via
// ordinary lexical scoping.
const UTILS_PATH = path.resolve(process.cwd(), "js/utils.js");
const SOURCE = readFileSync(UTILS_PATH, "utf-8");

const EXPORTED_NAMES = [
  "formatINR",
  "formatCost",
  "escapeHtml",
  "normalizeCategory",
  "calculateEarnedPoints",
  "calculateRedeemFromPoints",
  "formatFileSize",
  "slugifyFormName",
];

export function loadUtils() {
  const factory = new Function(`${SOURCE}\nreturn { ${EXPORTED_NAMES.join(", ")} };`);
  return factory();
}
