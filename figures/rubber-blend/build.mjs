// Builds the rubber-blend explainer: a long-form page about one paper, in the page's one monochrome line language.
// Static diagrams are drawn here; the charts, sliders and the Gaussian-process playground live in live.js.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as M from "./model.mjs";
import { GROUPS, PAPER_FIGS } from "./paperfigs.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SIBLING = join(HERE, "..", "fingerprint-sieve"); // fonts and the base line-language CSS are shared with that page
const argv = process.argv.slice(2);
const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const OUT = option("--out") ?? join(HERE, "..", "..", "dist", "rubber-blend", "index.html");

// ───────────────────────────── drawing helpers ─────────────────────────────
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f1 = (n) => (Math.round(n * 10) / 10).toString();
const T = (x, y, text, { c = "lbl", a = "start" } = {}) => `<text class="${c}" x="${f1(x)}" y="${f1(y)}" text-anchor="${a}">${esc(text)}</text>`;
const Rc = (x, y, w, h, { c = "box", rx = 0 } = {}) => `<rect class="${c}" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}"${rx ? ` rx="${rx}"` : ""}/>`;
const Ln = (x1, y1, x2, y2, c = "ln") => `<line class="${c}" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}"/>`;
const Pa = (d, c = "ln") => `<path class="${c}" d="${d}"/>`;
const Ci = (x, y, r, c = "box") => `<circle class="${c}" cx="${f1(x)}" cy="${f1(y)}" r="${r}"/>`;
const Tag = (x, y, n) => `<rect class="tag" x="${f1(x - 8)}" y="${f1(y - 8)}" width="16" height="16"/><text class="tag-t" x="${f1(x)}" y="${f1(y + 3.6)}" text-anchor="middle">${n}</text>`;
const Arrow = (x1, y1, x2, y2, { dash = false } = {}) => `<path class="ln${dash ? " flow" : ""}" d="M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}" marker-end="url(#ah)"/>`;
const svg = (w, h, body, label, cls = "flat") => `<div class="stage flatwrap"><svg class="${cls}" viewBox="0 0 ${w} ${h}" width="${w}" role="img" aria-label="${esc(label)}">${body}</svg></div>`;
// a token that rides a closed path forever
const Token = (d, dur, begin = 0) => `<circle class="solid tok" r="4"><animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" path="${d}"/></circle>`;

let figCount = 0;
const used = {};
const num = (n) => `FIG ${String(n).padStart(2, "0")}`;
const fig = (key, label, inner, foot = "", cls = "") => {
  figCount += 1;
  used[key] = num(figCount);
  return `<figure class="${cls}" id="${key}"><div class="fh"><b>${used[key]}</b><span>[ ${esc(label)} ]</span></div>${inner}${foot ? `<div class="ff">${foot}</div>` : ""}</figure>`;
};
const section = (title, text) => `<div class="prose"><h2>${title}</h2>${text}</div>`;
const p = (t) => `<p>${t}</p>`;

// ───────────────────────────── FIG: two loops ─────────────────────────────
function loops() {
  const b = [];
  const ring = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}Z`;
  // left: the formulator's loop
  b.push(T(30, 34, "TODAY: ONE FORMULATOR, ONE BENCH", { c: "lbl-s" }));
  const L = [[30, 60, "guess a recipe"], [250, 60, "mix and cure"], [250, 178, "measure"], [30, 178, "close enough?"]];
  L.forEach(([x, y, t]) => { b.push(Rc(x, y, 150, 50)); b.push(T(x + 75, y + 30, t, { a: "middle" })); });
  b.push(Arrow(180, 85, 250, 85) + Arrow(325, 110, 325, 178) + Arrow(250, 203, 180, 203) + Arrow(105, 178, 105, 110, { dash: true }));
  b.push(T(112, 150, "no: tweak, again", { c: "lbl-c" }));
  b.push(T(30, 268, "skill means fewer laps, and the memory lives in one head.", { c: "lbl-c" }));
  b.push(Token("M105 85H325V203H105Z", 7));
  // right: the paper's loop
  const X = 520;
  b.push(T(X, 34, "THE PAPER: LEARN f, THEN INVERT IT", { c: "lbl-s" }));
  const R = [[X, 60, "target properties"], [X + 220, 60, "model proposes a recipe"], [X + 220, 178, "mix one blend, measure"], [X, 178, "add it to the data"]];
  R.forEach(([x, y, t]) => { b.push(Rc(x, y, 170, 50)); b.push(T(x + 85, y + 30, t, { a: "middle" })); });
  b.push(Arrow(X + 170, 85, X + 220, 85) + Arrow(X + 305, 110, X + 305, 178) + Arrow(X + 220, 203, X + 170, 203) + Arrow(X + 85, 178, X + 85, 110, { dash: true }));
  b.push(T(X + 94, 150, "refit, propose again", { c: "lbl-c" }));
  b.push(T(X, 268, "paper: one round (blends 10 and 11), then stop.", { c: "lbl-c" }));
  b.push(Token(`M${X + 85} 85H${X + 305}V203H${X + 85}Z`, 6.4));
  b.push(Ln(467, 40, 467, 250, "guide"));
  return svg(940, 290, b.join(""), "Two loops: a formulator guessing and measuring, and a model proposing recipes that are mixed and added to the data");
}

// ───────────────────────────── FIG: the lab pipeline ─────────────────────────────
export const STATIONS = [
  { t: "Mix", s: "Brabender bowl mixer", k: "Brabender", d: "75 cm³ chamber, Banbury blades, 21 °C, 50 rpm, mixed until the torque trace goes flat: that plateau is how you know the blend is uniform." },
  { t: "Find t90", s: "AR-2000EX rheometer", k: "rheometer", d: "A parallel-plate rheometer at 150 °C watches the cure reaction (ASTM D2084). t90 is the time to 90 % cure, and it sets how long to bake." },
  { t: "Mould", s: "Carver press", k: "Carver press", d: "1000 lbf at 150 °C for t90, in cylinder moulds. Sodium bicarbonate (8 pph in every blend) decomposes and releases CO₂: that is the foam. How much compound you charge into the mould sets the void content." },
  { t: "Scan", s: "µCT, 4 µm voxels", k: "µCT 4 µm", d: "A one-hour X-ray scan per cylinder. A MATLAB script thresholds each slice (dark = void, bright = rubber) and gives void % through the thickness." },
  { t: "Cycle", s: "DMA, 1 Hz", k: "DMA 1 Hz", d: "10 % static squeeze plus a ±5 % wobble at 1 Hz, roughly a walking step. The stress-strain loop gives tan δ." },
  { t: "Hold", s: "DMA relaxation", k: "DMA 10 min", d: "Squash 30 % and hold for ten minutes while logging stress. Fit stress = A · t^(−n) to get σ_relax and n_relax." },
  { t: "Press", s: "Shore A durometer", k: "durometer", d: "A flat-tipped 35° cone is pressed in. Reading 0 to 100: higher is harder. Operator force matters, so the paper standardises it." },
];
function pipeline() {
  const b = [];
  const W = 118, G = 22, X0 = 24, Y = 70;
  STATIONS.forEach((s, i) => {
    const x = X0 + i * (W + G);
    b.push(`<g class="st" data-st="${i}" tabindex="0" role="button" aria-label="${esc(s.t + ": " + s.s)}">`);
    b.push(Rc(x, Y, W, 86));
    b.push(Tag(x + 14, Y + 14, i + 1));
    b.push(T(x + 14, Y + 50, s.t, { c: "lbl" }));
    b.push(T(x + 14, Y + 70, s.k, { c: "lbl-c" }));
    b.push(`</g>`);
    if (i < STATIONS.length - 1) b.push(Arrow(x + W, Y + 43, x + W + G, Y + 43));
  });
  const end = X0 + STATIONS.length * (W + G) - G;
  // below: the table it all becomes
  b.push(Pa(`M${X0 + 3 * (W + G) + W / 2} ${Y + 86}V200H${end / 2 - 70}`, "ln flow"));
  b.push(Pa(`M${X0 + 4.5 * (W + G)} ${Y + 86}V200H${end / 2 + 70}`, "ln flow"));
  b.push(Rc(end / 2 - 150, 200, 300, 64, { c: "box soft" }));
  b.push(T(end / 2, 226, "one row per specimen", { a: "middle" }));
  b.push(T(end / 2, 246, "sulfur · paraffin · void  →  4 numbers", { c: "lbl-c", a: "middle" }));
  b.push(T(end / 2, 288, "326 rows from 11 recipes. That table is the whole dataset.", { c: "lbl-c", a: "middle" }));
  const path = `M${X0 + W / 2} ${Y + 43}H${end - W / 2}`;
  b.push(Token(path, 9));
  return svg(1000, 310, b.join(""), "Seven lab stations from mixing to hardness, ending in one data table");
}

// ───────────────────────────── FIG: the knob board ─────────────────────────────
function knobBoard() {
  const rows = M.INPUTS.map((inp, i) => {
    const mid = (inp.lo + inp.hi) / 2;
    return `<label class="knob"><span class="knob-l"><b>${inp.sym}</b><i>${inp.role}</i></span><input type="range" min="${inp.lo}" max="${inp.hi}" step="${inp.id === "s" ? 0.1 : 1}" value="${inp.id === "s" ? 1.5 : inp.id === "p" ? 40 : 10}" data-knob="${inp.id}"><output data-knob-out="${inp.id}"></output><span class="knob-u">${inp.unit}</span></label>`;
  }).join("");
  const outs = M.OUTPUTS.map((o) => `<li data-out="${o.id}"><span class="o-sym">${o.sym}</span><span class="o-arrow" data-arrow></span><span class="o-what">${o.what}</span></li>`).join("");
  return `<div class="knobboard"><div class="kb-in">${rows}<p class="mono-s kb-note">Held fixed in all 11 blends: NaHCO₃ 8 pph, plus stearic acid, ZnO and TMTD. Betapreno natural rubber, ammonia-free.</p></div><div class="kb-mid"><svg viewBox="0 0 220 200" class="cyl" role="img" aria-label="A 10 mm by 10 mm cylinder whose voids grow with the void slider"><rect class="box" x="40" y="40" width="140" height="130" rx="2"/><ellipse class="box soft" cx="110" cy="40" rx="70" ry="16"/><g data-voids></g><text class="lbl-c" x="110" y="190" text-anchor="middle">10 mm × 10 mm specimen, side view</text></svg></div><ul class="kb-out">${outs}</ul></div>`;
}

// ───────────────────────────── FIG: the four-number tabs ─────────────────────────────
const FOUR = [
  { id: "void", tab: "voids", head: "How many bubbles?", dev: "A µCT slice thresholded into rubber and not-rubber. Void % is the fraction of dark pixels, averaged over the height.", move: "voids", unit: "%", lo: 0, hi: 40, v: 15, step: 1 },
  { id: "dur", tab: "durometer", head: "How hard does it feel?", dev: "One static press. The paper's samples read from about 7 to 28 Shore A, very soft, probably thanks to 20 to 80 pph oil plus foam.", move: "voids", unit: "%", lo: 0, hi: 30, v: 10, step: 1 },
  { id: "sig", tab: "σ_relax", head: "How hard does it push back at the start?", dev: "Squash to 30 % strain, take the peak stress. It is the 'initial load' of the decay curve below.", move: "voids", unit: "%", lo: 0, hi: 35, v: 10, step: 1 },
  { id: "n", tab: "n_relax", head: "How fast does it give?", dev: "Normalised stress follows A · t^(−n). Treat n as a decay rate: larger magnitude, faster relaxation. The paper reports it as a negative slope.", move: "|n|", unit: "", lo: 0.002, hi: 0.06, v: 0.02, step: 0.001 },
  { id: "tan", tab: "tan δ", head: "How much energy leaks out as heat?", dev: "tan δ = E″ / E′, loss over storage. Plot stress against strain over one cycle: a fatter loop means more loss. Foam under walking-size strain bends the loop, so it is not just an ellipse.", move: "tan δ", unit: "", lo: 0.01, hi: 0.2, v: 0.05, step: 0.005 },
];
function fourNumbers() {
  const tabs = FOUR.map((f, i) => `<button type="button" class="chip nocaps" data-four-tab="${f.id}"${i === 0 ? " data-on" : ""}>${f.tab}</button>`).join("");
  return `<div class="ctl"><span class="ctl-l">number</span><span class="chips">${tabs}</span></div>
<div class="four"><div class="four-plot"><svg viewBox="0 0 440 280" data-four-svg role="img" aria-label="A chart for the selected measurement"></svg></div>
<div class="four-side"><h3 data-four-head></h3><p data-four-dev></p><label class="knob tight"><span class="knob-l"><b data-four-move></b></span><input type="range" data-four-slider><output data-four-out></output></label><div class="verdict" data-four-read></div></div></div>`;
}

// ───────────────────────────── FIG: the ladder ─────────────────────────────
function ladder() {
  const props = M.OUTPUTS.map((o, i) => `<button type="button" class="chip nocaps" data-r2-prop="${o.id}"${i === 2 ? " data-on" : ""}>${o.sym}</button>`).join("");
  const rows = M.MODELS.map((m, i) => `<div class="rung" data-rung="${m.id}"><span class="rung-n">${i + 1}</span><span class="rung-name">${m.name}</span><span class="rung-bar"><i data-bar></i></span><span class="rung-v" data-val></span><span class="rung-note">${m.params} · ${m.note}</span></div>`).join("");
  return `<div class="ctl"><span class="ctl-l">predict</span><span class="chips">${props}</span></div><div class="ladder">${rows}</div>`;
}

// ───────────────────────────── FIG: the network ─────────────────────────────
function network() {
  const props = M.OUTPUTS.map((o, i) => `<button type="button" class="chip nocaps" data-ann-prop="${o.id}"${i === 0 ? " data-on" : ""}>${o.sym}</button>`).join("");
  return `<div class="ctl"><span class="ctl-l">network for</span><span class="chips">${props}</span></div><div class="stage"><svg class="flat" viewBox="0 0 760 300" data-ann-svg role="img" aria-label="A small fully connected network from sulfur, paraffin oil and voids to one property"></svg></div><div class="step"><b data-ann-title></b><span data-ann-text></span></div>`;
}

// ───────────────────────────── FIG: Gaussian process playground ─────────────────────────────
function gpPlay() {
  return `<div class="stage"><svg class="flat" viewBox="0 0 760 300" data-gp-svg tabindex="0" role="img" aria-label="Click to add measurements; the shaded band is the 95 percent confidence interval of a Gaussian process"></svg></div><div class="ctl"><button type="button" class="chip" data-gp-reset>reset to 3 points</button><button type="button" class="chip" data-gp-fill>add 5 random points</button><span class="mono-s" data-gp-read></span></div>`;
}

// ───────────────────────────── FIG: reverse engineering ─────────────────────────────
function reverse() {
  const b = [];
  b.push(T(30, 30, "STEP 1  SCORE EVERY CANDIDATE", { c: "lbl-s" }));
  b.push(Rc(30, 46, 300, 150, { c: "box nofill" }));
  b.push(`<g data-grid></g>`);
  b.push(T(30, 216, "≈ 6,600 candidate recipes, each run through the model.", { c: "lbl-c" }));
  b.push(T(30, 232, "Schematic: the real surface is not drawn in the paper.", { c: "lbl-c" }));
  b.push(Rc(370, 46, 190, 150, { c: "box soft" }));
  b.push(T(465, 78, "score(recipe) =", { a: "middle" }));
  b.push(T(465, 102, "Σ  wᵢ · (ŷᵢ − targetᵢ)²", { a: "middle" }));
  b.push(T(465, 130, "weighted distance between", { c: "lbl-c", a: "middle" }));
  b.push(T(465, 144, "predicted and wanted values", { c: "lbl-c", a: "middle" }));
  b.push(T(465, 172, "pick the minimum", { a: "middle" }));
  b.push(Arrow(330, 120, 370, 120));
  b.push(T(600, 30, "STEP 2  TOO BIG? ASK SMARTER", { c: "lbl-s" }));
  const nodes = [["surrogate (GPR)", 600, 56], ["acquisition", 600, 112], ["try that recipe", 600, 168]];
  nodes.forEach(([t, x, y]) => { b.push(Rc(x, y, 150, 38)); b.push(T(x + 75, y + 24, t, { a: "middle" })); });
  b.push(Arrow(675, 94, 675, 112) + Arrow(675, 150, 675, 168));
  b.push(Pa("M750 187H766V75H750", "ln flow"));
  b.push(T(676, 232, "bayesian optimisation: the paper's 'new", { c: "lbl-c", a: "middle" }));
  b.push(T(676, 246, "observation' was the trained GPR itself.", { c: "lbl-c", a: "middle" }));
  return svg(800, 260, b.join(""), "Brute-force scoring of about 6600 recipes, and the Bayesian optimisation alternative");
}
function targetTable() {
  const keys = [["sig", "σ_relax", "kPa", 2], ["n", "n_relax", "", 4], ["tan", "tan δ", "", 3]];
  const head = `<tr><th></th><th>target</th>${M.PROPOSED.map((m) => `<th>${m.name}</th>`).join("")}</tr>`;
  const rec = `<tr class="rec"><td>recipe proposed</td><td>–</td>${M.PROPOSED.map((m) => `<td>S ${m.s} · P ${m.p} · V ${m.v}</td>`).join("")}</tr>`;
  const rows = keys.map(([id, name, unit, d]) => `<tr><td>${name}${unit ? ` <small>${unit}</small>` : ""}</td><td>${M.TARGET[id]}</td>${M.PROPOSED.map((m) => {
    const off = M.pctOff(m.pred[id], M.TARGET[id]);
    const r = Math.round(off);
    return `<td>${m.pred[id]} <small class="off${Math.abs(off) > 20 ? " bad" : ""}">${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r)}%</small></td>`;
  }).join("")}</tr>`).join("");
  const dur = `<tr class="dim"><td>durometer <small>Shore A</small></td><td>not targeted</td>${M.PROPOSED.map((m) => `<td>${m.pred.dur}</td>`).join("")}</tr>`;
  return `<div class="stage scroll"><table class="log tight tt">${head}${rec}${rows}${dur}</table></div>`;
}


// ───────────────────────────── every figure of the paper ─────────────────────────────
function paperFigures() {
  return GROUPS.map((g) => {
    const cards = PAPER_FIGS.filter((f) => f.n >= g.from && f.n <= g.to).map((f) =>
      `<article class="pf" id="paper-fig-${f.n}"><div class="pf-n">PAPER FIG. ${f.n}</div><h4>${esc(f.t)}</h4><p class="pf-shows">${esc(f.shows)}</p><p class="pf-take">${esc(f.take)}</p>${f.see && used[f.see] ? `<a class="pf-see" href="#${f.see}">live on this page: ${used[f.see]} →</a>` : ""}</article>`).join("");
    return `<section class="pf-group"><h3 class="pf-h">${esc(g.title)} <span>PAPER FIG. ${g.from}${g.to > g.from ? `–${g.to}` : ""}</span></h3><div class="pf-grid">${cards}</div></section>`;
  }).join("");
}

// ───────────────────────────── page ─────────────────────────────
const WORDS = [
  ["pph", "Parts per hundred of rubber: 2.5 pph sulfur means 2.5 g for every 100 g of rubber."],
  ["crosslink", "Sulfur bonds between rubber chains (vulcanisation). More bonds, stiffer, less goo."],
  ["plasticizer", "Paraffin oil here. Lets chains slide, so softer and easier to process."],
  ["voids", "Gas bubbles from the foaming agent. Lighter part, softer part."],
  ["viscoelastic", "Part spring, part honey: it springs back and it slowly gives."],
  ["surrogate", "A fast model standing in for a slow experiment. Learned from data, queried thousands of times."],
];
const words = `<dl class="words"><div class="words-h mono-s">WORDS ON THIS PAGE</div>${WORDS.map(([w, d]) => `<div><dt>${w}</dt><dd>${d}</dd></div>`).join("")}</dl>`;

const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><marker id="ah" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1.2L9 5L1 8.8" fill="none" style="stroke:var(--ink)" stroke-width="1.3" stroke-linejoin="round"/></marker></defs></svg>`;

const keep = [
  ["The loop is the product.", "Propose, predict, confirm in the lab, add the row, refit. Blends 10 and 11 are the model's own proposals that were then mixed and added back. That is active learning in one round, and it is the shape of an agent."],
  ["Error bars say when to go back to the lab.", "GPR returns a mean and a spread. A wide band over a candidate recipe is the model saying it is guessing."],
  ["Two models answering one question is a cheap sanity check.", "RSM, ANN and GPR land in the same region of recipe space. Disagreement is a flag."],
  ["The interpretable layer is how a formulator will trust it.", "RSM's effect ranking and the ANN's gradients give 'sulfur up, tan δ down', which a chemist can argue with."],
  ["Small design spaces need no clever optimiser.", "Three knobs on a discrete grid: enumerate everything, score everything, take the minimum in seconds."],
];
const doubt = [
  ["11 recipes is the real sample size.", "The 326 rows come from 11 recipes, so rows from one recipe are close cousins. The paper says 5-fold cross-validation and does not say folds were split by recipe. Taken at face value, R² = 1.00 and an error of about 6×10⁻⁵ on n_relax looks like memorising neighbours, not generalising to a new recipe. That is an inference from the setup, not a claim in the paper."],
  ["The proposals do not hit the target.", "σ_relax is on target for RSM and within 8 to 24 % for the others, but tan δ lands 49 to 73 % high and n_relax is 24 to 45 % off in every method. The models agree with each other more than with the target."],
  ["RSM's pick sits on the boundary and predicts nonsense.", "Void 30.0 is the upper bound of the search, and the predicted durometer is 0.45 Shore A, which is barely a solid. An optimiser exploiting the edge of a surrogate is exactly what to watch for in an agent."],
  ["Do not copy Table 4.", "The printed coefficients are rounded to two decimals. Evaluated by hand they give σ_relax ≈ 252 kPa for 2.5 pph sulfur, 80 pph oil, 0 % void, where Fig. 23 plots about 163. Refit from data."],
  ["One grade, three knobs, one frequency.", "Betapreno rubber, 150 °C cure, 1 Hz tests, sulfur 0.5 to 4 pph, oil 0 to 80 pph. Nothing here says it transfers to another grade or another temperature."],
  ["Some figures disagree with their own text.", "Fig. 24's legend has the two sulfur levels swapped against Figs. 22 and 23, and the sentence introducing Figs. 22 and 23 names them the other way round from their captions."],
];
const li = (rows) => rows.map(([h, t]) => `<li><b>${h}</b> ${t}</li>`).join("");

const SKETCH = `<pre class="code"><code># a sketch of the paper's pipeline, not the authors' code
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF
import numpy as np

X = recipes[["sulfur_pph", "paraffin_pph", "void_pct"]]      # 326 rows, 11 recipes
models = {y: GaussianProcessRegressor(RBF(), normalize_y=True).fit(X, df[y])
          for y in ["durometer", "sigma_relax", "n_relax", "tan_delta"]}

grid = np.array([(s, p, v) for s in np.arange(0.3, 4.05, 0.05)
                           for p in range(0, 81) for v in range(0, 41)])   # ~ their 6,600 after limits
mu = {y: m.predict(grid) for y, m in models.items()}
score = sum(w[y] * (mu[y] - target[y]) ** 2 for y in target)             # weighted distance
best = grid[score.argmin()]
# then: mix <best>, measure, append the row, refit. Groups: use GroupKFold by recipe.</code></pre>`;

const SOURCES = [
  ["Roman, Qin, Rodriguez, Gonzalez, Zavala, Osswald. Natural Rubber Blend Optimization via Data-Driven Modeling. Polymers 14(11), 2262 (2022)", M.PAPER.url],
  ["DOI 10.3390/polym14112262", M.PAPER.doi],
  ["scikit-learn: Gaussian processes", "https://scikit-learn.org/stable/modules/gaussian_process.html"],
];

const body = [
  defs,
  `<nav class="top mono-s"><a href="/">← all figures</a><span>RUBBER / DATA-DRIVEN FORMULATION</span><button type="button" data-theme-toggle>theme</button></nav>`,
  `<header><h1>Eleven rubber recipes, one model, a twelfth recipe on demand</h1><p class="dek">What a 2022 natural-rubber paper does, how its pieces work, and how an engineer can get the most out of reading it.</p></header>`,
  `<div class="prose lead"><p>This 2022 paper from the University of Wisconsin-Madison learns natural-rubber recipes from a very small experimental dataset, then runs the learned model backwards to propose a recipe for a target set of properties. It is a surrogate-modelling and inverse-design paper set in a rubber lab, and it reads best as one.</p><p>For an engineer the most useful order is: the inputs and outputs of the function being learned, how every row of data was produced, which model sits on which rung and what each costs, how the inverse step works, and then what the evidence does not support. The page follows that order. Every figure is redrawn; the numbers are the paper's. Where a value was read off a plot, the page says so. The last section lists all 34 of the paper's figures and what each one shows.</p></div>`,
  words,
  section("What problem is this?", p("A formulator picks sulfur, oil and a foaming level, bakes it, measures it, and tries again. Skill means fewer laps. The paper's claim is that you can learn a function f: recipe → properties from a small dataset, then run it backwards: say what you want, get a recipe to try first.")),
  fig("loops", "two loops", loops(), `<p class="cap-t">The left loop is a person. The right loop is the same loop with a model standing in for most of the laps.</p>`),
  section("What goes in, what comes out?", p("Three inputs, four outputs. The third input is the odd one: voids are not an ingredient. The recipe fixes the foaming agent at 8 pph, and the void fraction comes from how much compound goes into the mould. Move the knobs and read the arrows. They come from the paper's correlation matrix, so they are direction and strength only, not a predictor.")),
  fig("knobs", "knob board", knobBoard(), `<span class="readout" data-knob-read>sulfur 1.5 · oil 40 · voids 10</span><span class="cap-t">Arrows show the push relative to where the sliders started, weighted by the paper's Pearson r. They are direction and rough strength, not predictions.</span>`),
  section("Where does the data come from?", p("Seven stations. Steps 1 to 3 make the specimen; 4 to 7 turn it into four numbers. Click a station.")),
  fig("pipeline", "from compound to a row in a table", pipeline() + `<div class="step"><b data-st-title>1 Mix</b><span data-st-text></span></div>`, `<span class="cap-t">The paper reports 326 data instances from 11 blends. Fig. 10 shows one blend at ten void levels, which is where most of the multiplication comes from.</span>`),
  section("What do the four numbers mean?", p("These four are the whole target: in plain words, hardness, load, give and leak. Pick one and move its slider.")),
  fig("four", "the four measurements, and voids", fourNumbers(), `<span class="cap-t">Curves are drawn from the paper's formulas and fitted slopes. Stress values by void level are read off Fig. 11.</span>`),
  section("What do the knobs do?", p("Pearson's r is a number between −1 and 1: whether two columns move together. Read the bottom-left block: inputs against outputs. Hover a cell.")),
  fig("matrix", "correlation matrix, as printed", `<div class="stage"><svg class="flat" viewBox="0 0 560 420" data-matrix role="img" aria-label="Pearson correlation matrix of three inputs and four outputs"></svg></div><div class="verdict mx" data-matrix-read>hover a cell</div>`, `<span class="cap-t">Filled circle: the pair rises together. Hollow: one rises as the other falls. Size is |r|. The three inputs are almost uncorrelated with each other, which is what a decent experiment design looks like.</span>`),
  section("Why isn't a straight line enough?", p("Because the effects bend and saturate. Sulfur's effect on n_relax is mostly done by 1.5 pph. Going from 40 to 80 pph oil barely moves stiffness at 2.5 pph sulfur. And oil raises tan δ at one sulfur level and lowers it at another. That is the whole case for the next section.")),
  fig("bend", "three ways a straight line fails", `<div class="three" data-bend></div>`, `<span class="cap-t">Left: n_relax against sulfur, with the paper's error bars (Fig. 31). Middle: stress by oil (Figs. 20, 21). Right: tan δ by oil (Fig. 25). Values are read off the plots.</span>`),
  section("Same stiffness, two recipes", p("Both lines are stiffness lost to foam, at 80 pph oil. The 2.5 pph recipe starts stiffer and loses 4.4 kPa per percent of voids; the 1.5 pph recipe loses 2.1. At about 16 % void they meet. If an agent returns one recipe, there are others with the same measured property.")),
  fig("cross", "stress against void content", `<div class="stage"><svg class="flat" viewBox="0 0 760 340" data-cross role="img" aria-label="Maximum relaxation stress against void content for several recipes"></svg></div><div class="ctl"><span class="ctl-l">void</span><input type="range" min="0" max="35" step="0.5" value="16" data-cross-slider><output data-cross-out></output><span class="ctl-l">show</span><span class="chips" data-cross-chips></span></div>`, `<span class="readout" data-cross-read></span><span class="cap-t">Slopes are printed in the paper. Intercepts are read off Figs. 22 and 23 (±5 kPa). Fig. 24's legend is swapped in the paper; this follows Figs. 22 and 23 and the text.</span>`),
  section("Four models on one ladder", p("The authors fit the same data four ways, from least to most flexible. The accuracy rises with the flexibility, and the paper's pitch is that you can choose your rung: a cheap, readable one or an accurate, opaque one.")),
  fig("ladder", "cross-validated R², Table 7", ladder(), `<span class="cap-t">R² is the share of variance explained. 1.00 means a perfect line. See the second list at the bottom for why that 1.00 deserves a test before it is believed.</span>`),
  fig("ann", "what the neural network is", network(), `<span class="cap-t">Layer sizes and counts are Table 5. TensorFlow 2.0, Adam, mean absolute error, dropout and early stopping to hold off overfitting on so little data.</span>`),
  section("The model that draws its own doubt", p("The Gaussian process is the odd one out. Think of it as nearest-neighbour with a smooth kernel, plus an honest error bar that is tight near data and wide away from it. Click to add measurements and watch the band collapse around them. That band is how a model decides what experiment to run next.")),
  fig("gp", "gaussian process, live", gpPlay(), `<span class="cap-t">RBF kernel, same family as the paper's scikit-learn GPR. The shaded band is ±1.96 σ, the 95 % interval used in the paper's Fig. 34.</span>`),
  section("Run it backwards", p("The model maps recipe to properties. To get the recipe, the paper scores every candidate against the target and takes the best. With three knobs on a coarse grid that is about 6,600 candidates and takes seconds. If the space were larger, they turn to Bayesian optimisation.")),
  fig("reverse", "reverse engineering", `<div class="stage flatwrap">${reverse()}</div>`, `<span class="cap-t">The target came from a footwear material they characterised: σ_relax 90 kPa, n_relax −0.0527, tan δ 0.066.</span>`),
  fig("table6", "what each method proposed, Table 6", targetTable(), `<span class="cap-t">Percent error vs target is computed here from the printed numbers. The paper does not state it. A filled badge marks anything more than 20 % off.</span>`),
  section("What the evidence supports, and what it does not", p("The engineering reading: what carries over to a system that proposes recipes, and what to verify first.")),
  `<div class="two"><div><h3>Worth reusing</h3><ul class="bul">${li(keep)}</ul></div><div><h3>Check first</h3><ul class="bul">${li(doubt)}</ul></div></div>`,
  section("As code", p("A sketch of the paper's pipeline, not the authors' code. The change worth making is to split the folds by recipe, so the score says how the model does on a recipe it has not seen.")),
  SKETCH,
  section("Every figure in the paper, explained", p("The paper has 34 figures and 7 tables. Each figure is listed here in paper order with what it plots, how to read it and what it proves. Where this page already shows the same thing live, the card links to it.")),
  `<div class="pf-wrap">${paperFigures()}</div>`,
  `<footer><div class="mono-s">SOURCES</div><ul>${SOURCES.map(([t, u]) => `<li><a href="${u}">${t}</a></li>`).join("")}</ul><p>Everything on this page is redrawn from the paper's text, tables and plots; no figure image is reused. Values marked read were taken off the plots and are approximate. The model proposals and R² values are printed in Tables 6 and 7.</p></footer>`,
].join("\n");

// ───────────────────────────── assemble ─────────────────────────────
const face = (family, file) => `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${readFileSync(join(SIBLING, "fonts", file)).toString("base64")}) format("woff2");font-weight:400;font-style:normal;font-display:swap}\n`;
const CSS = face("Libron", "Libron-Regular.woff2") + face("Departure Mono", "DepartureMono-Regular.woff2") + face("Paper Mono", "PaperMono-Regular.woff2") + readFileSync(join(SIBLING, "fp.css"), "utf8") + readFileSync(join(HERE, "rb.css"), "utf8");
const THEME_INIT = `<script>try{var t=new URLSearchParams(location.search).get("theme")||localStorage.getItem("iso-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.body.dataset.theme=t}catch(e){}</script>`;
const THEME_TOGGLE = `document.querySelector("[data-theme-toggle]")?.addEventListener("click",()=>{const next=document.body.dataset.theme==="dark"?"light":"dark";document.body.dataset.theme=next;try{localStorage.setItem("iso-theme",next)}catch(e){}});`;
// live.js is plain browser code; the data and the Gaussian process are inlined from model.mjs so the page and the build never disagree
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const live = `const STATIONS=${JSON.stringify(STATIONS)};\nconst FOUR=${JSON.stringify(FOUR)};\n${modelSource}\n${readFileSync(join(HERE, "live.js"), "utf8")}`;
const page = k.pageHtml({
  title: "Eleven rubber recipes, one model",
  theme: "light",
  body: `${THEME_INIT}<style>${CSS}</style>${body}`,
  script: live + "\n" + THEME_TOGGLE,
  width: 1040,
});
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page);
console.log("wrote", OUT, `${(page.length / 1024).toFixed(0)} KB`, `${figCount} figures`);
