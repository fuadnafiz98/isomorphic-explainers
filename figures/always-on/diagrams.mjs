// The flat panels under the machine. Each one is a big drawing with as few words as possible;
// every number comes from model.mjs, so the panels cannot disagree with the desk above.
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
  const [hx, hy] = [x2, y2];
  const p1 = [hx - h * Math.cos(a - 0.42), hy - h * Math.sin(a - 0.42)];
  const p2 = [hx - h * Math.cos(a + 0.42), hy - h * Math.sin(a + 0.42)];
  return Pa(`M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`, c) + `<path class="solid" d="M${f(hx)} ${f(hy)}L${f(p1[0])} ${f(p1[1])}L${f(p2[0])} ${f(p2[1])}Z"/>`;
};
const svg = (w, h, body, label) => `<svg class="flat" viewBox="0 0 ${w} ${h}" width="${w}" role="img" aria-label="${esc(label)}">${body}</svg>`;
const panel = (title, note, body, notes) =>
  `<section class="ao-panel"><h2 class="ao-panel-h"><b>${esc(title)}</b><i>${esc(note)}</i></h2><div class="ao-cols">${body}<ul class="ao-notes">${notes.map((n) => `<li>${n}</li>`).join("")}</ul></div></section>`;

// ── 1 · the bill: four settings on a log scale ──────────────────────────────
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
    b.push(T(x + w / 2, y - 20, M.fmtMoney(row.day), { c: "lbl", a: "middle", s: 15 }));
    b.push(T(x + w / 2, y - 6, "a day", { c: "lbl-s", a: "middle" }));
    b.push(T(x + w / 2, BASE + 20, fixNames[i], { c: "lbl", a: "middle" }));
    b.push(T(x + w / 2, BASE + 37, `${M.fmtMoney(row.month)}/mo · ${row.wakes} wakes`, { c: "lbl-s", a: "middle" }));
  });
  const scare = yOf(M.FIELD_BILL.unoptimizedPerHour * 24);
  b.push(Ln(64, scare, 828, scare, "guide"));
  b.push(T(828, scare - 8, "$0.50/hour, left on", { c: "lbl-c", a: "end" }));
  return svg(W, H, b.join(""), "Four settings of the same day on a log scale: raw $15.48, wake gate $2.50, tier routing $0.31, slim tools $0.22.");
}

// ── 2 · one day of signals, drawn dot by dot, into the gate ─────────────────
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
    b.push(T(LEFT - 16, y + 5, e.label + "s", { c: "lbl", a: "end" }));
    b.push(T(LEFT - 16, y + 20, `×${e.count}`, { c: "lbl-s", a: "end" }));
    for (let i = 0; i < e.count; i++) {
      const r = Math.floor(i / perRow);
      const c = i % perRow;
      const pass = M.gatePasses(e.kind, i);
      b.push(Ci(LEFT + c * STEP, y + r * 24, pass ? 3.1 : 2.1, pass ? "solid" : "faintdot"));
    }
  }
  const wakes = Object.values(M.GATE_PASS).reduce((s, v) => s + v, 0);
  b.push(T(64, 34, "one day in", { c: "lbl-s" }));
  b.push(T(LEFT, 34, `${M.TOTAL_EVENTS} signals`, { c: "lbl", s: 15 }));
  b.push(Ar(600, 120, 668, 120));
  b.push(T(678, 125, `${wakes} wake a model`, { c: "lbl", s: 14 }));
  b.push(T(678, 146, `${M.TOTAL_EVENTS - wakes} wait in the bin`, { c: "lbl-s" }));
  return svg(W, H, b.join(""), `One day's ${M.TOTAL_EVENTS} signals drawn as dots: filled dots wake a model (${wakes}), faint dots wait quietly.`);
}

// ── 3 · three engines, priced per million tokens ────────────────────────────
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
    b.push(T(74, y + 5, name, { c: "lbl" }));
    const w = Math.max(9, (maxW * rate) / max);
    b.push(Rc(180, y - 13, w, 26, { c: "box soft" }));
    b.push(Ln(180, y - 13, 180 + w, y - 13));
    b.push(T(180 + w + 12, y + 5, `$${rate.toFixed(2)}/Mtok`, { c: "lbl" }));
    b.push(T(180, y + 32, takes, { c: "lbl-s" }));
  });
  b.push(T(74, 26, "the same call costs 52× on the big engine", { c: "lbl-s" }));
  return svg(W, H, b.join(""), "Three engines priced per million tokens: frontier $2.60, mid $0.50, cheap $0.05.");
}

// ── 4 · the guard's three trip wires ────────────────────────────────────────
export function guardWires(M = MM) {
  const W = 860;
  const H = 250;
  const b = [];
  const row = (y, label, ticks, trip, note) => {
    b.push(T(74, y + 5, label, { c: "lbl" }));
    ticks.forEach((on, i) => {
      const x = 330 + i * 34;
      const hit = i + 1 === trip;
      b.push(Ci(x, y, hit ? 8 : 6.5, hit ? "solid" : "box nofill"));
      if (hit) b.push(T(x, y + 5, "×", { c: "lbl-c", a: "middle", s: 11 }));
    });
    b.push(Ar(330 + ticks.length * 34 + 6, y, 330 + ticks.length * 34 + 66, y));
    b.push(T(330 + ticks.length * 34 + 74, y + 5, note, { c: "lbl" }));
  };
  row(64, "the same call, again", Array.from({ length: M.TRIP.loopRepeats }), M.TRIP.loopRepeats, "stop");
  row(122, "failures in a row", Array.from({ length: M.TRIP.failureStreak }), M.TRIP.failureStreak, "stop");
  // the day's bill against the cap
  const y = 196;
  b.push(T(74, y + 5, "the day's bill", { c: "lbl" }));
  const X0 = 330;
  const X1 = 690;
  b.push(Rc(X0, y - 9, X1 - X0, 18, { c: "box nofill" }));
  const warnX = X0 + ((X1 - X0) * M.CAP_USD * M.WARN_FRAC) / M.CAP_USD;
  b.push(Ln(warnX, y - 17, warnX, y + 17, "ln2"));
  b.push(T(warnX, y - 24, `$${M.CAP_USD * M.WARN_FRAC} warn`, { c: "lbl-c", a: "middle" }));
  b.push(Ln(X1, y - 17, X1, y + 17, "ln2"));
  b.push(T(X1, y - 24, `$${M.CAP_USD} cap`, { c: "lbl-c", a: "middle" }));
  b.push(Ar(X1 + 8, y, X1 + 52, y));
  b.push(T(X1 + 60, y + 5, "the day stops", { c: "lbl" }));
  return svg(W, H, b.join(""), `The guard's trip wires: ${M.TRIP.loopRepeats} loop repeats, ${M.TRIP.failureStreak} failures in a row, or $${M.CAP_USD} in a day.`);
}

// ── 5 · the minimal harness, part by part ───────────────────────────────────
export function harness() {
  const W = 860;
  const H = 336;
  const parts = [
    ["turn cap", "stop a run at 30 turns"],
    ["clip results", "10k tokens per tool result"],
    ["compound guard", "loop, failure and cost trips"],
    ["AGENTS.md", "one page of house rules"],
    ["transcript", "--resume from the last turn"],
    ["is_error", "failures flagged, not parsed"],
    ["one message", "all results in a single user turn"],
  ];
  const b = [];
  const cw = 268;
  const ch = 84;
  parts.forEach(([name, sub], i) => {
    const x = 64 + (i % 3) * (cw + 24);
    const y = 34 + Math.floor(i / 3) * (ch + 18);
    b.push(Rc(x, y, cw, ch, { c: "box nofill", rx: 2 }));
    b.push(Rc(x, y, cw, 24, { c: "box soft", rx: 2 }));
    b.push(T(x + 12, y + 16, `${i + 1}`, { c: "lbl-s" }));
    b.push(T(x + 30, y + 17, name, { c: "lbl", s: 13 }));
    b.push(T(x + 12, y + 48, sub, { c: "lbl-c" }));
  });
  return svg(W, H, b.join(""), "The minimal harness in seven parts: turn cap, clipped results, compound guard, house rules, transcript resume, error flags, one message.");
}

// ── 6 · the repo's own pipeline, nightly to Sundays ─────────────────────────
export function pipeline(M = MM) {
  const W = 860;
  const H = 210;
  const b = [];
  const nodes = [
    ["refresh_stars", "nightly"],
    ["curation-queue.json", "the hand-edited file"],
    ["generate", "builds the README"],
    ["check_integrity", "fails on a bad row"],
    ["weekly rescore", "Sundays, 14:00 UTC"],
  ];
  const bw = 148;
  const gap = 22;
  nodes.forEach(([name, sub], i) => {
    const x = 56 + i * (bw + gap);
    b.push(Rc(x, 78, bw, 62, { c: "box nofill", rx: 2 }));
    b.push(T(x + bw / 2, 106, name, { c: "lbl", a: "middle", s: 12 }));
    b.push(T(x + bw / 2, 126, sub, { c: "lbl-s", a: "middle", s: 9 }));
    if (i < nodes.length - 1) b.push(Ar(x + bw + 3, 109, x + bw + gap - 3, 109));
  });
  b.push(Pa(`M56 168q374 26 748 0`, "guide"));
  b.push(T(430, 186, "one queue, five steps, no hands", { c: "lbl-c", a: "middle" }));
  b.push(T(56, 42, "how the harness list stays fresh", { c: "lbl-s" }));
  return svg(W, H, b.join(""), "The repo's pipeline: refresh stars, a curation queue, generation, an integrity check and a weekly rescore.");
}

export function panels(M = MM) {
  const wakes = Object.values(M.GATE_PASS).reduce((s, v) => s + v, 0);
  return [
    panel("the bill", "log scale · one day, four settings", billLadder(M), [
      `<b>124 wakes</b> on the raw setting: every heartbeat, every webhook.`,
      `The gate cuts it to <b>${wakes} wakes</b>; the bin keeps the rest.`,
      `Field reports put the raw loop at <b>${M.money(M.FIELD_BILL.unoptimizedPerMonth)}/month</b>; three fixes land under <b>$10</b>.`,
    ]),
    panel("the gate, signal by signal", `${M.TOTAL_EVENTS} in · ${wakes} wake a model`, dayGrid(M), [
      `<b>heartbeats</b> pass ${M.GATE_PASS.heartbeat} of ${M.EVENT_KINDS.find((e) => e.kind === "heartbeat").count} — only when the watch found something.`,
      `<b>messages</b> always wake it: a person wrote.`,
      `<b>crons</b> ${M.GATE_PASS.cron} of 8, <b>webhooks</b> ${M.GATE_PASS.webhook} of 8.`,
    ]),
    panel("three engines", "route by what the call needs", tiers(M), [
      `Frontier rates are <b>${Math.round(M.RATE.frontier / M.RATE.cheap)}×</b> the cheap engine.`,
      `Background work goes to the <b>cheap</b> engine; only talk goes to the mid one.`,
      `Slimming the tool list trims <b>${Math.round(M.TOKENS.full / 1000)}k → ${Math.round(M.TOKENS.slim / 1000)}k</b> tokens a call.`,
    ]),
    panel("the guard", "runaway-guard's defaults", guardWires(M), [
      `<b>${M.TRIP.loopRepeats} repeats</b> of the same call and the run stops.`,
      `<b>${M.TRIP.failureStreak} failures</b> in a row and the run stops.`,
      `<b>${M.money(M.CAP_USD)} a day</b> is the wire; the pennant flies at ${M.money(M.CAP_USD * M.WARN_FRAC)}.`,
    ]),
    panel("the minimal harness", "seven parts, about two hundred lines", harness(), [
      `Each part exists because an unpriced run did something dumb once.`,
      `The guard rides inside the loop; no outside supervisor.`,
      `Everything live on the desk above is wired to these seven parts.`,
    ]),
    panel("the repo's pipeline", "nothing hand-edited but the queue", pipeline(M), [
      `${M.TOTAL_EVENTS ? "" : ""}Stars refresh <b>nightly</b>; the queue is the only human step.`,
      `<b>check_integrity</b> fails the build on a bad row, so the README cannot lie.`,
      `Everything rescored <b>Sundays, 14:00 UTC</b>.`,
    ]),
  ].join("");
}
