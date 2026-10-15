// The flat panels under the machine. Every number comes from model.mjs, so the drawings and the
// arithmetic cannot disagree. Big drawings, very few words.
import * as MM from "./model.mjs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f = (n) => (Math.round(n * 10) / 10).toString();
const T = (x, y, text, { c = "lbl", a = "start", s = 0 } = {}) => `<text class="${c}" x="${f(x)}" y="${f(y)}" text-anchor="${a}"${s ? ` style="font-size:${s}px"` : ""}>${esc(text)}</text>`;
const Rc = (x, y, w, h, { c = "box", rx = 0 } = {}) => `<rect class="${c}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${rx ? ` rx="${rx}"` : ""}/>`;
const Ln = (x1, y1, x2, y2, c = "ln") => `<line class="${c}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
const Pa = (d, c = "ln") => `<path class="${c}" d="${d}"/>`;
const Ci = (x, y, r, c = "solid") => `<circle class="${c}" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;
// a straight arrow with its own head: no marker defs needed
const Ar = (x1, y1, x2, y2, c = "ln") => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 7;
  const p1 = [x2 - h * Math.cos(a - 0.42), y2 - h * Math.sin(a - 0.42)];
  const p2 = [x2 - h * Math.cos(a + 0.42), y2 - h * Math.sin(a + 0.42)];
  return Pa(`M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`, c) + `<path class="solid" d="M${f(x2)} ${f(y2)}L${f(p1[0])} ${f(p1[1])}L${f(p2[0])} ${f(p2[1])}Z"/>`;
};
const svg = (w, h, body, label) => `<svg class="flat" viewBox="0 0 ${w} ${h}" width="${w}" role="img" aria-label="${esc(label)}">${body}</svg>`;

// ── 1 · what a harness is: the seven parts around one loop ──────────────────
export function anatomy(M = MM) {
  const W = 860;
  const H = 528;
  const CX = 430;
  const CY = 272;
  const R = 112;
  const R2 = 182;
  const parts = [
    ["1 · budget", "stop after 30 turns", "big: token and dollar caps"],
    ["2 · context guard", "clip output over 10k chars", "big: compaction, summaries"],
    ["3 · permissions", "allow, deny, or ask", "big: rule files, modes"],
    ["4 · sandbox", "file tools stay in the start dir", "big: containers, egress rules"],
    ["5 · context", "AGENTS.md on every request", "big: nested files, skills, memory"],
    ["6 · recovery", "transcript.jsonl, --resume", "big: durable sessions, rewind"],
    ["7 · loop", "tools run, results in one message", "big: parallel tools, subagents"],
  ];
  const b = [];
  b.push(`<circle class="ln" cx="${CX}" cy="${CY}" r="${R}" fill="none"/>`);
  b.push(Ci(CX, CY, 54, "box soft"));
  b.push(T(CX, CY - 2, "the model", { a: "middle", s: 13 }));
  b.push(T(CX, CY + 16, "tools in a loop", { a: "middle", c: "lbl-c" }));
  parts.forEach(([name, does, big], i) => {
    const th = (-90 + (i * 360) / 7) * (Math.PI / 180);
    const ax = CX + R2 * Math.cos(th);
    const ay = CY + R2 * Math.sin(th);
    const px = CX + R * Math.cos(th);
    const py = CY + R * Math.sin(th);
    const ux = (ax - px) / R2;
    const uy = (ay - py) / R2;
    b.push(Ln(px + ux * 41, py + uy * 41, px + ux * 66, py + uy * 66, "ln2"));
    b.push(Ci(px, py, 3.4));
    const a = i === 0 ? "middle" : i >= 1 && i <= 3 ? "start" : "end";
    const caps = i === 0 ? "uppercase" : "none";
    const y0 = ay - 10;
    b.push(T(ax, y0, name, { a, s: 12.5 }));
    b.push(T(ax, y0 + 16, does, { a, c: "lbl-c" }));
    b.push(T(ax, y0 + 30, big, { a, c: "lbl-s", s: 9 }));
  });
  // three chevrons riding the ring clockwise
  [66, 186, 306].forEach((deg) => {
    const p = (d) => [(CX + R * Math.cos((d * Math.PI) / 180)).toFixed(1), (CY + R * Math.sin((d * Math.PI) / 180)).toFixed(1)];
    const [x1, y1] = p(deg - 7);
    const [x2, y2] = p(deg + 7);
    b.push(Ar(Number(x1), Number(y1), Number(x2), Number(y2)));
  });
  return svg(W, H, b.join(""), "The seven parts of a minimal agent harness, arranged around the model's tool loop: budget, context guard, permissions, sandbox, context, recovery, loop.");
}

// ── 2 · the measurements: same weights, different harness ───────────────────
export function spread(M = MM) {
  const W = 860;
  const H = 360;
  const X0 = 250;
  const X1 = 790;
  const x = (v) => X0 + ((X1 - X0) * v) / 100;
  const b = [];
  [0, 25, 50, 75, 100].forEach((g) => {
    b.push(Ln(x(g), 76, x(g), 286, "grid"));
    b.push(T(x(g), 302, `${g}%`, { a: "middle", c: "lbl-c" }));
  });
  M.REPO.spread.forEach(([bench, sub, lo, hi], i) => {
    const y = 96 + i * 50;
    b.push(T(238, y - 2, bench, { a: "end", s: 12 }));
    b.push(T(238, y + 13, sub, { a: "end", c: "lbl-c" }));
    b.push(Rc(x(lo), y - 6, x(hi) - x(lo), 12, { c: "box soft" }));
    b.push(Ln(x(lo), y - 6, x(hi), y - 6));
    b.push(Ci(x(lo), y, 4.5, "box nofill"));
    b.push(Ci(x(hi), y, 5.5));
    b.push(T(x(lo) - 10, y + 4, `${f(lo)}%`, { a: "end" }));
    b.push(T(x(hi) + 10, y + 4, `${f(hi)}%`));
  });
  b.push(T(64, 338, `rank correlation between harness rankings across models ≈ ${M.REPO.rankTransfer}: the pick is a pairing, re-asked whenever the model changes`, { c: "lbl-c" }));
  return svg(W, H, b.join(""), `Four published measurements where changing only the harness moved pass rates: ARC-AGI-3 ${M.REPO.spread[0][2]}% to ${M.REPO.spread[0][3]}%, SWE-bench Pro 23% to 52% and 15% to 36%, Cursor 46% to 80%.`);
}

// ── 3 · the field: one dot per ranked project ───────────────────────────────
export function landscape(M = MM) {
  const W = 860;
  const H = 460;
  const b = [];
  b.push(T(64, 78, `${M.REPO.ranked}`, { s: 26 }));
  b.push(T(130, 66, "ranked projects · twelve categories", { s: 12.5 }));
  b.push(T(130, 82, `stars captured ${M.REPO.snapshot}, refreshed weekly`, { c: "lbl-c" }));
  b.push(T(796, 74, `${M.REPO.graveyard} graveyard · ${M.REPO.radar} on the radar`, { a: "end" }));
  const rows = [...M.REPO.categories].sort((a, c) => c[1] - a[1]);
  rows.forEach(([name, n], i) => {
    const y = 120 + i * 24;
    b.push(T(278, y + 4, name, { a: "end", s: 11.5 }));
    for (let k = 0; k < n; k++) b.push(Ci(300 + k * 14, y, 3.8));
    b.push(T(300 + n * 14 + 10, y + 4, `${n}`, { c: "lbl-c" }));
  });
  b.push(Ln(64, 400, 796, 400, "grid"));
  const bin = (x, title, note) => {
    b.push(T(x, 422, title, { s: 11.5 }));
    b.push(T(x, 438, note, { c: "lbl-c" }));
  };
  bin(64, `graveyard · ${M.REPO.graveyard}`, "archived upstream, or flagged for curation integrity");
  bin(470, `radar · ${M.REPO.radar}`, "weekly discovery finds, not yet vetted");
  return svg(W, H, b.join(""), `The ranked field: ${M.REPO.ranked} projects across twelve categories, one dot each, with ${M.REPO.graveyard} in the graveyard and ${M.REPO.radar} on the radar.`);
}

// ── 4 · how to pick: six questions, in order ────────────────────────────────
export function pick(M = MM) {
  const W = 860;
  const H = 440;
  const b = [];
  const qs = [
    ["what does it need to do?", "14 use-case intents map to 2-7 curated picks"],
    ["how much will you adopt?", "super simple · mostly simple · slightly complex · complex: pick the lowest"],
    ["how much rope does it get?", "step-gated · checkpoint-gated · bounded · headless"],
    ["what survives a crash?", "none · retry · resumable · durable: resumable is the floor"],
    ["who pays for the tokens?", "price the usage shape: ≈$360/month raw, under $10 after three fixes"],
    ["can you walk away?", "AGENTS.md · SKILL.md · MCP · exportable state"],
  ];
  const rem = [1, 0.72, 0.5, 0.34, 0.2, 0.12];
  qs.forEach(([q, ladder], i) => {
    const y = 82 + i * 56;
    b.push(T(68, y + 7, `${i + 1}`, { s: 20 }));
    b.push(T(100, y, q, { s: 12.5 }));
    b.push(T(100, y + 18, ladder, { c: "lbl-c" }));
    b.push(Rc(580, y - 4, 240, 10, { c: "box nofill" }));
    b.push(Rc(580, y - 4, 240 * rem[i], 10, { c: "box soft" }));
  });
  b.push(T(64, 418, "then prove the shortlist on your own repositories: the two-week test drive", { c: "lbl-s" }));
  return svg(W, H, b.join(""), "The six questions that turn the ranked list into a decision, each with its tier ladder, narrowing the field to two or three candidates.");
}

// ── 5 · the test drive ──────────────────────────────────────────────────────
export function drive(M = MM) {
  const W = 860;
  const H = 330;
  const b = [];
  b.push(T(64, 44, "an afternoon to set up · two weeks to run · numbers at the end", { c: "lbl-s" }));
  const nodes = [
    ["shortlist 2-3", "pick guide first"],
    ["a fair race", "same model · one AGENTS.md"],
    ["8-12 real tasks", "from your own merged work"],
    ["seven measurements", "the chips below"],
    ["the walk-away test", "export · time the runner-up"],
  ];
  const xs = [100, 265, 430, 595, 760];
  xs.forEach((x, i) => {
    if (i) b.push(Ar(xs[i - 1] + 14, 112, x - 14, 112));
    b.push(Ci(x, 112, 5.5));
    b.push(T(x, 80, nodes[i][0], { a: "middle", s: 12 }));
    b.push(T(x, 96, nodes[i][1], { a: "middle", c: "lbl-c" }));
  });
  const chips = ["quality", "interventions", "plan drift", "wall clock", "$ per accepted task", "robustness", "setup friction"];
  let cx = 76;
  chips.forEach((t) => {
    const w = t.length * 5.7 + 20;
    b.push(Rc(cx, 186, w, 26, { c: "box nofill" }));
    b.push(T(cx + w / 2, 203, t, { a: "middle", c: "lbl-c" }));
    cx += w + 9;
  });
  b.push(T(64, 268, "never let the agent grade itself; whoever ran the trial should not judge the diffs", { c: "lbl-c" }));
  b.push(T(64, 286, "the winner is only the winner until your model changes", { c: "lbl-c" }));
  return svg(W, H, b.join(""), "The two-week test-drive protocol: shortlist two or three, make the race fair, run 8-12 tasks from your own merged work, measure seven things, then run the walk-away test.");
}

// ── 6 · the toolbelt: ten skills ────────────────────────────────────────────
export function toolbelt(M = MM) {
  const W = 860;
  const H = 480;
  const b = [];
  b.push(T(796, 44, "changing a file or spending money waits for your yes", { a: "end", c: "lbl-c" }));
  const cw = 150;
  const gap = 10;
  const x0 = 35;
  M.SKILLS.forEach(([name, tag, lines], i) => {
    const x = x0 + (i % 5) * (cw + gap);
    const y = 64 + Math.floor(i / 5) * 188;
    b.push(Rc(x, y, cw, 172, { c: "box nofill", rx: 2 }));
    b.push(T(x + 12, y + 24, tag, { c: "lbl-s", s: 9 }));
    b.push(T(x + 12, y + 52, name, { s: 11 }));
    b.push(T(x + 12, y + 86, "hands back", { c: "lbl-s", s: 9 }));
    lines.forEach((ln, k) => b.push(T(x + 12, y + 106 + k * 16, ln, { c: "lbl-c" })));
  });
  b.push(T(430, 460, "npx skills add <repo>/skills/<name> · or install all ten as a plugin", { a: "middle", c: "lbl-c" }));
  return svg(W, H, b.join(""), "The repo's ten skills as instruments: each runs on your setup and hands back a number, from pass rates to wasted dollars.");
}

// ── 7 · getting started: templates, playbooks, skeletons ────────────────────
export function starter(M = MM) {
  const W = 860;
  const H = 300;
  const b = [];
  b.push(T(64, 44, "copy a file, follow a playbook, or hire a skeleton", { c: "lbl-s" }));
  b.push(T(64, 76, "templates", { c: "lbl-s" }));
  const tpl = [
    ["AGENTS.md", "one briefing file that Codex, Claude Code and more all read"],
    ["safe settings", "permissions plus a guard hook; two files to copy and commit"],
    ["minimal harness", "about 180 lines of Python: loop, tools, budget, --resume"],
  ];
  tpl.forEach(([name, line], i) => {
    const y = 102 + i * 48;
    b.push(T(64, y, name, { s: 12 }));
    b.push(T(64, y + 16, line, { c: "lbl-c" }));
  });
  b.push(T(470, 76, "playbooks", { c: "lbl-s" }));
  const pb = [
    ["build your own harness", "a working coding agent in about an hour"],
    ["one AGENTS.md for every agent", "write it, test that each tool loads it, keep it short"],
  ];
  pb.forEach(([name, line], i) => {
    const y = 102 + i * 48;
    b.push(T(470, y, name, { s: 12 }));
    b.push(T(470, y + 16, line, { c: "lbl-c" }));
  });
  b.push(Rc(64, 232, 732, 44, { c: "box nofill" }));
  b.push(T(80, 252, "agent skeletons · open-source agents that run on the subscription you already pay for", { s: 11.5 }));
  b.push(T(80, 268, "harness-scout · stack-auditor · harness-radar: pick, audit, and brief weekly", { c: "lbl-c" }));
  return svg(W, H, b.join(""), "Three templates to copy, two playbooks to follow, and three agent skeletons that run on the subscription you already pay for.");
}

// ── 8 · the bill (the desk's own thread) ────────────────────────────────────
export function billLadder(M = MM) {
  const W = 860;
  const H = 330;
  const BASE = 258;
  const TOP = 34;
  const lo = Math.log10(0.1);
  const hi = Math.log10(20);
  const yOf = (v) => BASE - ((BASE - TOP) * (Math.log10(v) - lo)) / (hi - lo);
  const b = [];
  [0.1, 1, 10].forEach((v) => {
    b.push(Ln(64, yOf(v), 828, yOf(v), "grid"));
    b.push(T(56, yOf(v) + 4, v < 1 ? "$0.10" : v < 10 ? "$1" : "$10", { c: "lbl-c", a: "end" }));
  });
  b.push(Ln(64, BASE, 828, BASE));
  const fixNames = ["raw", "+ wake gate", "+ tier routing", "+ slim tools"];
  M.LADDER.forEach((row, i) => {
    const x = 92 + i * 188;
    const w = 118;
    const y = yOf(row.day);
    b.push(Rc(x, y, w, BASE - y, { c: "box soft" }));
    b.push(Ln(x, y, x + w, y));
    b.push(T(x + w / 2, y - 20, M.fmtMoney(row.day), { a: "middle", s: 15 }));
    b.push(T(x + w / 2, y - 6, "a day", { a: "middle", c: "lbl-s" }));
    b.push(T(x + w / 2, BASE + 20, fixNames[i], { a: "middle" }));
    b.push(T(x + w / 2, BASE + 37, `${M.fmtMoney(row.month)}/mo · ${row.wakes} wakes`, { a: "middle", c: "lbl-s" }));
  });
  const scare = yOf(M.FIELD_BILL.unoptimizedPerHour * 24);
  b.push(Ln(64, scare, 828, scare, "guide"));
  b.push(T(828, scare - 8, "$0.50/hour, left on", { a: "end", c: "lbl-c" }));
  return svg(W, H, b.join(""), "Four settings of the same day on a log scale: raw $15.48, wake gate $2.50, tier routing $0.31, slim tools $0.22.");
}

// ── 9 · one day of signals, drawn dot by dot, into the gate ─────────────────
export function dayGrid(M = MM) {
  const W = 860;
  const H = 300;
  const b = [];
  const LEFT = 150;
  const STEP = 8.6;
  const cols = 48;
  let y = 46;
  const rowY = [];
  for (const e of M.EVENT_KINDS) {
    const rows = e.count > cols ? 2 : 1;
    rowY.push({ e, y, rows });
    y += rows * 24 + 14;
  }
  for (const { e, y, rows } of rowY) {
    const perRow = Math.ceil(e.count / rows);
    b.push(T(LEFT - 16, y + 5, e.label + "s", { a: "end" }));
    b.push(T(LEFT - 16, y + 20, `×${e.count}`, { a: "end", c: "lbl-s" }));
    for (let i = 0; i < e.count; i++) {
      const r = Math.floor(i / perRow);
      const c = i % perRow;
      const pass = M.gatePasses(e.kind, i);
      b.push(Ci(LEFT + c * STEP, y + r * 24, pass ? 3.1 : 2.1, pass ? "solid" : "faintdot"));
    }
  }
  const wakes = Object.values(M.GATE_PASS).reduce((s, v) => s + v, 0);
  b.push(T(64, 34, "one day in", { c: "lbl-s" }));
  b.push(T(LEFT, 34, `${M.TOTAL_EVENTS} signals`, { s: 15 }));
  b.push(Ar(600, 120, 668, 120));
  b.push(T(678, 125, `${wakes} wake a model`, { s: 14 }));
  b.push(T(678, 146, `${M.TOTAL_EVENTS - wakes} wait in the bin`, { c: "lbl-s" }));
  return svg(W, H, b.join(""), `One day's ${M.TOTAL_EVENTS} signals drawn as dots: filled dots wake a model (${wakes}), faint dots wait quietly.`);
}

// ── 10 · three engines, priced per million tokens ───────────────────────────
export function tiers(M = MM) {
  const W = 860;
  const H = 240;
  const b = [];
  const labels = [
    ["frontier", M.RATE.frontier, "hard calls"],
    ["mid", M.RATE.mid, "messages"],
    ["cheap", M.RATE.cheap, "cron · webhook · heartbeat"],
  ];
  const maxW = 430;
  const max = M.RATE.frontier;
  labels.forEach(([name, rate, takes], i) => {
    const y = 52 + i * 62;
    b.push(T(74, y + 5, name));
    const w = Math.max(9, (maxW * rate) / max);
    b.push(Rc(180, y - 13, w, 26, { c: "box soft" }));
    b.push(Ln(180, y - 13, 180 + w, y - 13));
    b.push(T(180 + w + 12, y + 5, `$${rate.toFixed(2)}/Mtok`));
    b.push(T(180, y + 32, takes, { c: "lbl-s" }));
  });
  b.push(T(74, 26, "the same call costs 52× on the big engine", { c: "lbl-s" }));
  return svg(W, H, b.join(""), "Three engines priced per million tokens: frontier $2.60, mid $0.50, cheap $0.05.");
}

// ── 11 · the guard's three trip wires ───────────────────────────────────────
export function guardWires(M = MM) {
  const W = 860;
  const H = 250;
  const b = [];
  const row = (y, label, ticks, trip, note) => {
    b.push(T(74, y + 5, label));
    ticks.forEach((on, i) => {
      const x = 330 + i * 34;
      const hit = i + 1 === trip;
      b.push(Ci(x, y, hit ? 8 : 6.5, hit ? "solid" : "box nofill"));
    });
    b.push(Ar(330 + ticks.length * 34 + 6, y, 330 + ticks.length * 34 + 66, y));
    b.push(T(330 + ticks.length * 34 + 74, y + 5, note));
  };
  row(64, "the same call, again", Array.from({ length: M.TRIP.loopRepeats }), M.TRIP.loopRepeats, "stop");
  row(122, "failures in a row", Array.from({ length: M.TRIP.failureStreak }), M.TRIP.failureStreak, "stop");
  const y = 196;
  b.push(T(74, y + 5, "the day's bill"));
  const X0 = 330;
  const X1 = 690;
  b.push(Rc(X0, y - 9, X1 - X0, 18, { c: "box nofill" }));
  const warnX = X0 + ((X1 - X0) * M.CAP_USD * M.WARN_FRAC) / M.CAP_USD;
  b.push(Ln(warnX, y - 17, warnX, y + 17, "ln2"));
  b.push(T(warnX, y - 24, `$${M.CAP_USD * M.WARN_FRAC} warn`, { a: "middle", c: "lbl-c" }));
  b.push(Ln(X1, y - 17, X1, y + 17, "ln2"));
  b.push(T(X1, y - 24, `$${M.CAP_USD} cap`, { a: "middle", c: "lbl-c" }));
  b.push(Ar(X1 + 8, y, X1 + 52, y));
  b.push(T(X1 + 60, y + 5, "the day stops"));
  return svg(W, H, b.join(""), `The guard's trip wires: ${M.TRIP.loopRepeats} loop repeats, ${M.TRIP.failureStreak} failures in a row, or $${M.CAP_USD} in a day.`);
}

// ── 12 · how the list stays fresh ───────────────────────────────────────────
export function pipeline(M = MM) {
  const W = 860;
  const H = 230;
  const b = [];
  const nodes = [
    ["refresh_stars", "nightly"],
    ["curation-queue.json", "the hand-edited file"],
    ["generate.py", "validates + builds"],
    ["check_integrity", "fails on a bad row"],
    ["weekly rescore", "Sundays, 14:00 UTC"],
  ];
  const bw = 140;
  const gap = 20;
  nodes.forEach(([name, sub], i) => {
    const x = 50 + i * (bw + gap);
    b.push(Rc(x, 68, bw, 62, { c: "box nofill", rx: 2 }));
    b.push(T(x + bw / 2, 94, name, { a: "middle", s: 11 }));
    b.push(T(x + bw / 2, 112, sub, { a: "middle", c: "lbl-s", s: 8.5 }));
    if (i < nodes.length - 1) b.push(Ar(x + bw + 3, 99, x + bw + gap - 3, 99));
  });
  b.push(Pa(`M50 156q380 24 760 0`, "guide"));
  b.push(T(430, 186, "README · harnesses.json · llms.txt · feed.json · landscape.svg · axes-grid.svg · MCP data", { a: "middle", c: "lbl-c" }));
  b.push(T(430, 210, "regenerated every refresh", { a: "middle", c: "lbl-s" }));
  return svg(W, H, b.join(""), "The repo's pipeline: nightly star refresh, a hand-edited curation queue, a generator, an integrity check and a weekly rescore, regenerating every published artifact.");
}

// ── 13 · the deep-dive rubric ───────────────────────────────────────────────
export function rubric(M = MM) {
  const W = 860;
  const H = 300;
  const b = [];
  b.push(Rc(64, 52, 732, 196, { c: "box nofill", rx: 2 }));
  b.push(T(80, 76, "attributes/<slug>.json · one file per researched project", { s: 11 }));
  b.push(T(780, 76, "every rating needs an evidence URL", { a: "end", c: "lbl-c" }));
  const rows = [
    ["tooling & sandboxing", "strong · basic · none"],
    ["context & memory", "strong · basic · none"],
    ["lifecycle hooks", "full · partial · none"],
    ["prompt optimization", "native · configurable · none"],
    ["build vs buy", "build · blueprint · managed"],
  ];
  rows.forEach(([axis, ladder], i) => {
    const y = 110 + i * 28;
    b.push(T(80, y, axis, { s: 11.5 }));
    b.push(T(380, y, ladder, { c: "lbl-c" }));
    b.push(Rc(630, y - 13, 140, 22, { c: "box nofill" }));
    b.push(T(700, y + 2, "evidence URL", { a: "middle", c: "lbl-c", s: 9.5 }));
  });
  b.push(T(64, 272, "unknown beats inferred · a file that skips an axis or invents a rating fails the build loudly", { c: "lbl-c" }));
  return svg(W, H, b.join(""), "The deep-dive rubric: five axes per researched project, each rating carrying an evidence URL, validated by the generator on every build.");
}
