// `npm run dev`: build, serve dist/ with live reload, and rebuild when figures/, kit/ or scripts/ change.
import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "./serve.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT ?? 4321);
let building = false;
let again = false;
let live;

function build() {
  if (building) {
    again = true;
    return;
  }
  building = true;
  const started = Date.now();
  const child = spawn(process.execPath, [join(ROOT, "scripts", "build-site.mjs")], { stdio: "inherit", cwd: ROOT });
  child.on("exit", (code) => {
    building = false;
    console.log(code === 0 ? `rebuilt in ${Date.now() - started} ms` : "build failed (fix the error above, the page keeps its last good build)");
    if (code === 0) live?.reload();
    if (again) {
      again = false;
      build();
    }
  });
}

build();
live = await serve({ root: join(ROOT, "dist"), port, reload: true });
console.log(`\n  http://localhost:${live.port}   (live reload, watching figures/ kit/ scripts/)\n`);

let timer;
for (const dir of ["figures", "kit", "scripts"]) {
  watch(join(ROOT, dir), { recursive: true }, (_event, name) => {
    if (name && /(^|\/)(\.|dist)/.test(name)) return;
    clearTimeout(timer);
    timer = setTimeout(build, 150);
  });
}
