// The flat diagrams of the page: one monochrome line language, a different kind of drawing in each figure
// (sequence, devtools, chart, browser window, three windows). The interactive ones are Hairline figures in hl/.
import * as M from "./model.mjs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f1 = (n) => (Math.round(n * 10) / 10).toString();
const T = (x, y, text, { c = "lbl", a = "start" } = {}) => `<text class="${c}" x="${f1(x)}" y="${f1(y)}" text-anchor="${a}">${esc(text)}</text>`;
const Rc = (x, y, w, h, { c = "box", rx = 0 } = {}) => `<rect class="${c}" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}"${rx ? ` rx="${rx}"` : ""}/>`;
const Ln = (x1, y1, x2, y2, c = "ln") => `<line class="${c}" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}"/>`;
const Pa = (d, c = "ln") => `<path class="${c}" d="${d}"/>`;
const Ci = (x, y, r, c = "box") => `<circle class="${c}" cx="${f1(x)}" cy="${f1(y)}" r="${r}"/>`;
const Tag = (x, y, n) => `<rect class="tag" x="${f1(x - 8)}" y="${f1(y - 8)}" width="16" height="16"/><text class="tag-t" x="${f1(x)}" y="${f1(y + 3.6)}" text-anchor="middle">${n}</text>`;
const Arrow = (x1, y1, x2, y2, { dash = false } = {}) => `<path class="ln${dash ? " flow" : ""}" d="M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}" marker-end="url(#ah)"/>`;
const hex8 = (text) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
};
const svg = (w, h, body, label) => `<div class="stage flatwrap"><svg class="flat" viewBox="0 0 ${w} ${h}" width="${w}" role="img" aria-label="${esc(label)}">${body}</svg></div>`;

// ── FIG 2: who talks to whom ──────────────────────────────────────────
export function requestFlow() {
  const b = [];
  // the MacBook, front on, with a browser window open
  b.push(Rc(40, 50, 250, 160, { rx: 9 }));
  b.push(Rc(48, 58, 234, 144, { c: "box soft", rx: 3 }));
  b.push(Rc(56, 66, 218, 128, { c: "box" }));
  b.push(Ln(56, 83, 274, 83));
  [66, 75, 84].forEach((x) => b.push(Ci(x, 74.5, 2.2)));
  b.push(Rc(96, 69, 118, 11, { rx: 5.5 }));
  b.push(T(104, 77.5, "news.example", { c: "lbl-c" }));
  b.push(Rc(66, 92, 92, 7, { c: "solid" }));
  b.push(Ln(66, 108, 160, 108, "ln2") + Ln(66, 116, 150, 116, "ln2") + Ln(66, 124, 156, 124, "ln2"));
  b.push(Rc(66, 134, 74, 52));
  b.push(Ln(66, 134, 140, 186, "guide") + Ln(140, 134, 66, 186, "guide"));
  b.push(Rc(176, 94, 90, 62, { c: "box dash" }));
  b.push(T(221, 119, "ad slot", { c: "lbl-s", a: "middle" }));
  b.push(T(221, 133, "<script>", { c: "lbl-c", a: "middle" }));
  b.push(Pa("M20 212L310 212L300 226L30 226Z"));
  b.push(Ln(140, 219, 190, 219, "ln2"));
  b.push(T(165, 246, "your MacBook · Chrome", { a: "middle" }));
  // the script box, inside the browser
  b.push(Rc(40, 266, 250, 70, { c: "box dash" }));
  b.push(T(52, 284, "script runs in the page", { c: "lbl" }));
  b.push(T(52, 301, "canvas · WebGL · audio · fonts", { c: "lbl-s" }));
  b.push(T(52, 315, "screen · time zone · cores", { c: "lbl-s" }));
  b.push(T(52, 329, "fp = ae79acf9b2ffc26…", { c: "lbl" }));
  // first party
  b.push(Rc(630, 40, 230, 110));
  [0, 1, 2].forEach((i) => {
    b.push(Rc(646, 56 + i * 26, 120, 18));
    b.push(Ci(750, 65 + i * 26, 2.4, "solid"));
  });
  b.push(T(645, 140, "news.example", { c: "lbl" }));
  b.push(T(775, 140, "first party", { c: "lbl-s" }));
  // third party
  b.push(Rc(630, 176, 230, 164));
  [0, 1, 2].forEach((i) => {
    b.push(Rc(646, 192 + i * 26, 120, 18));
    b.push(Ci(750, 201 + i * 26, 2.4, "solid"));
  });
  b.push(T(645, 290, "ads.tracker.example", { c: "lbl" }));
  b.push(T(645, 306, "embedded on thousands of sites", { c: "lbl-s" }));
  b.push(Pa("M790 215c0-7 40-7 40 0v34c0 7-40 7-40 0z") + Pa("M790 215c0 7 40 7 40 0", "ln2") + Pa("M790 232c0 7 40 7 40 0", "ln2"));
  b.push(T(810, 270, "ID store", { c: "lbl-s", a: "middle" }));
  // messages
  b.push(Arrow(292, 74, 628, 74));
  b.push(T(460, 62, "GET /", { a: "middle" }));
  b.push(T(460, 91, "User-Agent · Accept-Language · your IP", { c: "lbl-c", a: "middle" }));
  b.push(Arrow(628, 124, 292, 124, { dash: true }));
  b.push(T(460, 112, "200 · html + <script src=…/fp.js>", { a: "middle" }));
  b.push(Arrow(292, 196, 628, 196));
  b.push(T(460, 188, "GET /fp.js", { a: "middle" }));
  b.push(Arrow(292, 288, 628, 288));
  b.push(T(460, 276, 'POST /collect {fp:"ae79acf9…"}', { a: "middle" }));
  b.push(T(460, 305, "no cookie needed", { c: "lbl-s", a: "middle" }));
  b.push(Arrow(628, 328, 292, 328, { dash: true }));
  b.push(T(460, 346, "seen before: same visitor", { c: "lbl-s", a: "middle" }));
  // step tags
  [[306, 62, 1], [614, 112, 2], [306, 184, 3], [40, 266, 4], [306, 276, 5], [614, 316, 6]].forEach(([x, y, n]) => b.push(Tag(x, y, n)));
  return svg(900, 372, b.join(""), "A sequence diagram. The MacBook's browser requests a page from news.example, receives HTML with a third-party script, fetches the script from ads.tracker.example, runs it, and posts a fingerprint to the tracker, which recognises the visitor.");
}

// ── the request, as DevTools shows it ─────────────────────────────────
export function requestHeaders() {
  const rows = [
    [":authority", "news.example", ""],
    [":method", "GET", ""],
    [":path", "/", ""],
    ["accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", ""],
    ["accept-encoding", "gzip, deflate, br, zstd", ""],
    ["accept-language", "en-US,en;q=0.9", "language"],
    ["sec-ch-ua", '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"', "browser + version"],
    ["sec-ch-ua-platform", '"macOS"', "operating system"],
    ["user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36", "browser, OS, engine"],
  ];
  const tr = rows
    .map(([k, v, tag]) => `<tr class="${tag ? "mark" : ""}"><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td><td class="t">${tag ? `<span>${tag}</span>` : ""}</td></tr>`)
    .join("");
  return `<div class="stage"><div class="win devtools">
    <div class="chrome"><i></i><i></i><i></i><span class="url">DevTools · Network · news.example</span></div>
    <div class="tabs"><span class="on">Headers</span><span>Payload</span><span>Preview</span><span>Response</span><span>Timing</span></div>
    <div class="win-body">
      <div class="kv"><span>Request URL</span><b>https://news.example/</b></div>
      <div class="kv"><span>Request Method</span><b>GET</b></div>
      <div class="kv"><span>Status Code</span><b>200 OK</b></div>
      <div class="kv hit"><span>Seen by the server, not a header</span><b>source IP 203.0.113.7 → region, ISP</b></div>
      <div class="mono-s sec">Request Headers</div>
      <div class="scroll"><table class="log hdr"><tbody>${tr}</tbody></table></div>
    </div></div></div>`;
}

// ── FIG 6: the crowd as the sieves read ───────────────────────────────
export function crowdChart() {
  const X0 = 96;
  const X1 = 700;
  const Y0 = 36;
  const Y1 = 296;
  const top = Math.log10(M.WORLD);
  const xAt = (k) => X0 + ((X1 - X0) * k) / M.TRAITS.length;
  const yOf = (pool) => Y1 - ((Y1 - Y0) * Math.log10(Math.max(1, pool))) / top;
  const b = [];
  [[1, "1"], [1e3, "1 thousand"], [1e6, "1 million"], [1e9, "1 billion"]].forEach(([v, name]) => {
    b.push(Ln(X0, yOf(v), X1, yOf(v), "grid"));
    b.push(T(X0 - 10, yOf(v) + 4, name, { c: "lbl-s", a: "end" }));
  });
  ["start", ...M.TRAITS.map((t) => t.short)].forEach((name, k) => {
    b.push(Ln(xAt(k), Y1, xAt(k), Y1 + 5));
    b.push(T(xAt(k), Y1 + 22, name, { c: "lbl-s", a: "middle" }));
  });
  b.push(Ln(X0, Y1, X1, Y1));
  const series = (mode, pick, cls) => {
    const pts = Array.from({ length: M.TRAITS.length + 1 }, (_, k) => [xAt(k), yOf(pick(M.reading(mode, k)))]);
    const line = pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");
    // the open curve is the subject: a soft area under it, a heavier line, and its value at every step
    if (cls === "ln") b.push(`<polygon points="${line} ${f1(X1)},${Y1} ${f1(X0)},${Y1}" style="fill:var(--side);stroke:none;opacity:.55"/>`);
    b.push(`<polyline class="${cls}"${cls === "ln" ? ' style="stroke-width:1.8"' : ""} points="${line}"/>`);
    pts.forEach(([x, y]) => b.push(Rc(x - 3.5, y - 3.5, 7, 7, { c: cls === "ln" ? "solid" : "box" })));
    if (cls === "ln") {
      pts.slice(0, -1).forEach(([x, y], k) => b.push(T(x + 9, y - 8, M.fmtCount(pick(M.reading(mode, k))), { c: "lbl-s" })));
    }
    return pts[pts.length - 1];
  };
  const open = series("open", (r) => r.pool, "ln");
  const carry = series("farbled", (r) => r.poolStable, "ln flow");
  const uni = series("uniform", (r) => r.pool, "ln dot");
  b.push(T(open[0] + 12, open[1] + 4, "no protection: just you"));
  b.push(T(carry[0] + 12, carry[1] + 4, `farbled, what carries over: ${M.fmtCount(M.reading("farbled", M.TRAITS.length).poolStable)}`));
  b.push(T(uni[0] + 12, uni[1] + 4, `uniform: ${M.fmtCount(M.reading("uniform", M.TRAITS.length).pool)}`));
  return svg(1000, 330, b.join(""), "A step chart on a log scale. The crowd that looks like you falls from 8 billion to one after seven traits with no protection. With farbling only the headers, screen and time zone carry over between sessions, leaving about 244 thousand. With uniform answers about 2 billion remain.");
}

// ── FIG 7: the tracker's log, in a browser window ─────────────────────
export function trackerLog() {
  const rows = [
    ["Mon 09:12", "news.example", "uid=7f3a…", "203.0.113.7", ""],
    ["Mon 09:40", "shop.example", "uid=e210…", "203.0.113.7", ""],
    ["Mon 10:05", "news.example", "none (private)", "203.0.113.7", ""],
    ["Mon 13:27", "forum.example", "uid=5b9c…", "198.51.100.42 (VPN)", ""],
    ["Tue 08:50", "news.example", "uid=a01d… (cleared)", "203.0.113.7", ""],
  ];
  const tr = rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td class="hit"><code>ae79acf9</code></td></tr>`).join("");
  return `<div class="stage"><div class="win">
    <div class="chrome"><i></i><i></i><i></i><span class="url">tracker.example / visitors</span></div>
    <div class="win-body split">
      <table class="log">
        <thead><tr><th>time</th><th>site</th><th>cookie</th><th>IP</th><th>fingerprint</th></tr></thead>
        <tbody>${tr}</tbody>
      </table>
      <div class="side-card">
        <div class="mono-s">grouped by fingerprint</div>
        <div class="big">1</div>
        <div>visitor</div>
        <ul><li><b>5</b> visits</li><li><b>3</b> sites</li><li><b>4</b> cookies</li><li><b>2</b> IP addresses</li></ul>
      </div>
    </div>
  </div></div>`;
}

// ── FIG 9: one test, three browsers ───────────────────────────────────
export function threeBrowsers() {
  const H = (s) => hex8(s).slice(0, 4) + "…";
  const visits = [["news.example", "today"], ["shop.example", "today"], ["news.example", "tomorrow"], ["a friend's laptop", "today"]];
  const col = (title, sub, verdict, hashes, alike) => {
    const rowsHtml = visits
      .map((v, i) => `<tr class="${alike[i] ? "same" : ""}"><td>${v[0]}<small>${v[1]}</small></td><td><code>${hashes[i]}</code></td></tr>`)
      .join("");
    return `<div class="win slim">
      <div class="chrome"><i></i><i></i><i></i><span class="url">${title}</span></div>
      <div class="win-body"><div class="mono-s">canvas test · hash</div><table class="log tight"><tbody>${rowsHtml}</tbody></table>
      <div class="verdict">${verdict}</div><div class="mono-s">${sub}</div></div></div>`;
  };
  const openH = [H("mac"), H("mac"), H("mac"), H("thinkpad")];
  const farbH = [H("mac|news|s1"), H("mac|shop|s1"), H("mac|news|s2"), H("thinkpad|news|s1")];
  const uniH = [H("tor"), H("tor"), H("tor"), H("tor")];
  return `<div class="stage three">
    ${col("No protection", "stable and unique", "same ID everywhere, so linkable", openH, [true, true, true, false])}
    ${col("Farbled · Brave", "noise seeded per site and session", "new ID per site, per session", farbH, [false, false, false, false])}
    ${col("Uniform · Tor", "everyone answers the same", "same ID as everybody", uniH, [true, true, true, true])}
  </div>`;
}
