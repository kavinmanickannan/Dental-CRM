import path from "node:path";
import { pathToFileURL } from "node:url";

// js/utils.js is an ES module loaded by index.html (and imported by feature
// modules) -- import it directly so the test suite exercises the exact same
// bindings the browser does.
const UTILS_PATH = path.resolve(process.cwd(), "js/utils.js");

export function loadUtils() {
  return import(pathToFileURL(UTILS_PATH).href);
}
