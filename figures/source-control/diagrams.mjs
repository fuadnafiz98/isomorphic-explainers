import * as M from "./model.mjs";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f1 = (n) => (Math.round(n * 10) / 10).toString();
const T = (x, y, text, { c = "lbl", a = "start", s = 0 } = {}) => `<text class="${c}" x="${f1(x)}" y="${f1(y)}" text-anchor="${a}"${s ? ` style="font-size:${s}px"` : ""}>${esc(text)}</text>`;
const Rc = (x, y, w, h, { c = "box", rx = 0, dash = false } = {}) => `<rect class="${c}${dash ? " dash" : ""}" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}"${rx ? ` rx="${rx}"` : ""}/>`;
const Ln = (x1, y1, x2, y2, c = "ln") => `<line class="${c}" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}"/>`;
const Pa = (d, c = "ln") => `<path class="${c}" d="${d}"/>`;
const Ci = (x, y, r, c = "box") => `<circle class="${c}" cx="${f1(x)}" cy="${f1(y)}" r="${r}"/>`;
const Arrow = (x1, y1, x2, y2, { dash = false, c = "ln" } = {}) => `<path class="${c}${dash ? " flow" : ""}" d="M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}" marker-end="url(#ah)"/>`;
const svg = (w, h, body, label) => `<div class="stage flatwrap"><svg class="flat" viewBox="0 0 ${w} ${h}" width="${w}" role="img" aria-label="${esc(label)}">${body}</svg></div>`;

export function mergeChart() {
  const W = 900, H = 340;
  const X0 = 100, X1 = 850, Y0 = 30, Y1 = 290;
  const vals = M.MERGES.map((d) => d.v);
  const max = Math.max(...vals) * 1.05;
  const yOf = (v) => Y1 - ((Y1 - Y0) * v) / max;
  const xAt = (i) => X0 + ((X1 - X0) * i) / (M.MERGES.length - 1);
  const b = [];
  [5, 10, 20, 30].forEach((k) => { b.push(Ln(X0, yOf(k * 1000), X1, yOf(k * 1000), "grid")); b.push(T(X0 - 10, yOf(k * 1000) + 4, k + "k", { c: "lbl-s", a: "end" })); });
  b.push(Ln(X0, Y1, X1, Y1));
  b.push(Ln(X0, Y0, X0, Y1));
  M.MERGES.forEach((d, i) => {
    b.push(Ln(xAt(i), Y1, xAt(i), Y1 + 5));
    b.push(T(xAt(i), Y1 + 22, d.month, { c: "lbl-s", a: "middle" }));
  });
  const pts = M.MERGES.map((d, i) => [xAt(i), yOf(d.v)]);
  const line = pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");
  b.push(`<polygon points="${line} ${f1(X1)},${Y1} ${f1(X0)},${Y1}" style="fill:var(--side);stroke:none;opacity:.45"/>`);
  b.push(`<polyline class="ln" style="stroke-width:1.8" points="${line}"/>`);
  pts.forEach(([x, y], i) => { b.push(Ci(x, y, 3.2, "solid")); if (i % 2 === 0 || i === M.MERGES.length - 1) b.push(T(x + 8, y - 8, M.fmt(M.MERGES[i].v), { c: "lbl-s" })); });
  // annotation
  b.push(T(600, 70, "May: ~" + M.fmt(M.MERGE_MAY), { c: "lbl", a: "middle" }));
  b.push(Arrow(540, 80, xAt(4), yOf(M.MERGE_MAY), { dash: true, c: "ln2" }));
  b.push(T(720, 110, "Sep: >" + M.fmt(M.MERGE_SEP), { c: "lbl", a: "middle" }));
  b.push(Arrow(660, 118, xAt(8), yOf(M.MERGE_SEP), { dash: true, c: "ln2" }));
  b.push(Ln(xAt(4), Y0, xAt(4), Y1, "guide"));
  b.push(T(xAt(4), Y0 - 6, "Claude agents start merging at scale", { c: "lbl-s", a: "middle" }));
  return svg(W, H, b.join(""), "Changes merged to the monorepo per day, January to September 2026. From about 600 in January to over 30,000 in September.");
}

export function scaleMath() {
  const W = 820, H = 260;
  const b = [];
  // left: naive arithmetic
  b.push(T(60, 40, "THE NAIVE ARITHMETIC", { c: "lbl-s" }));
  const rows = [
    ["checkouts per day", M.fmt(M.CHECKOUTS_DAY)],
    ["× working copy each", M.WORKCOPY_GB + " GB"],
    ["= traffic per day", M.fmt(M.NAIVE_PB_DAY * 1e12)],
  ];
  rows.forEach(([k, v], i) => {
    b.push(Rc(60, 70 + i * 58, 320, 46));
    b.push(T(76, 70 + i * 58 + 20, k, { c: "lbl-s" }));
    b.push(T(76, 70 + i * 58 + 36, v, { c: "lbl" }));
    if (i < 2) b.push(T(395, 70 + i * 58 + 40, "×", { c: "lbl", a: "middle" }));
    if (i === 1) b.push(T(395, 150, "=", { c: "lbl", a: "middle" }));
  });
  b.push(T(60, 260, "So a full copy on every checkout is impossible. Something must fetch only what is read.", { c: "lbl-s" }));
  // right: history size vs working copy
  b.push(T(480, 40, "THE MONOREPO", { c: "lbl-s" }));
  const bars = [
    ["main history", M.HISTORY_GB, "lo"],
    ["working copy (compressed)", M.WORKCOPY_GB, "mid"],
  ];
  let y = 80;
  bars.forEach(([name, v, tone]) => {
    b.push(T(480, y + 12, name, { c: "lbl-s" }));
    b.push(Rc(480, y + 20, (v / M.HISTORY_GB) * 260, 22, { c: tone === "mid" ? "solid" : "box" }));
    b.push(T(480 + (v / M.HISTORY_GB) * 260 + 8, y + 36, v + " GB", { c: "lbl" }));
    y += 62;
  });
  b.push(T(480, y + 20, "25 million checkouts a day, none of them need all of it.", { c: "lbl-s" }));
  return svg(W, H, b.join(""), "Naive arithmetic: 25 million checkouts a day times 25 GB is about 600 PB a day. The monorepo is 100 GB of history and a 25 GB working copy.");
}

export function gitScalingSetup() {
  const W = 960, H = 330;
  const b = [];
  b.push(T(40, 34, "THE SHAPE OF SCALING GIT", { c: "lbl-s" }));
  // central repo server
  b.push(Rc(60, 120, 150, 90, { rx: 6 }));
  b.push(T(135, 150, "origin", { c: "lbl", a: "middle" }));
  b.push(T(135, 168, "one big repo", { c: "lbl-s", a: "middle" }));
  b.push(T(135, 186, "100 GB", { c: "lbl-c", a: "middle" }));
  // mirrors
  for (let i = 0; i < 6; i++) {
    const x = 290 + (i % 3) * 110;
    const y = 40 + Math.floor(i / 3) * 120;
    b.push(Rc(x, y, 92, 60, { rx: 4, dash: i > 1 }));
    b.push(T(x + 46, y + 24, "mirror", { c: "lbl-s", a: "middle" }));
    b.push(T(x + 46, y + 40, i % 3 === 0 ? "full" : "partial", { c: "lbl-c", a: "middle" }));
    b.push(Arrow(210, 165, x, y + 30, { c: "ln2", dash: true }));
  }
  b.push(T(290, 310, "several hundred mirrors at peak", { c: "lbl-s" }));
  // seeds
  b.push(Rc(650, 90, 130, 60, { rx: 4, dash: true }));
  b.push(T(715, 118, "seed snapshot", { c: "lbl-s", a: "middle" }));
  b.push(T(715, 134, "stale vs main", { c: "lbl-c", a: "middle" }));
  b.push(Arrow(650, 120, 715 - 130 + 60, 140, { c: "ln2", dash: true }));
  // clients
  b.push(Rc(820, 200, 100, 50, { rx: 4 }));
  b.push(T(870, 222, "CI job", { c: "lbl-s", a: "middle" }));
  b.push(T(870, 240, "needs a copy", { c: "lbl-c", a: "middle" }));
  b.push(Arrow(600, 200, 820, 215, { c: "ln2", dash: true }));
  b.push(T(620, 300, "offline-capable clients, online jobs, ever-staler seeds, rising ops cost", { c: "lbl-s" }));
  return svg(W, H, b.join(""), "The typical git at scale setup: one origin, hundreds of mirrors, snapshots in blob storage, and clients that all need a local copy.");
}

export function changesetShape() {
  const W = 960, H = 360;
  const b = [];
  b.push(T(40, 34, "THE SHAPE OF A CHANGESET", { c: "lbl-s" }));
  // changeset card
  const cx = 60, cy = 60, cw = 360, ch = 250;
  b.push(Rc(cx, cy, cw, ch, { rx: 8 }));
  b.push(T(cx + 16, cy + 24, "changeset (write-ahead log entry)", { c: "lbl" }));
  const rows = [
    ["parent(s)", "first parent for trunk history"],
    ["changed files", "only the files that moved"],
    ["blob pointers", "content-addressed, compressed"],
    ["metadata", "author, message, time"],
  ];
  rows.forEach(([k, v], i) => {
    const y = cy + 46 + i * 46;
    b.push(Ln(cx + 16, y, cx + cw - 16, y, "guide"));
    b.push(T(cx + 16, y + 16, k, { c: "lbl-s" }));
    b.push(T(cx + 16, y + 32, v, { c: "lbl-c" }));
  });
  b.push(T(cx + 16, cy + 242, "created server-side, instantly visible everywhere", { c: "lbl-s" }));
  // derived data on right
  b.push(T(470, 34, "DERIVED DATA, COMPUTED EAGERLY OR LAZILY", { c: "lbl-s" }));
  const dd = [
    ["file blame", "who last touched each line"],
    ["path history", "every changeset touching a path"],
    ["commit-graph skip list", "fast ancestry queries"],
    ["copy detection", "added later, same mechanism"],
    ["path file search", "added later, same mechanism"],
  ];
  dd.forEach(([name, desc], i) => {
    const y = 60 + i * 52;
    b.push(Rc(470, y, 440, 44, { rx: 6, dash: i > 2 }));
    b.push(T(486, y + 18, name, { c: "lbl" }));
    b.push(T(486, y + 34, desc, { c: "lbl-c" }));
    b.push(Arrow(420, 140, 470, y + 22, { c: "ln2", dash: true }));
  });
  b.push(T(470, 330, "Each type is defined recursively: its value for a changeset comes from its parents' values.", { c: "lbl-s" }));
  return svg(W, H, b.join(""), "A changeset stores only what changed, with content-addressed blob pointers. Everything else (blame, path history, skip lists) is derived data.");
}

export function checkoutTiers() {
  const W = 960, H = 360;
  const b = [];
  b.push(T(40, 34, "CHECKOUT ARCHITECTURE: TIERS THAT ANSWER THE SAME RPCS", { c: "lbl-s" }));
  const tiers = [
    ["scn client", "sparse or virtualised checkouts, local object cache", "lo"],
    ["scion-daemon", "per node, stores objects for the whole node, starts from a snapshot", "mid"],
    ["scion-cache", "regional, streams objects from memory in disk format", "hi"],
    ["scion-server", "authoritative, reads Spanner or cloud storage", "lit"],
  ];
  let y = 60;
  tiers.forEach(([name, desc, tone], i) => {
    b.push(Rc(60, y, 840, 52, { rx: 6 }));
    b.push(T(80, y + 20, name, { c: "lbl" }));
    b.push(T(80, y + 36, desc, { c: "lbl-c" }));
    b.push(T(760, y + 28, i === tiers.length - 1 ? "Spanner / GCS" : ">99% hit", { c: "lbl-s", a: "end" }));
    if (i < tiers.length - 1) b.push(Arrow(480, y + 52, 480, y + 60 + 12, { c: "ln2" }));
    y += 66;
  });
  b.push(T(60, 336, "Every tier answers identical RPCs, so the client never learns the cache topology. Tiering isolates failure domains.", { c: "lbl-s" }));
  return svg(W, H, b.join(""), "Client talks to a daemon per node, then regional caches, then authoritative servers, then Spanner or cloud storage. Every tier answers the same RPCs.");
}

export function principles() {
  const W = 960, H = 400;
  const b = [];
  b.push(T(40, 34, "SIX PRINCIPLES, IN ONE LINE EACH", { c: "lbl-s" }));
  const items = [
    ["Clients are always online.", "Design the client and protocols around a reachable server; fetch on demand."],
    ["Client-server asymmetry.", "The server computes; the client keeps a bounded cache and lays out files."],
    ["A service, not a tool.", "Every client query is an RPC; jobs need no local repo at all."],
    ["Everything scales horizontally.", "No full copy of the repo anywhere, not even on the server."],
    ["Commits are cheap, incremental, lock-free.", "Cost scales with the change, not the repo; refs discouraged."],
    ["Optional, sparse, virtualised working copy.", "Pay only for the directories and files you read."],
  ];
  items.forEach(([h, d], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 40 + col * 470, y = 60 + row * 108;
    b.push(Rc(x, y, 440, 90, { rx: 6 }));
    b.push(T(x + 16, y + 22, (i + 1) + "  " + h, { c: "lbl" }));
    b.push(wrap(x + 16, y + 40, 408, d));
  });
  return svg(W, H, b.join(""), "The six principles of Scion's design, each in one line.");
}

function wrap(x, y, w, text) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const word of words) {
    if ((cur + " " + word).length > 52) { lines.push(cur); cur = word; } else cur = cur ? cur + " " + word : word;
  }
  if (cur) lines.push(cur);
  return lines.map((l, i) => T(x, y + i * 13, l, { c: "lbl-c" })).join("");
}

export function performance() {
  const W = 900, H = 320;
  const b = [];
  b.push(T(40, 34, "OBSERVED WINS", { c: "lbl-s" }));
  const rows = [
    ["Infrastructure footprint (CPU + memory)", M.FOOTPRINT_FACTOR + "x smaller than git mirrors"],
    ["CI + research checkout time", M.CI_SPEEDUP + "x faster (seconds, not minutes)"],
    ["CI CPU capacity", "+" + Math.round(M.CI_CPU_WIN * 100) + "%"],
    ["Ingestion rewrite (Mythos)", M.MYTHOS_MEM + "x less memory, " + M.MYTHOS_SPEED + "x faster"],
    ["Per-tier cache hit rate", Math.round(M.CACHE_HIT * 100) + "%+"],
    ["Team", M.TEAM + " engineers, " + M.MONTHS + " months, ~" + M.HUMAN_FACTOR + "x merge growth absorbed"],
  ];
  rows.forEach(([k, v], i) => {
    const y = 60 + i * 42;
    b.push(Rc(40, y, 820, 34, { rx: 4 }));
    b.push(T(56, y + 22, k, { c: "lbl" }));
    b.push(T(844, y + 22, v, { c: "lbl-s", a: "end" }));
  });
  b.push(T(40, 312, "Numbers as reported in the post; some are observed, not benchmarked.", { c: "lbl-c" }));
  return svg(W, H, b.join(""), "Observed performance and scale wins: 200x smaller footprint, 100x faster checkouts, +25% CI CPU, 20x/4x Mythos rewrite.");
}

export function asymmetryTable() {
  const W = 900, H = 260;
  const b = [];
  b.push(T(40, 34, "CLIENT-SERVER ASYMMETRY", { c: "lbl-s" }));
  const cols = [
    ["Git", "every client is a full server", "offline, complete copy", "diff, blame, merges locally"],
    ["Scion", "client is a thin cache + file layer", "online by design", "server answers history, blame, merges"],
  ];
  let x = 60;
  cols.forEach(([name, a, b2, c], i) => {
    b.push(Rc(x, 60, 380, 170, { rx: 6 }));
    b.push(T(x + 16, 86, name, { c: "lbl" }));
    [a, b2, c].forEach((t, j) => b.push(T(x + 16, 108 + j * 34, t, { c: "lbl-c" })));
    x += 400;
  });
  b.push(T(60, 246, "In return the client holds much less data and does almost no computation.", { c: "lbl-s" }));
  return svg(W, H, b.join(""), "Client-server asymmetry: git clients are full servers; Scion clients are thin caches that defer to the server.");
}