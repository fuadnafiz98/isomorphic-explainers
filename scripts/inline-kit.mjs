import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = join(dirname(fileURLToPath(import.meta.url)), "..", "kit");
const strip = (file) => readFileSync(join(KIT, file), "utf8").replace(/^export /gm, "");

export function kitScript() {
  return strip("iso-kit.mjs");
}

export function glScript() {
  return strip("gl.mjs");
}

export function turnScript() {
  return strip("turn.mjs");
}

export function fixedScript() {
  return strip("turn-fixed.mjs") + "\n" + strip("canvas-painter.mjs");
}

export function glSharedScript() {
  return strip("gl-shared.mjs");
}

export function latheScript() {
  // lathe.mjs imports three names from the kit (already in scope once the kit is inlined) and re-declares
  // some helper names, so it goes in as a namespace: `G.prismOf`, `G.solidOf`, `G.frameAlong`, ...
  const src = readFileSync(join(KIT, "lathe.mjs"), "utf8").replace(/^import .*$/m, "");
  const names = [...src.matchAll(/^export (?:const|function) (\w+)/gm)].map((match) => match[1]);
  return `const G = (() => {\n${src.replace(/^export /gm, "")}\nreturn { ${names.join(", ")} };\n})();`;
}

// Turns a plain ES module (no imports) into a script that can sit inside another module script.
export function moduleScript(file) {
  return readFileSync(file, "utf8").replace(/^export /gm, "");
}
