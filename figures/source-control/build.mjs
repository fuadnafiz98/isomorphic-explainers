import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as M from "./model.mjs";
import * as D from "./diagrams.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SIBLING = join(HERE, "..", "fingerprint-sieve");
const argv = process.argv.slice(2);
const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const OUT = option("--out") ?? join(HERE, "..", "..", "dist", "source-control", "index.html");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const section = (title, text) => `<div class="prose"><h2>${title}</h2>${text}</div>`;
const p = (t) => `<p>${t}</p>`;
const fig = (key, label, inner, foot = "") => `<figure id="${key}"><div class="fh"><b>${key.toUpperCase()}</b><span>[ ${esc(label)} ]</span></div>${inner}${foot ? `<div class="ff">${foot}</div>` : ""}</figure>`;
const hlFig = (key, name, label, lead, foot) => `<figure id="${key}"><div class="fh"><b>${key.toUpperCase()}</b><span>[ ${esc(label)} ]</span></div><div class="hl-row"><div class="hl" data-hl="${name}"></div><div class="hl-side"><p class="hl-lead">${lead}</p><label class="knob tight hl-slider"><span class="knob-l"><b>reach</b></span><input type="range" data-hl-slider><output data-hl-out></output></label></div></div><div class="ff"><span class="readout" data-hl-read>rest</span><span class="cap-t">${foot}</span><button type="button" class="chip" data-hl-play aria-pressed="false">play tour</button></div></figure>`;

const words = [
  section("The bottleneck moved", p("Writing code stopped being the slow part. Merges went from roughly 2,500 a day in May 2026 to over 30,000 a day in September, and the latent demand is close to infinite. Source control, builds and CI became the binding constraint.")),
  fig("merge", "merges per day", D.mergeChart(), `<span class="cap-t">From the post's opening chart: merges per day grew more than tenfold in four months.</span>`),
  section("Why git stopped fitting", p("A git clone is a complete, self-contained repository: history, blame and diffs work offline. That design is right for almost everyone. A monorepo with ~100 GB of history and a 25 GB working copy, with 25 million CI checkouts a day, is not 'almost everyone'. Naively fetching a full copy on every checkout is about 600 PB a day.")),
  fig("scale", "naive arithmetic and monorepo size", D.scaleMath(), `<span class="cap-t">The 600 PB figure is what full-checkout fetching would imply; it is the reason something has to fetch only what is read.</span>`),
  fig("git-setup", "scaling git the old way", D.gitScalingSetup(), `<span class="cap-t">Hundreds of mirrors, stale seeds, partial clones, and history operations that need care on every clone.</span>`),
  section("The six principles", p("The post lists six. They are not incremental tweaks; each one replaces an assumption git makes.")),
  fig("principles", "six principles", D.principles(), ``),
  section("Client versus server", p("In git, every client is a full server. In Scion, the server computes and the client keeps a bounded cache and lays out files on disk. The price of the asymmetry is that the client can compute almost nothing on its own; the payoff is that it holds far less data.")),
  fig("asym", "client-server asymmetry", D.asymmetryTable(), ``),
  section("Changesets instead of commits", p("The unit of work is a changeset: an entry in a write-ahead log. It stores what changed (file list plus content-addressed blob pointers), not a pointer to a full tree. There are no packfiles to accept and no refs to move when you create one.")),
  fig("changeset", "the shape of a changeset", D.changesetShape(), `<span class="cap-t">Blame, path history and skip lists are derived data, each defined recursively from a changeset's parents.</span>`),
  section("Where derived data comes from", p("Blame, path history and skip lists are not part of the changeset. They are derived data, each computed recursively from the parents' values. New indices (copy detection, path search) are added by defining a new type, choosing eager or deferred computation, and (because clients never see internals) optimising freely.")),
  section("Checkout tiers", p("The client asks its daemon, which asks a regional cache, which asks an authoritative server, which reads Spanner or cloud storage. Every tier answers the same RPCs, so the client does not know the topology. Each tier holds a cache hit rate above 99%, is stateless enough to scale up, and the protocol involves no multi-gigabyte packfile response.")),
  fig("tiers", "checkout architecture", D.checkoutTiers(), `<span class="cap-t">Sparse and virtualised checkouts fall out for free: the client simply does not ask for trees it does not want.</span>`),
  section("What it bought", p("The footprint is 200x smaller than the git mirroring fleet, CI and research checkouts are two orders of magnitude faster, and CI alone recovered a quarter of CPU capacity. Everything scales with the change, not the repo, and there is no repository maintenance anywhere.")),
  fig("perf", "observed wins", D.performance(), ``),
  section("How it was built", p("Seven people built both Scion and the Antique code review tool, plus half a dozen related systems, and migrated the whole monorepo, in five months, while merges grew tenfold. Claude Mythos Preview rewrote the ingestion pipeline into something 20x smaller in memory and 4x faster. Claude's code was better than the team's at writing; the value of the engineers was design judgment and saying no.")),
  section("A feel for the fetch", p("The fetch fans out across the tiers. Move the pointer and the stack under it rises; the rest settles. The slider is how far one read reaches.")),
  hlFig("cache", "cache", "a field that rises where you point", "Move the pointer; the pillars under it rise and fall off with distance.", "Schematic only: the way a request walks client, daemon, cache and server."),
].join("\n");

const body = [
  `<nav class="top mono-s"><a href="/">← all figures</a><span>SOURCE CONTROL · AGENT SCALE</span><button type="button" data-theme-toggle>theme</button></nav>`,
  `<header><h1>Scion: source control at agent scale</h1><p class="dek">How Anthropic's monorepo went from 2,500 to 30,000+ merges a day, why git ran out, and how an in-house system made commits, checkouts and blame scale with the change rather than the repo.</p></header>`,
  `<div class="prose lead"><p>Based on the Anthropic engineering post "Redesigning source control" (Oct 13, 2026). All numbers are the post's; every diagram here is redrawn. Each section follows one part of the post.</p></div>`,
  words,
  `<footer><div class="mono-s">SOURCE</div><ul><li><a href="${M.ARTICLE.url}">${M.ARTICLE.title}</a> · ${M.ARTICLE.author}</li></ul></footer>`,
].join("\n");

const CSS = readFileSync(join(SIBLING, "fp.css"), "utf8") + readFileSync(join(HERE, "sc.css"), "utf8");
const THEME_INIT = `<script>try{var t=new URLSearchParams(location.search).get("theme")||localStorage.getItem("iso-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.body.dataset.theme=t}catch(e){}</script>`;
const THEME_TOGGLE = `document.querySelector("[data-theme-toggle]")?.addEventListener("click",()=>{const next=document.body.dataset.theme==="dark"?"light":"dark";document.body.dataset.theme=next;try{localStorage.setItem("iso-theme",next)}catch(e){}});`;
const HL_NAMES = ["cache"];
const HL_JS = [
  readFileSync(join(HERE, "..", "..", "kit", "hairline-kernel.js"), "utf8"),
  "const HL_FIGS = {};",
  ...HL_NAMES.map((n) => `(function (hairline) {\n${readFileSync(join(HERE, "hl", `${n}.js`), "utf8")}\n})((f) => { HL_FIGS[f.name] = f; });`),
  readFileSync(join(HERE, "hl-host.js"), "utf8"),
].join("\n");
let liveSrc = "";
try { liveSrc = readFileSync(join(HERE, "live.js"), "utf8"); } catch (e) { liveSrc = ""; }
const page = k.pageHtml({
  title: "Scion: source control at agent scale",
  theme: "light",
  body: `${THEME_INIT}<style>${CSS}</style>${body}`,
  script: HL_JS + "\n" + THEME_TOGGLE + "\n" + liveSrc,
  width: 1040,
});
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page);
console.log("wrote", OUT, `${(page.length / 1024).toFixed(0)} KB`);
