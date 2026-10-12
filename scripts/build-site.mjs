// Builds every figure in figures/*/ into dist/<slug>/index.html, plus a dist/index.html gallery.
// Each figure folder holds a meta.json ({ slug, title, blurb }) and a build.mjs that writes the page named by --out.
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pageHtml, ISO_CSS } from "../kit/iso-kit.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const FIGURES = join(ROOT, "figures");
const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function buildSite() {
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });
  const metas = [];
  for (const name of readdirSync(FIGURES).sort()) {
    const dir = join(FIGURES, name);
    const metaFile = join(dir, "meta.json");
    if (!existsSync(metaFile) || !existsSync(join(dir, "build.mjs"))) continue;
    const meta = JSON.parse(readFileSync(metaFile, "utf8"));
    const out = join(DIST, meta.slug, "index.html");
    mkdirSync(dirname(out), { recursive: true });
    const run = spawnSync(process.execPath, [join(dir, "build.mjs"), "--out", out], { stdio: "inherit" });
    if (run.status !== 0) throw new Error(`figure "${name}" failed to build`);
    metas.push(meta);
  }
  const cards = metas
    .map((meta) => `<a class="gal-card" href="/${escape(meta.slug)}/"><span class="gal-title">${escape(meta.title)}</span><span class="gal-blurb">${escape(meta.blurb)}</span></a>`)
    .join("");
  const css = `<style>
.gal-head{margin:0 0 28px}.gal-head h1{margin:0 0 6px;font-size:22px;font-weight:600;color:var(--anatomy-strong);letter-spacing:-.01em}
.gal-head p{margin:0;color:var(--anatomy-text)}
.gal-grid{display:grid;gap:12px}
.gal-card{display:block;padding:18px 20px;border-radius:14px;background:var(--anatomy-card);box-shadow:var(--anatomy-lift);text-decoration:none;color:inherit;transition:transform .5s var(--anatomy-ease)}
.gal-card:hover{transform:translateY(-2px)}
.gal-title{display:block;color:var(--anatomy-strong);font-weight:600}
.gal-blurb{display:block;margin-top:4px;color:var(--anatomy-text)}
</style>`;
  const theme = `<script>try{var t=localStorage.getItem("iso-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.body.dataset.theme=t}catch(e){}</script>`;
  const body = `${theme}${css}<header class="gal-head"><h1>Isometric explainers</h1><p>Each figure is a real machine whose working is the idea.</p></header><div class="gal-grid">${cards}</div>`;
  writeFileSync(join(DIST, "index.html"), pageHtml({ title: "Isometric explainers", theme: "light", body }));
  writeFileSync(join(DIST, "404.html"), pageHtml({ title: "Not found", theme: "light", body: `${theme}<p>Not found. <a href="/">Back to the figures</a>.</p>` }));
  console.log(`built ${metas.length} figure(s) into dist/`);
  return metas;
}

if (import.meta.url === `file://${process.argv[1]}`) buildSite();
