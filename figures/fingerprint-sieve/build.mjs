// Builds the fingerprint sieve figure: a cascade of seven sieves, one per trait, on a bench with a bit dial,
// a log scale of the remaining crowd and a protection selector. The picture and the readout come from model.mjs.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import * as A from "../../kit/audit.mjs";
import { kitScript, latheScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const THEME = flag("--dark") ? "dark" : "light";
const OUT = option("--out") ?? join(HERE, "..", "..", "dist", "fingerprint-sieve", "index.html");

// ───────────────────────────── world ─────────────────────────────
const WIDTH = 760;
const HEIGHT = 430;
const N = M.TRAITS.length;
const PITCH = 42;
const X0 = 46;
const STEP_Z = 22;
const Z_LAST = 24;
const R = 14; // sieve cage radius
const RIM = 1.2; // rolled rim beyond the cage
const SH = 5; // cage + rim height
const FUN = 8; // funnel + spout height
const POST_Y = -26;
const BALL = 3.2;
const RAMP_W = 4.8; // half width of a ramp
const BIT_ROW_Y = 27;

// j = 0 is the crowd tray, j = 1..N the sieves
const xOf = (j) => X0 + PITCH * (j - 1);
const zOf = (j) => Z_LAST + STEP_Z * (N - j);

const PLATE = { x: -30, y: -48, w: 424, d: 102, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

// gauges at the far end
const RAIL = { x: 326, y: -8 };
const RAIL_TOP = 116;
const SCALE_Z0 = 12;
const SCALE_Z1 = 108;
const DIAL = { x: 360, y: 6, r: 13, z: 30, h: 8 };
const DIAL_TOP = DIAL.z + DIAL.h;
const DIAL_FROM = Math.PI * 1.15;
const DIAL_SPAN = Math.PI * 1.7;
const KNOB = { x: -12, y: 28 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [xOf(0), 0, zOf(0) + 6],
    [xOf(0) - R - 2, 0, zOf(0)],
    [RAIL.x, RAIL.y, RAIL_TOP + 3],
    [DIAL.x + DIAL.r + 2, DIAL.y, DIAL_TOP],
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 66, elevation: 30 },
);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);

// ───────────────────────────── recorder ─────────────────────────────
const R_ = A.recorder(P);
const record = R_.solid;
function put(name, ref, svg, { bias = 0, shapes = [], cls = "", st = -1 } = {}) {
  return R_.put({ piece: name.split(".")[0], at: ref, bias, svg, shapes, name, cls, st });
}
function slab(name, plan, z, h, style = {}, { steps = 4, bevel = 0, extra = "", inner = "", bias = 0, st = -1, cls = "" } = {}) {
  const shape = record(A.slab(plan, z, h, { name }, steps));
  put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, { bias, shapes: [shape], st, cls });
}
function post(name, cx, cy, r, z, h, style = {}, { steps = 28, bevel = 0, extra = "", inner = "", bias = 0, st = -1, cls = "" } = {}) {
  const shape = record(A.cylinder(cx, cy, r, z, h, { name }));
  put(name, [cx, cy, z + h / 2], S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, { bias, shapes: [shape], st, cls });
}
function turned(name, F, profile, style = {}, { extra = "", inner = "", bias = 0, bevel = 0, steps, st = -1, cls = "" } = {}) {
  const paths = G.solidOf(profile, F, P, { bevel, ...(steps ? { steps } : {}) });
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  const shape = record(A.solid(F, profile, { name }));
  put(name, G.add3(F.o, G.mul3(F.a, mid)), S(paths, { tone: "hi", ...style, inner }) + extra, { bias, shapes: [shape], st, cls });
}
const FRAME_XZ = G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
function prism(name, polygon, s0, s1, style = {}, { extra = "", bias = 0, st = -1, cls = "" } = {}) {
  const shape = record(A.prism(FRAME_XZ, polygon, s0, s1, { name }));
  const cx = polygon.reduce((a, p) => a + p[0], 0) / polygon.length;
  const cz = polygon.reduce((a, p) => a + p[1], 0) / polygon.length;
  put(name, [cx, (s0 + s1) / 2, cz], S(G.prismOf(FRAME_XZ, polygon, s0, s1, P), { tone: "mid", ...style }) + extra, { bias, shapes: [shape], st, cls });
}

// ───────────────────────────── bench ─────────────────────────────
const back = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
for (const [x, y] of k.corners(PLATE, 24)) {
  post(`stand.flange${x}_${y}`, x, y, 7, -PLATE_H - FOOT_H, 1.6, { tone: "lo" });
  post(`stand.foot${x}_${y}`, x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, { tone: "mid" });
}
{
  const screws = k.corners(PLATE, 10);
  const strip = { x: -10, y: PLATE.y + 8, w: 330, d: 7, r: 1 };
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  slab("stand.plate", PLATE, -PLATE_H, PLATE_H, { tone: "mid" }, {
    steps: 8,
    bevel: 1.6,
    extra:
      Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }) +
      Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }) +
      Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }),
  });
  slab("stand.ruler", strip, 0, 0.6, { tone: "lo", crease: "none" }, {
    steps: 3,
    extra: Ln(ticks.minor, { tone: "lo" }) + Ln(ticks.major, { tone: "mid" }) + Dots([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }),
  });
}

// ───────────────────────────── the sieves ─────────────────────────────
// one clamp stand per station: foot, post, clamp block, locking knob, arm into the cage, funnel under it
function meshLines(cx, z, r, pitch) {
  const out = [];
  const n = Math.floor((r - 0.4) / pitch);
  for (let m = -n; m <= n; m++) {
    const t = m * pitch;
    const h = Math.sqrt(r * r - t * t);
    out.push(k.lineOnTop([cx + t, -h], [cx + t, h], z, P));
    out.push(k.lineOnTop([cx - h, t], [cx + h, t], z, P));
  }
  return out.join("");
}
const CROWD = Array.from({ length: 60 }, (_, n) => {
  const r = 10.6 * Math.sqrt((n + 0.5) / 60);
  const a = n * 2.399963;
  return [Math.cos(a) * r, Math.sin(a) * r];
});

function station(j) {
  const X = xOf(j);
  const Z = zOf(j);
  const id = `st${j}`;
  const tray = j === 0;
  // foot, post, clamp, locking knob
  slab(`${id}.foot`, { x: X - 8, y: POST_Y - 6, w: 16, d: 12, r: 2 }, 0, 3, { tone: "lo" }, {
    steps: 3,
    st: j,
    extra: Dots([at([X - 4.6, POST_Y, 3]), at([X + 4.6, POST_Y, 3])], { size: 0.42 }),
  });
  post(`${id}.post`, X, POST_Y, 2.8, 3, Z - 6 - 3, { tone: "mid", crease: "none" }, { steps: 20, st: j, inner: Ln(k.sideArc(X, POST_Y, 2.8, 3 + (Z - 9) * 0.5, P, 14), { tone: "faint" }) });
  slab(`${id}.clamp`, { x: X - 6, y: POST_Y - 6, w: 12, d: 12, r: 2 }, Z - 6, 7, { tone: "mid" }, { steps: 4, bevel: 0.5, st: j });
  post(`${id}.knob`, X, POST_Y, 3.4, Z + 1, 3, { tone: "mid" }, {
    steps: 24,
    st: j,
    extra: Ln(k.knurl(X, POST_Y, 3.4, Z + 1, Z + 4, 20, P), { tone: "lo" }) + Ln(k.lineOnTop([X - 2.2, POST_Y], [X + 3.4, POST_Y], Z + 4, P), { tone: "hi" }),
  });
  slab(`${id}.arm`, { x: X - 3, y: POST_Y + 6, w: 6, d: -(POST_Y + 6) - 13.6, r: 1 }, Z - 4.5, 2.7, { tone: "mid" }, { steps: 3, st: j, extra: Dots([at([X, POST_Y + 9.5, Z - 1.8])], { size: 0.4 }) });
  // funnel and spout, turned about a vertical axis; s = 0 is the bottom of the spout
  {
    const F = G.frameAlong([X, 0, Z - SH - FUN], [0, 0, 1]);
    const profile = [[0, 3.6], [3.2, 3.6], [3.2, 4.6], [4.2, 4.6], [4.2, 5.4], [FUN, R - 0.8]];
    turned(`${id}.funnel`, F, profile, { tone: "mid", crease: "lo" }, { steps: 36, st: j });
  }
  // cage and rolled rim, with the mesh (or the crowd) on top
  const topCage = Z - 1.6;
  const mesh = tray
    ? Ln(k.ring(X, 0, R - 1.0, Z, P, 56), { tone: "lo" }) + Dots(CROWD.map(([dx, dy]) => at([X + dx, dy, Z])), { size: 0.5, tone: "mid" })
    : Ln(k.ring(X, 0, R - 1.0, Z, P, 56), { tone: "lo" }) + `<g class="mesh">${Ln(meshLines(X, Z, R - 1.0, 6.2 - 0.62 * (j - 1)), { tone: "lo" })}</g>`;
  post(`${id}.cage`, X, 0, R, Z - SH, SH - 1.6, { tone: "hi", crease: "lo" }, {
    steps: 56,
    st: j,
    inner: Ln(k.sideArc(X, 0, R, Z - SH + 1.1, P, 40), { tone: "faint" }),
  });
  post(`${id}.rim`, X, 0, R + RIM, topCage, 1.6, { tone: "mid", crease: "lo" }, {
    steps: 60,
    bevel: 0.35,
    st: j,
    extra: mesh,
  });
}
for (let j = 0; j <= N; j++) station(j);

// a ramp from each spout to the next sieve's rim: a sloped plate with two rails
function ramp(j) {
  const xs = xOf(j) - 4.2;
  const zs = zOf(j) - SH - FUN; // top of the ramp at the spout: flush with the bottom of the spout
  const xe = xOf(j + 1) - (R + RIM) + 0.15;
  const ze = zOf(j + 1); // top of the ramp at the rim: flush with the rim top
  const T = 1.6;
  const top = (x) => zs + ((ze - zs) * (x - xs)) / (xe - xs);
  const body = [[xs, zs - T], [xe, ze - T], [xe, ze], [xs, zs]];
  prism(`ramp${j}.plate`, body, -RAMP_W, RAMP_W, { tone: "mid", crease: "lo" }, { st: j });
  for (const side of [-1, 1]) {
    const s0 = side < 0 ? -RAMP_W - 1 : RAMP_W;
    const rail = [[xs, zs], [xe, ze], [xe, ze + 2.2], [xs, zs + 2.2]];
    prism(`ramp${j}.rail${side}`, rail, s0, s0 + 1, { tone: "lo", crease: "none" }, { st: j });
  }
  return { xs, zs, xe, ze, top };
}
const RAMPS = Array.from({ length: N }, (_, j) => ramp(j));

// ───────────────────────────── bit lamps and numerals ─────────────────────────────
const lampSlots = (i) => {
  const count = M.lampsOf(i);
  const x0 = xOf(i + 1) - ((count - 1) * 4.6) / 2;
  return Array.from({ length: count }, (_, s) => [x0 + s * 4.6, BIT_ROW_Y]);
};
for (let i = 0; i < N; i++) {
  const X = xOf(i + 1);
  const plan = { x: X - 19, y: BIT_ROW_Y - 4.5, w: 38, d: 9, r: 2 };
  const slotRings = lampSlots(i).map(([x, y]) => k.ring(x, y, 1.45, 0.8, P, 12)).join("");
  slab(`lamps${i}.strip`, plan, 0, 0.8, { tone: "lo", crease: "none" }, {
    steps: 3,
    st: i + 1,
    extra:
      Ln(slotRings, { tone: "faint" }) +
      k.faceTextSvg(k.topMatrix([X, BIT_ROW_Y + 12], 0, P, "x"), String(i + 1), { size: 5, tone: "mid", anchor: "middle" }),
  });
}

// ───────────────────────────── gauges ─────────────────────────────
{
  const zFor = (scale) => SCALE_Z0 + (SCALE_Z1 - SCALE_Z0) * scale;
  const rail = { x: RAIL.x - 3, y: RAIL.y - 2.5, w: 6, d: 5, r: 0 };
  const yFace = rail.y + rail.d;
  const WB = M.WORLD_BITS;
  const seg = (z, x0, x1) => k.segment([x0, yFace, z], [x1, yFace, z], P);
  const full = [];
  const edge = [];
  const decades = [];
  for (let d = 0; d <= 10; d++) {
    for (const m of [1, 2, 5]) {
      const scale = Math.log2(m * 10 ** d) / WB;
      if (scale > 1.0005) continue;
      const z = zFor(Math.min(1, scale));
      if (m === 1) (d % 3 === 0 ? decades : full).push(seg(z, rail.x, rail.x + rail.w));
      else edge.push(seg(z, rail.x, rail.x + rail.w));
    }
  }
  const top = seg(zFor(1), rail.x, rail.x + rail.w);
  // foot block, then the rail, then ticks on its front face
  slab("gauge.foot", { x: RAIL.x - 8, y: RAIL.y - 7, w: 16, d: 14, r: 2 }, 0, 3, { tone: "lo" }, { steps: 3, extra: Dots([at([RAIL.x - 5, RAIL.y, 3]), at([RAIL.x + 5, RAIL.y, 3])], { size: 0.42 }) });
  slab("gauge.rail", rail, 3, RAIL_TOP - 3, { tone: "mid" }, {
    steps: 3,
    bevel: 0,
    extra: Ln(k.rise([rail.x + rail.w, yFace], 3, RAIL_TOP, P), { tone: "faint" }) + Ln(edge.join(""), { tone: "faint" }) + Ln(full.join(""), { tone: "lo" }) + Ln(decades.join("") + top, { tone: "mid" }),
  });
  post("gauge.cap", RAIL.x, RAIL.y, 3.2, RAIL_TOP, 2.2, { tone: "mid" }, { steps: 16 });
}
{
  // the bit dial: a puck on a post, needle drawn by the live page
  const { x, y, r, z, h } = DIAL;
  post("dial.base", x, y, 8, 0, 3, { tone: "lo" }, { steps: 28 });
  post("dial.post", x, y, 2.8, 3, z - 3, { tone: "mid", crease: "none" }, { steps: 20, inner: Ln(k.sideArc(x, y, 2.8, 16, P, 12), { tone: "faint" }) });
  const ticks = k.radialTicks(x, y, r - 3, 33, 5, DIAL_TOP, [1.2, 2.6], P, DIAL_FROM, DIAL_SPAN);
  post("dial.puck", x, y, r, z, h, { tone: "hi", crease: "lo" }, {
    steps: 56,
    bevel: 0.7,
    extra:
      Ln(k.knurl(x, y, r, DIAL_TOP - 3.2, DIAL_TOP, 72, P, 0.3), { tone: "lo" }) +
      Ln(k.ring(x, y, r - 2.2, DIAL_TOP, P, 56), { tone: "lo" }) +
      Ln(ticks.minor, { tone: "lo" }) +
      Ln(ticks.major, { tone: "mid" }) +
      k.faceTextSvg(k.topMatrix([x, y + 10.2], DIAL_TOP, P, "x"), "bits", { size: 2.2, tone: "lo", anchor: "middle" }),
    inner: Ln(k.sideArc(x, y, r, DIAL_TOP - 3.4, P, 40), { tone: "faint" }),
  });
}

// ───────────────────────────── protection selector ─────────────────────────────
const DETENT = [-50, 0, 50].map((deg) => (deg * Math.PI) / 180);
const pointerAt = (theta, base = 1.6, length = 6.0) => {
  const sx = Math.sin(theta);
  const sy = -Math.cos(theta);
  return k.lineOnTop([KNOB.x + sx * base, KNOB.y + sy * base], [KNOB.x + sx * length, KNOB.y + sy * length], 7.2, P);
};
{
  const detents = DETENT.map((theta) => k.lineOnTop([KNOB.x + Math.sin(theta) * 10, KNOB.y - Math.cos(theta) * 10], [KNOB.x + Math.sin(theta) * 13, KNOB.y - Math.cos(theta) * 13], 0, P)).join("");
  post("selector.base", KNOB.x, KNOB.y, 10, 0, 2, { tone: "lo" }, { steps: 36, extra: Ln(detents, { tone: "mid" }) + Ln(k.ring(KNOB.x, KNOB.y, 7.6, 2, P, 28), { tone: "faint" }) });
  post("selector.knob", KNOB.x, KNOB.y, 6.8, 2, 5.2, { tone: "mid" }, {
    steps: 32,
    bevel: 0.4,
    extra: Ln(k.knurl(KNOB.x, KNOB.y, 6.8, 2, 7.2, 30, P), { tone: "lo" }),
  });
}

// ───────────────────────────── paint ─────────────────────────────
const SOLVED = A.settle(R_, P);
if (flag("--debug")) console.log("dropped rules", SOLVED.solved.dropped?.length ?? 0, "cycles", SOLVED.solved.cycles?.length ?? 0);
R_.items.sort((a, b) => a.key - b.key);
const groups = R_.items.map((item) => `<g class="it${item.cls ? ` ${item.cls}` : ""}"${item.st >= 0 ? ` data-st="${item.st}"` : ""}>${item.svg}</g>`).join("");

// live layers: lamps (rebuilt by the page), the pool slider, the needle, the selector pointer, the ball
const lampLayers = M.TRAITS.map((_, i) => `<g data-lamps="${i}">${Dots(lampSlots(i).map(([x, y]) => at([x, y, 0.8])), { size: 0.5, tone: "lo" })}</g>`).join("");
const SLIDER_Z = SCALE_Z0 - 2.5;
const sliderPlan = { x: RAIL.x + 3, y: RAIL.y - 3, w: 9, d: 6, r: 1.2 };
const slider =
  `<g data-part="slider" transform="${k.translateAlong(P, [0, 0, (SCALE_Z1 - SCALE_Z0)])}">` +
  S(k.slabOf(sliderPlan, SLIDER_Z, 5, P, 3, 0.4), { tone: "hi", crease: "lo" }) +
  Ln(k.segment([RAIL.x - 3, RAIL.y + 2.5, SCALE_Z0], [RAIL.x + 3, RAIL.y + 2.5, SCALE_Z0], P), { tone: "hi" }) +
  `</g>`;
const needleAt = (frac) => {
  const angle = DIAL_FROM + DIAL_SPAN * frac;
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return k.lineOnTop([DIAL.x - sx * 3.2, DIAL.y - sy * 3.2], [DIAL.x + sx * (DIAL.r - 4), DIAL.y + sy * (DIAL.r - 4)], DIAL_TOP + 0.2, P);
};
const needle = `<path data-part="needle" class="iso-line" data-tone="hi" data-free="start" d="${needleAt(0)}" style="stroke-width:1.1"/>` + Ln(k.ring(DIAL.x, DIAL.y, 1.6, DIAL_TOP + 0.2, P, 16), { tone: "mid" });
const knobAt = at([KNOB.x, KNOB.y, 4]);
const hit = `<circle data-selector cx="${knobAt[0].toFixed(1)}" cy="${knobAt[1].toFixed(1)}" r="15" fill="transparent" style="cursor:pointer"/>`;
const pointer = `<path data-part="pointer" class="iso-line" data-tone="hi" d="${pointerAt(DETENT[0])}" style="stroke-width:1.1"/>`;
const ballPaths = G.sphereOf([0, 0, 0], BALL, P, { steps: 40 });
const ball = `<g data-part="ball" class="fp-ball" transform="${k.translateAlong(P, [xOf(0), 0, zOf(0) + BALL])}">${S(ballPaths, { tone: "hi", lit: true })}</g>`;

const DATA = {
  P,
  width: WIDTH,
  N,
  xs: Array.from({ length: N + 1 }, (_, j) => xOf(j)),
  zs: Array.from({ length: N + 1 }, (_, j) => zOf(j)),
  ramps: RAMPS.map(({ xs, zs, xe, ze }) => ({ xs, zs, xe, ze })),
  ball: BALL,
  base: { x: xOf(0), z: zOf(0) + BALL },
  slider: { z0: SCALE_Z0, z1: SCALE_Z1 },
  dial: { from: DIAL_FROM, span: DIAL_SPAN, x: DIAL.x, y: DIAL.y, r: DIAL.r, top: DIAL_TOP },
  knob: { x: KNOB.x, y: KNOB.y, detent: DETENT },
  lamps: M.TRAITS.map((_, i) => lampSlots(i)),
  lampZ: 0.8,
  traits: M.TRAITS,
  modes: { list: M.MODES, label: M.MODE_LABEL, note: M.MODE_NOTE },
  world: M.WORLD,
};

const LABEL =
  "A cascade of seven sieves on a bench, stepping down from a crowd tray on the left. Each sieve stands for one trait of a browser: request headers, screen, time zone, hardware, canvas, WebGL and audio. A lit ball, the visitor, rolls down a ramp from sieve to sieve; at each one a row of lamps counts the bits that trait removes from the crowd. A dial shows the bits so far and a vertical log scale shows how many people still look like the visitor. A selector switches between no protection, farbled values and uniform values.";
const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [back.join(""), groups, lampLayers, slider, needle, pointer, hit, ball] });

// ───────────────────────────── page ─────────────────────────────
const namespaced = (name, file) => {
  const src = readFileSync(file, "utf8");
  const names = [...src.matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]);
  return `const ${name} = (() => {\n${src.replace(/^export /gm, "")}\nreturn { ${names.join(", ")} };\n})();`;
};
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const PROBE = readFileSync(join(HERE, "probe.js"), "utf8");
const script = [kitScript(), latheScript(), namespaced("MODEL", join(HERE, "model.mjs")), LIVE, PROBE].join("\n");

const first = M.reading("open", 0);
const corners = `<div class="iso-plate-corners" aria-hidden="true"><span class="iso-plate-corner" data-corner="fig">Fig 1</span><span class="iso-plate-corner" data-corner="title">Fingerprint sieve</span><span class="iso-plate-corner" data-corner="hint">Hover a sieve · M changes protection</span><span class="iso-plate-corner" data-corner="readout" data-readout>0/${N} · 0 bits · ${M.fmtCount(first.pool)} like you</span></div>`;
const modeButtons = M.MODES.map((id, index) => `<button type="button" class="fp-chip" data-mode-btn="${id}"${index === 0 ? " data-on" : ""}>${M.MODE_LABEL[id]}</button>`).join("");
const stationButtons = M.TRAITS.map((t, i) => `<button type="button" class="fp-chip" data-st-btn="${i + 1}"><span class="fp-num">${i + 1}</span>${t.short}</button>`).join("");
const stage = `<div class="fp-stage" tabindex="0" role="group" aria-label="Fingerprint sieve. Move the pointer over a sieve or use the arrow keys to pick a trait; M cycles the protection mode; space pauses the tour.">${svg}</div><span class="fp-live" aria-live="polite" data-announce></span>`;
const figure =
  `<figure class="iso-figure fp"><div class="iso-plate">${corners}${stage}</div>` +
  `<figcaption class="iso-legend">` +
  `<span class="fp-rows"><span class="fp-row-label">Protection</span><span class="fp-chips" data-modes>${modeButtons}</span></span>` +
  `<span class="fp-rows"><span class="fp-row-label">Trait</span><span class="fp-chips" data-stations>${stationButtons}</span></span>` +
  `<span class="fp-step" data-step><span class="fp-step-title" data-step-title></span><span class="fp-step-text" data-step-text></span><span class="fp-step-stats" data-step-stats></span></span>` +
  `<span class="fp-mode-note" data-mode-note></span>` +
  `<span class="iso-caption">The ball is the visitor. Each sieve is one kind of question, and its lamps count the bits it removes from the crowd: a filled lamp identifies you from visit to visit, a ring is a bit the protection took away or scrambled. The dial counts bits; the scale beside it counts how many people still look like you, ten times fewer at every major mark. The bit value of each trait is illustrative; the arithmetic is exact.</span>` +
  `</figcaption></figure>`;

const body = readFileSync(join(HERE, "page.html"), "utf8").replace("__FIGURE__", figure);
const CSS = readFileSync(join(HERE, "fp.css"), "utf8");
const THEME_INIT = `<script>try{var t=new URLSearchParams(location.search).get("theme")||localStorage.getItem("iso-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.body.dataset.theme=t}catch(e){}</script>`;
const THEME_TOGGLE = `document.querySelector("[data-theme-toggle]")?.addEventListener("click",()=>{const next=document.body.dataset.theme==="dark"?"light":"dark";document.body.dataset.theme=next;try{localStorage.setItem("iso-theme",next)}catch(e){}});`;
const page = k.pageHtml({
  title: "How browser fingerprinting identifies you",
  theme: THEME,
  body: `${THEME_INIT}<style>${CSS}</style>${body}`,
  script: script + "\n" + THEME_TOGGLE,
  width: 880,
});
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page);
console.log("wrote", OUT, `${(page.length / 1024).toFixed(0)} KB`, `${R_.items.length} items`);
A.auditOrExit(R_, P);
