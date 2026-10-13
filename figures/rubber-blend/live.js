// The page's behaviour. build.mjs inlines model.mjs, STATIONS and FOUR above this file, so none of those are declared here.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NS = "http://www.w3.org/2000/svg";
const S = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };
const lin = (a, b, c, d) => (x) => c + ((x - a) * (d - c)) / (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (REDUCE) $$(".tok").forEach((e) => e.remove());
const seen = new WeakMap();
const whenVisible = (el, fn) => {
  if (!el) return;
  if (!("IntersectionObserver" in window)) return fn();
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { threshold: 0.2 });
  io.observe(el);
};
const onScreen = (el) => { const st = { on: false }; if (!("IntersectionObserver" in window)) { st.on = true; return st; } new IntersectionObserver((es) => { st.on = es.some((e) => e.isIntersecting); }, { threshold: 0.1 }).observe(el); return st; };
const chip = (parent, label, on, fn) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "chip"; b.textContent = label;
  if (on) b.setAttribute("data-on", "");
  b.addEventListener("click", () => fn(b));
  parent.appendChild(b);
  return b;
};
const radio = (btns, el) => btns.forEach((b) => (b === el ? b.setAttribute("data-on", "") : b.removeAttribute("data-on")));

// a labelled xy frame: returns the scales
function frame(svg, { px = 50, py = 16, pw = 370, ph = 216, xr, yr, xt = [], yt = [], xl = "", yl = "", fy = (v) => v, fx = (v) => v }) {
  const X = lin(xr[0], xr[1], px, px + pw), Y = lin(yr[0], yr[1], py + ph, py);
  yt.forEach((v) => { S("line", { class: "tk", x1: px, x2: px + pw, y1: Y(v), y2: Y(v) }, svg); const t = S("text", { class: "txt-c", x: px - 7, y: Y(v) + 3.5, "text-anchor": "end" }, svg); t.textContent = fy(v); });
  xt.forEach((v) => { S("line", { class: "ax", x1: X(v), x2: X(v), y1: py + ph, y2: py + ph + 4 }, svg); const t = S("text", { class: "txt-c", x: X(v), y: py + ph + 17, "text-anchor": "middle" }, svg); t.textContent = fx(v); });
  S("path", { class: "ax", d: `M${px} ${py}V${py + ph}H${px + pw}` }, svg);
  if (xl) { const t = S("text", { class: "txt-s", x: px + pw, y: py + ph + 34, "text-anchor": "end" }, svg); t.textContent = xl; }
  if (yl) { const t = S("text", { class: "txt-s", x: px, y: py - 5 }, svg); t.textContent = yl; }
  return { X, Y, px, py, pw, ph };
}
const draw = (svg, d, cls = "cv", delay = 0) => {
  const p = S("path", { class: cls, d, pathLength: 1 }, svg);
  if (!REDUCE) {
    p.style.strokeDasharray = "1 1"; p.style.strokeDashoffset = "1";
    requestAnimationFrame(() => requestAnimationFrame(() => { p.style.transition = `stroke-dashoffset 1.1s cubic-bezier(.32,.72,0,1) ${delay}s`; p.style.strokeDashoffset = "0"; }));
  }
  return p;
};
const polyline = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");

// ───────────────────────────── the knob board ─────────────────────────────
(() => {
  const root = $("#knobs");
  if (!root) return;
  const base = { s: 1.5, p: 40, v: 10 };
  const rows = { dur: PEARSON[3], sig: PEARSON[4], n: PEARSON[5], tan: PEARSON[6] };
  const words = { dur: ["softer", "harder"], sig: ["pushes less", "pushes more"], n: ["fades faster", "fades slower"], tan: ["less heat", "more heat"] };
  const base_text = Object.fromEntries(OUTPUTS.map((o) => [o.id, o.what]));
  const val = { ...base };
  const range = { s: [0.5, 4], p: [0, 80], v: [0, 40] };
  const slicer = $("[data-hl=\"slicer\"]", root);
  const update = () => {
    $$("[data-knob]", root).forEach((inp) => { val[inp.dataset.knob] = Number(inp.value); $(`[data-knob-out="${inp.dataset.knob}"]`, root).textContent = inp.dataset.knob === "s" ? Number(inp.value).toFixed(1) : inp.value; });
    if (slicer && slicer.__hl) slicer.__hl.set(clamp(val.v, 1, 40));
    for (const [id, r] of Object.entries(rows)) {
      const net = r[0] * (val.s - base.s) / (range.s[1] - range.s[0]) + r[1] * (val.p - base.p) / (range.p[1] - range.p[0]) + r[2] * (val.v - base.v) / (range.v[1] - range.v[0]);
      const li = $(`[data-out="${id}"]`, root), a = $("[data-arrow]", li), w = $(".o-what", li);
      const up = net > 0.015, down = net < -0.015;
      a.textContent = up ? "▲" : down ? "▼" : "·";
      a.style.opacity = up || down ? clamp(0.3 + Math.abs(net) * 2.4, 0.3, 1) : 0.4;
      w.textContent = base_text[id] + (up || down ? ` → ${words[id][up ? 1 : 0]}` : "");
    }
    const out = $("[data-knob-read]");
    if (out) out.textContent = `sulfur ${val.s.toFixed(1)} · oil ${val.p} · voids ${val.v}`;
  };
  root.addEventListener("input", update);
  update();
})();

// ───────────────────────────── the pipeline ─────────────────────────────
(() => {
  const st = $$("[data-st]");
  if (!st.length) return;
  const title = $("[data-st-title]"), text = $("[data-st-text]");
  let cur = 0, manual = false;
  const show = (i) => {
    cur = i;
    st.forEach((g, j) => (j === i ? g.setAttribute("data-on", "") : g.removeAttribute("data-on")));
    title.textContent = `${i + 1}  ${STATIONS[i].t} · ${STATIONS[i].s}`;
    text.textContent = STATIONS[i].d;
  };
  st.forEach((g, i) => {
    g.addEventListener("click", () => { manual = true; show(i); });
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); manual = true; show(i); } });
  });
  show(0);
  const vis = onScreen($("#pipeline"));
  if (!REDUCE) setInterval(() => { if (!manual && vis.on) show((cur + 1) % st.length); }, 4200);
})();

// ───────────────────────────── the four numbers ─────────────────────────────
(() => {
  const root = $("#four");
  if (!root) return;
  const svg = $("[data-four-svg]", root), slider = $("[data-four-slider]", root), out = $("[data-four-out]", root);
  const head = $("[data-four-head]", root), dev = $("[data-four-dev]", root), move = $("[data-four-move]", root), read = $("[data-four-read]", root);
  const tabs = $$("[data-four-tab]", root);
  const vis = onScreen(root);
  let cur = FOUR[0], value = {}, foam = false, phase = 0;
  FOUR.forEach((f) => (value[f.id] = f.v));
  const R = rng(11);
  const slice = Array.from({ length: 90 }, () => { const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 84; return { x: d * Math.cos(a), y: d * Math.sin(a), r: 2.5 + R() * 5.5 }; });
  const f2 = (v, d = 2) => Number(v).toFixed(d);
  let anim = null;

  function render() {
    clear(svg);
    anim = null;
    const v = value[cur.id];
    out.textContent = cur.id === "n" ? `${f2(v, 4)}` : cur.id === "tan" ? f2(v, 3) : `${v}${cur.unit}`;
    if (cur.id === "void") {
      const F = frame(svg, { px: 60, py: 24, pw: 340, ph: 200, xr: [0, 40], yr: [60, 240], xt: [0, 10, 20, 30, 40], yt: [80, 120, 160, 200, 240], xl: "VOID %", yl: "MAX STRESS kPa" });
      S("path", { class: "cv", d: `M${F.X(0)} ${F.Y(218)}L${F.X(40)} ${F.Y(218 - 3.3 * 40)}` }, svg);
      S("circle", { class: "pt", cx: F.X(v), cy: F.Y(218 - 3.3 * v), r: 4.5 }, svg);
      read.textContent = `voids ${v} %  →  max stress ≈ ${Math.round(218 - 3.3 * v)} kPa. About −3.3 kPa per 1 %, R² 0.97 (blend 1, Fig. 11).`;
    } else if (cur.id === "dur") {
      const H = 14.7 - 0.28 * v;
      const cx = 220, cy = 210, rad = 150, a0 = Math.PI, ang = (s) => a0 + (s / 100) * Math.PI;
      const pt = (s, r) => [cx + r * Math.cos(ang(s)), cy + r * Math.sin(ang(s))];
      S("path", { class: "ax", d: `M${pt(0, rad)}A${rad} ${rad} 0 0 1 ${pt(100, rad)}`.replace(/,/g, " ") }, svg);
      for (let s = 0; s <= 100; s += 10) { const a = pt(s, rad), b = pt(s, rad - (s % 50 === 0 ? 14 : 8)); S("line", { class: "ax", x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, svg); const t = pt(s, rad - 28); const tx = S("text", { class: "txt-c", x: t[0], y: t[1] + 3, "text-anchor": "middle" }, svg); tx.textContent = s; }
      S("path", { class: "band", d: `M${pt(7, rad - 4)}A${rad - 4} ${rad - 4} 0 0 1 ${pt(28, rad - 4)}L${pt(28, rad - 40)}A${rad - 40} ${rad - 40} 0 0 0 ${pt(7, rad - 40)}Z`.replace(/,/g, " ") }, svg);
      const n = pt(H, rad - 12);
      S("line", { class: "ax", x1: cx, y1: cy, x2: n[0], y2: n[1], style: "stroke-width:2" }, svg);
      S("circle", { class: "pt", cx, cy, r: 6 }, svg);
      const t = S("text", { class: "txt-s", x: cx, y: cy + 34, "text-anchor": "middle" }, svg); t.textContent = "SHORE A · shaded: the paper's samples";
      read.textContent = `voids ${v} %  →  ${f2(H, 1)} Shore A. Each 1 % of voids costs about 0.28 Shore A (Fig. 15 series, 1.5 pph sulfur).`;
    } else if (cur.id === "sig") {
      const F = frame(svg, { px: 56, py: 16, pw: 360, ph: 210, xr: [0, 600], yr: [100, 230], xt: [0, 200, 400, 600], yt: [100, 150, 200], xl: "TIME s", yl: "STRESS kPa" });
      const curve = (vv) => { const s0 = 218 - 3.3 * vv, pts = []; for (let t = 0; t <= 600; t += 10) pts.push([F.X(t), F.Y(s0 * Math.pow(Math.max(t, 10) / 10, -0.0074))]); return polyline(pts); };
      [0, 6.4, 12.7, 14.7, 17.4, 22, 24.2].forEach((vv) => S("path", { class: "cv faint", d: curve(vv) }, svg));
      draw(svg, curve(v), "cv");
      read.textContent = `voids ${v} %  →  starts near ${Math.round(218 - 3.3 * v)} kPa and drifts down about 3 % in ten minutes. Faint curves are the other void levels (levels from Fig. 11; decay drawn as an idealised power law).`;
    } else if (cur.id === "n") {
      const F = frame(svg, { px: 56, py: 16, pw: 360, ph: 210, xr: [0, 600], yr: [0.8, 1.0], xt: [0, 200, 400, 600], yt: [0.8, 0.9, 1.0], xl: "TIME s", yl: "STRESS / START" });
      const c = (n) => { const pts = []; for (let t = 1; t <= 600; t += 6) pts.push([F.X(t), F.Y(Math.pow(t, -n))]); return polyline(pts); };
      N_VS_SULFUR.forEach((d) => { S("path", { class: "cv alt", d: c(-d.n) }, svg); const t = S("text", { class: "txt-c", x: F.X(600) - 4, y: F.Y(Math.pow(600, d.n)) - 5, "text-anchor": "end" }, svg); t.textContent = `${d.s} pph S`; });
      draw(svg, c(v), "cv");
      const end = Math.pow(600, -v);
      read.textContent = `|n| = ${f2(v, 4)}  →  ${f2(end * 100, 1)} % of the starting stress is left after 10 minutes. Dashed: the paper's measured n at 0.5, 1.5 and 2.5 pph sulfur (Fig. 31). It never reaches 1 %: that takes hours.`;
    } else if (cur.id === "tan") {
      const d = Math.atan(v), cx = 150, cy = 140, h = 104;
      S("line", { class: "tk", x1: cx - h - 8, x2: cx + h + 8, y1: cy, y2: cy }, svg);
      S("line", { class: "tk", y1: cy - h - 8, y2: cy + h + 8, x1: cx, x2: cx }, svg);
      const pts = [];
      const ys = (t) => { const u = Math.cos(t - d); return foam ? (u + 0.35 * u * u * u) / 1.35 : u; };
      for (let i = 0; i <= 160; i++) { const t = (i / 160) * Math.PI * 2; pts.push([cx + h * Math.cos(t), cy - h * ys(t)]); }
      S("path", { class: "cv", d: polyline(pts) + "Z" }, svg);
      const dot = S("circle", { class: "pt", r: 4.5, cx, cy }, svg);
      const t1 = S("text", { class: "txt-s", x: cx + h + 6, y: cy - 6, "text-anchor": "end" }, svg); t1.textContent = "STRAIN";
      const t2 = S("text", { class: "txt-s", x: cx + 6, y: cy - h - 12 }, svg); t2.textContent = "STRESS";
      // storage vs loss bars
      S("rect", { class: "bar lite", x: 300, y: 40, width: 110, height: 14 }, svg);
      S("rect", { class: "bar", x: 300, y: 40, width: 110, height: 14 }, svg);
      S("rect", { class: "bar lite", x: 300, y: 92, width: 110, height: 14 }, svg);
      S("rect", { class: "bar", x: 300, y: 92, width: Math.max(1.5, 110 * v), height: 14 }, svg);
      const a = S("text", { class: "txt", x: 300, y: 33 }, svg); a.textContent = "E′ storage";
      const b = S("text", { class: "txt", x: 300, y: 85 }, svg); b.textContent = "E″ loss = heat";
      const c = S("text", { class: "txt-c", x: 300, y: 126 }, svg); c.textContent = `loss / storage = ${f2(v, 3)}`;
      anim = (dt) => { phase += dt * 1.1; const tt = phase % (Math.PI * 2); dot.setAttribute("cx", (cx + h * Math.cos(tt)).toFixed(1)); dot.setAttribute("cy", (cy - h * ys(tt)).toFixed(1)); };
      read.textContent = `tan δ ${f2(v, 3)}  →  phase lag δ = ${f2((d * 180) / Math.PI, 1)}°. The loop's width is the lag: ${foam ? "this foam-like stress bends the loop (stiffer at the ends), the shape in Fig. 2b." : "the raw rubber's loop is close to a clean ellipse, as in Fig. 2a."}`;
    }
  }
  function select(id) {
    cur = FOUR.find((f) => f.id === id);
    radio(tabs, tabs.find((b) => b.dataset.fourTab === id));
    head.textContent = cur.head; dev.textContent = cur.dev; move.textContent = cur.move;
    slider.min = cur.lo; slider.max = cur.hi; slider.step = cur.step; slider.value = value[cur.id];
    $$(".foam-chip", root).forEach((c) => c.remove());
    if (cur.id === "tan") {
      const c = chip($(".four-side", root), foam ? "foam shoe-like: on" : "foam shoe-like: off", foam, (b) => { foam = !foam; b.textContent = foam ? "foam shoe-like: on" : "foam shoe-like: off"; foam ? b.setAttribute("data-on", "") : b.removeAttribute("data-on"); render(); });
      c.classList.add("foam-chip");
    }
    render();
  }
  tabs.forEach((b) => b.addEventListener("click", () => select(b.dataset.fourTab)));
  slider.addEventListener("input", () => { value[cur.id] = Number(slider.value); render(); });
  select("void");
  let last = performance.now();
  const loop = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (anim && vis.on && !REDUCE && !document.hidden) anim(dt); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
})();

// ───────────────────────────── the correlation matrix ─────────────────────────────
(() => {
  const svg = $("[data-matrix]");
  if (!svg) return;
  const read = $("[data-matrix-read]");
  const C = 52, ox = 96, oy = 14;
  const kind = (i) => (i < 3 ? "in" : "out");
  const strength = (a) => (a >= 0.7 ? "strong" : a >= 0.4 ? "moderate" : a >= 0.2 ? "weak" : "almost no");
  const sentence = (i, j) => {
    const r = PEARSON[i][j];
    if (i === j) return `${VARS[i]} against itself: always 1.`;
    const a = VARS[i], b = VARS[j], s = strength(Math.abs(r));
    const tail = [];
    if (kind(i) === "in" && kind(j) === "in") return `${a} against ${b}: r = ${r}. The inputs were varied almost independently, so a model can tell their effects apart.`;
    if (kind(i) === "out" && kind(j) === "out") {
      if (a === "n_relax" && b === "tan δ" || b === "n_relax" && a === "tan δ") return `n_relax against tan δ: r = ${r}. Almost the same signal read two ways: whatever predicts one predicts the other.`;
      return `${a} against ${b}: r = ${r}. ${s === "almost no" ? "Barely related." : `A ${s} link: they ${r > 0 ? "rise" : "move opposite"} together.`}`;
    }
    const input = kind(i) === "in" ? a : b, output = kind(i) === "in" ? b : a;
    if (s === "almost no") return `${input} against ${output}: r = ${r}. Almost no straight-line link. A curve might still hide in there.`;
    const dir = r > 0 ? "goes up" : "goes down";
    const extra = output === "n_relax" ? " (n_relax is a negative number, so up means a slower fade)." : ".";
    return `${input} against ${output}: r = ${r}. A ${s} link: more ${input}, ${output} ${dir}${extra}`;
  };
  // frame around the inputs-by-outputs block
  S("rect", { x: ox, y: oy + 3 * C, width: 3 * C, height: 4 * C, fill: "none", stroke: "currentColor", "stroke-width": 1, "stroke-dasharray": "4 3" }, svg);
  VARS.forEach((v, i) => {
    const t = S("text", { class: "txt", x: ox - 10, y: oy + i * C + C / 2 + 3.5, "text-anchor": "end" }, svg); t.textContent = v;
    const u = S("text", { class: "txt", x: ox + i * C + C / 2, y: oy + 7 * C + 18, "text-anchor": "middle" }, svg); u.textContent = v;
    u.setAttribute("transform", `rotate(-28 ${ox + i * C + C / 2} ${oy + 7 * C + 18})`);
  });
  const cells = [];
  PEARSON.forEach((row, i) => row.forEach((r, j) => {
    const g = S("g", { class: "cell", tabindex: 0 }, svg), cx = ox + j * C + C / 2, cy = oy + i * C + C / 2;
    S("rect", { x: ox + j * C, y: oy + i * C, width: C, height: C }, g);
    if (i === j) S("circle", { cx, cy, r: 2, class: "pt" }, g);
    else {
      S("circle", { cx, cy: cy - 7, r: 2.5 + 14 * Math.abs(r), class: r >= 0 ? "pt" : "pt o" }, g);
      const t = S("text", { class: "txt-c", x: cx, y: cy + 21, "text-anchor": "middle" }, g);
      t.textContent = String(r).replace("-", "−");
    }
    const on = () => { cells.forEach((c) => c.removeAttribute("data-on")); g.setAttribute("data-on", ""); read.textContent = sentence(i, j); };
    g.addEventListener("mouseenter", on); g.addEventListener("focus", on); g.addEventListener("click", on);
    cells.push(g);
  }));
  read.textContent = sentence(6, 0);
  cells[PEARSON.slice(0, 6).reduce((n, r) => n + r.length, 0)].setAttribute("data-on", "");
})();

// ───────────────────────────── three ways a straight line fails ─────────────────────────────
(() => {
  const host = $("[data-bend]");
  if (!host) return;
  const mk = (title) => { const w = document.createElement("div"); const h = document.createElement("h4"); h.textContent = title; w.appendChild(h); const s = S("svg", { viewBox: "0 0 280 244", role: "img", "aria-label": title }); w.appendChild(s); host.appendChild(w); return s; };
  // a: n_relax vs sulfur, error bars
  {
    const s = mk("n_relax against sulfur");
    const F = frame(s, { px: 54, py: 14, pw: 200, ph: 160, xr: [0, 3], yr: [-0.035, -0.005], xt: [0.5, 1.5, 2.5], yt: [-0.03, -0.02, -0.01], xl: "SULFUR pph", fy: (v) => v.toFixed(2) });
    draw(s, polyline(N_VS_SULFUR.map((d) => [F.X(d.s), F.Y(d.n)])), "cv");
    N_VS_SULFUR.forEach((d) => { S("line", { class: "ax", x1: F.X(d.s), x2: F.X(d.s), y1: F.Y(d.n - d.e), y2: F.Y(d.n + d.e) }, s); S("circle", { class: "pt", cx: F.X(d.s), cy: F.Y(d.n), r: 3.5 }, s); });
    const t = S("text", { class: "txt-c", x: 54, y: 232 }, s); t.textContent = "most of the change is done by 1.5 pph";
  }
  // b: stress vs oil, two sulfur levels
  {
    const s = mk("start stress against paraffin oil");
    const F = frame(s, { px: 54, py: 14, pw: 200, ph: 160, xr: [0, 100], yr: [100, 680], xt: [20, 40, 80], yt: [200, 400, 600], xl: "OIL pph" });
    const line = (arr, cls) => { draw(s, polyline(arr.map((d) => [F.X(d.p), F.Y(d.y)])), cls); arr.forEach((d) => S("circle", { class: cls === "cv" ? "pt" : "pt o", cx: F.X(d.p), cy: F.Y(d.y), r: 3.5 }, s)); };
    line(SAT.s25, "cv"); line(SAT.s15, "cv alt");
    const a = S("text", { class: "txt-c", x: F.X(22), y: F.Y(655) - 6 }, s); a.textContent = "2.5 pph S";
    const b = S("text", { class: "txt-c", x: F.X(48), y: F.Y(300) }, s); b.textContent = "1.5 pph S";
    const t = S("text", { class: "txt-c", x: 54, y: 232 }, s); t.textContent = "at 2.5 pph, 40 ≈ 80 pph oil";
  }
  // c: tan δ vs oil, bars
  {
    const s = mk("tan δ against paraffin oil");
    const F = frame(s, { px: 54, py: 14, pw: 200, ph: 160, xr: [0, 100], yr: [0, 0.04], xt: [20, 40, 50, 80], yt: [0.01, 0.02, 0.03, 0.04], xl: "OIL pph", fy: (v) => v.toFixed(2) });
    const bar = (d, cls, dx) => { const x = F.X(d.p) + dx, y = F.Y(d.y); S("rect", { class: cls, x, y, width: 12, height: F.Y(0) - y }, s); };
    TAN_VS_OIL.s15.forEach((d) => bar(d, "bar", -13)); TAN_VS_OIL.s25.forEach((d) => bar(d, "bar lite", 1));
    const t = S("text", { class: "txt-c", x: 54, y: 226 }, s); t.textContent = "filled 1.5 pph S: up, then down";
    const t2 = S("text", { class: "txt-c", x: 54, y: 238 }, s); t2.textContent = "hollow 2.5 pph S: up";
  }
})();

// ───────────────────────────── same stiffness, two recipes ─────────────────────────────
(() => {
  const svg = $("[data-cross]");
  if (!svg) return;
  const slider = $("[data-cross-slider]"), out = $("[data-cross-out]"), read = $("[data-cross-read]"), chips = $("[data-cross-chips]");
  let all = false;
  const F = frame(svg, { px: 56, py: 16, pw: 680, ph: 270, xr: [0, 35], yr: [40, 330], xt: [0, 5, 10, 15, 20, 25, 30, 35], yt: [50, 100, 150, 200, 250, 300], xl: "VOID CONTENT %", yl: "MAX STRESS kPa" });
  const g = S("g", {}, svg);
  const label = (l) => `${l.s} pph S · ${l.p} pph oil`;
  const yAt = (l, v) => l.y0 + l.k * v;
  function render() {
    clear(g);
    const v = Number(slider.value);
    out.textContent = `${v} %`;
    const pair = ["c", "e"];
    VOID_LINES.forEach((l) => {
      if (!all && !pair.includes(l.id)) return;
      const hi = pair.includes(l.id);
      S("path", { class: hi ? "cv" : "cv faint", d: `M${F.X(0)} ${F.Y(l.y0)}L${F.X(35)} ${F.Y(yAt(l, 35))}`, style: hi && l.id === "c" ? "stroke-dasharray:6 3" : "" }, g);
      const t = S("text", { class: "txt-c", x: F.X(0) + 6, y: F.Y(l.y0) - 6 }, g); t.textContent = label(l);
      S("circle", { class: "pt", cx: F.X(v), cy: F.Y(yAt(l, v)), r: hi ? 4.5 : 3 }, g);
    });
    S("line", { class: "guide", x1: F.X(v), x2: F.X(v), y1: F.py, y2: F.py + F.ph }, g);
    const cx = (163 - 125) / (4.4 - 2.1), cy = 163 - 4.4 * cx;
    S("circle", { class: "pt o", cx: F.X(cx), cy: F.Y(cy), r: 8 }, g);
    const t = S("text", { class: "txt", x: F.X(cx) + 14, y: F.Y(cy) - 8 }, g); t.textContent = `same stiffness, ${cx.toFixed(1)} % void, ${Math.round(cy)} kPa`;
    const c = VOID_LINES.find((l) => l.id === "e"), a = VOID_LINES.find((l) => l.id === "c");
    read.textContent = `at ${v} % void: ${label(c)} → ${Math.round(yAt(c, v))} kPa · ${label(a)} → ${Math.round(yAt(a, v))} kPa`;
  }
  const b1 = chip(chips, "the 80 pph pair", true, (b) => { all = false; radio([b1, b2], b); render(); });
  const b2 = chip(chips, "all five lines", false, (b) => { all = true; radio([b1, b2], b); render(); });
  chips.classList.add("sm");
  slider.addEventListener("input", render);
  render();
})();

// ───────────────────────────── the ladder ─────────────────────────────
(() => {
  const root = $(".ladder");
  if (!root) return;
  const btns = $$("[data-r2-prop]");
  let prop = "n", started = false;
  const set = () => MODELS.forEach((m) => {
    const row = $(`[data-rung="${m.id}"]`, root), v = R2[prop][m.id];
    $("[data-bar]", row).style.width = started ? `${v * 100}%` : "0%";
    $("[data-val]", row).textContent = v.toFixed(2);
  });
  btns.forEach((b) => b.addEventListener("click", () => { prop = b.dataset.r2Prop; radio(btns, b); set(); }));
  set();
  whenVisible(root, () => { started = true; set(); });
})();

// ───────────────────────────── the network ─────────────────────────────
(() => {
  const svg = $("[data-ann-svg]");
  if (!svg) return;
  const btns = $$("[data-ann-prop]");
  const title = $("[data-ann-title]"), text = $("[data-ann-text]");
  const vis = onScreen(svg);
  let layerEls = [], tick = 0, timer = null;
  const render = (prop) => {
    clear(svg);
    const cfg = ANN[prop], o = OUTPUTS.find((x) => x.id === prop);
    const sizes = [3, ...cfg.layers, 1];
    const x = (i) => 90 + i * ((580 - 0) / (sizes.length - 1));
    const MAXSHOW = 7;
    const pos = sizes.map((n, i) => {
      const show = Math.min(n, MAXSHOW), gap = 230 / (MAXSHOW + 1) * (n > MAXSHOW ? 1 : 1);
      return Array.from({ length: show }, (_, k) => ({ x: x(i), y: 150 + (k - (show - 1) / 2) * 34 }));
    });
    layerEls = pos.map(() => []);
    for (let i = 0; i < pos.length - 1; i++) pos[i].forEach((a) => pos[i + 1].forEach((b) => S("line", { class: "tk", x1: a.x, y1: a.y, x2: b.x, y2: b.y }, svg)));
    pos.forEach((layer, i) => {
      layer.forEach((p, k) => { layerEls[i].push(S("circle", { class: i === 0 || i === sizes.length - 1 ? "pt" : "box", cx: p.x, cy: p.y, r: 9 }, svg)); });
      if (sizes[i] > MAXSHOW) { const t = S("text", { class: "txt-c", x: x(i), y: 150 + (MAXSHOW / 2) * 34 + 8, "text-anchor": "middle" }, svg); t.textContent = `… ${sizes[i]} neurons`; }
    });
    ["sulfur", "paraffin", "voids"].forEach((n, k) => { const t = S("text", { class: "txt", x: 74, y: pos[0][k].y + 3.5, "text-anchor": "end" }, svg); t.textContent = n; });
    const t = S("text", { class: "txt", x: x(sizes.length - 1) + 16, y: 153.5 }, svg); t.textContent = o.sym;
    sizes.forEach((n, i) => { const t = S("text", { class: "txt-s", x: x(i), y: 22, "text-anchor": "middle" }, svg); t.textContent = i === 0 ? "INPUT" : i === sizes.length - 1 ? "OUTPUT" : `HIDDEN ${i}`; });
    const hid = cfg.layers.join(" × ");
    title.textContent = `${o.sym}: 3 → ${cfg.layers.join(" → ")} → 1`;
    const terms = []; let n = 3;
    cfg.layers.forEach((h) => { terms.push(`(${n}×${h}+${h})`); n = h; });
    terms.push(`(${n}×1+1)`);
    text.textContent = `${terms.join(" + ")} = ${annParams(cfg.layers)} learnable numbers (Table 5 says ${cfg.params}). Adam, learning rate ${cfg.lr}, mean absolute error. Each pulse is one forward pass.`;
  };
  const pulse = () => {
    if (!vis.on || REDUCE) return;
    layerEls.forEach((l, i) => l.forEach((e) => { e.style.transition = "fill .25s"; e.style.fill = i === tick % layerEls.length ? "var(--ink)" : ""; }));
    tick += 1;
  };
  btns.forEach((b) => b.addEventListener("click", () => { radio(btns, b); render(b.dataset.annProp); }));
  render("dur");
  timer = setInterval(pulse, 600);
})();

// ───────────────────────────── the Gaussian process playground ─────────────────────────────
(() => {
  const svg = $("[data-gp-svg]");
  if (!svg) return;
  const read = $("[data-gp-read]");
  const W = 760, H = 300, pad = { l: 40, r: 16, t: 14, b: 26 };
  const X = lin(-2, 2, pad.l, W - pad.r), Y = lin(-4.5, 4.5, H - pad.b, pad.t);
  const unX = lin(pad.l, W - pad.r, -2, 2), unY = lin(H - pad.b, pad.t, -4.5, 4.5);
  const seed = () => [{ x: -0.2, y: 0.8 }, { x: -0.05, y: 1.15 }, { x: 0.05, y: 1.7 }];
  let pts = seed();
  const xs = Array.from({ length: 121 }, (_, i) => -2 + (i / 120) * 4);
  const SF = 1.4;
  const R = rng(5);
  const render = () => {
    clear(svg);
    [-4, -2, 0, 2, 4].forEach((v) => { S("line", { class: "tk", x1: pad.l, x2: W - pad.r, y1: Y(v), y2: Y(v) }, svg); const t = S("text", { class: "txt-c", x: pad.l - 6, y: Y(v) + 3.5, "text-anchor": "end" }, svg); t.textContent = v; });
    [-2, -1, 0, 1, 2].forEach((v) => { const t = S("text", { class: "txt-c", x: X(v), y: H - 8, "text-anchor": "middle" }, svg); t.textContent = v; });
    const post = gp(pts, xs, { length: 0.7, noise: 1e-4 });
    const up = post.map((q, i) => [X(xs[i]), Y(q.m + 1.96 * q.sd * SF)]);
    const dn = post.map((q, i) => [X(xs[i]), Y(q.m - 1.96 * q.sd * SF)]).reverse();
    S("path", { class: "band", d: polyline([...up, ...dn]) + "Z" }, svg);
    S("path", { class: "cv", d: polyline(post.map((q, i) => [X(xs[i]), Y(q.m)])) }, svg);
    pts.forEach((p) => S("circle", { class: "pt", cx: X(p.x), cy: Y(p.y), r: 4 }, svg));
    const widest = post.reduce((a, q, i) => (q.sd > a.sd ? { sd: q.sd, x: xs[i] } : a), { sd: 0, x: 0 });
    read.textContent = `${pts.length} points · widest 95 % band ±${(1.96 * widest.sd * SF).toFixed(1)} at x = ${widest.x.toFixed(1)}`;
  };
  const add = (x, y) => { pts.push({ x: clamp(x, -2, 2), y: clamp(y, -4.4, 4.4) }); render(); };
  svg.addEventListener("click", (e) => { const r = svg.getBoundingClientRect(), sx = W / r.width; add(unX((e.clientX - r.left) * sx), unY((e.clientY - r.top) * sx)); });
  svg.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const x = -2 + R() * 4; add(x, hidden(x)); } });
  const hidden = (x) => 1.9 * Math.sin(1.7 * x) * Math.exp(-0.12 * x * x) + (R() - 0.5) * 0.3;
  $("[data-gp-reset]").addEventListener("click", () => { pts = seed(); render(); });
  $("[data-gp-fill]").addEventListener("click", () => { for (let i = 0; i < 5; i++) { const x = -2 + R() * 4; pts.push({ x, y: hidden(x) }); } render(); });
  render();
})();

// ───────────────────────────── reverse engineering: the grid scan ─────────────────────────────
(() => {
  const g = $("[data-grid]");
  if (!g) return;
  const svg = g.ownerSVGElement;
  const cols = 44, rows = 20, cw = 300 / (cols + 1), rh = 150 / (rows + 1);
  const bowl = (c, r) => ((c / cols - 0.62) ** 2 + (r / rows - 0.42) ** 2);
  const dots = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) dots.push({ e: S("circle", { class: "pt", cx: 30 + (c + 1) * cw, cy: 46 + (r + 1) * rh, r: 1.5, opacity: 0.25 }, g), s: bowl(c, r), c });
  const best = dots.reduce((a, d) => (d.s < a.s ? d : a), dots[0]);
  const mark = S("circle", { class: "pt o", cx: best.e.getAttribute("cx"), cy: best.e.getAttribute("cy"), r: 7, opacity: 0 }, g);
  let col = 0, hold = 0;
  const vis = onScreen(svg);
  const step = () => {
    if (!vis.on || REDUCE) return;
    if (hold > 0) { hold -= 1; return; }
    dots.forEach((d) => { if (d.c === col) { d.e.setAttribute("opacity", String(clamp(1 - d.s * 2.2, 0.2, 1))); d.e.setAttribute("r", String(1.5 + clamp(1 - d.s * 2, 0, 1) * 1.5)); } });
    col += 1;
    if (col >= cols) { mark.setAttribute("opacity", "1"); col = 0; hold = 14; setTimeout(() => { dots.forEach((d) => { d.e.setAttribute("opacity", "0.25"); d.e.setAttribute("r", "1.5"); }); mark.setAttribute("opacity", "0"); }, 2600); }
  };
  if (REDUCE) { dots.forEach((d) => d.e.setAttribute("opacity", String(clamp(1 - d.s * 2.2, 0.2, 1)))); mark.setAttribute("opacity", "1"); }
  else setInterval(step, 90);
})();
