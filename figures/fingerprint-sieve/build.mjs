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
import * as DG from "./diagrams.mjs";

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
    extra: Ln(k.knurl(X, POST_Y, 3.4, Z + 1, Z + 4, 20, P), { tone: "lo" }) + Ln(k.lineOnTop([X - 3.4, POST_Y], [X + 3.4, POST_Y], Z + 4, P), { tone: "hi" }),
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

// ───────────────────────────── the MacBook ─────────────────────────────
function macbook() {
  const W = 900;
  const H = 440;
  const phi = (12 * Math.PI) / 180;
  const BASE = { x: -80, y: -55, w: 160, d: 110, r: 7 };
  const hinge = [0, -55, 6];
  const up = [0, -Math.sin(phi), Math.cos(phi)];
  const normal = [0, Math.cos(phi), Math.sin(phi)];
  const LID = { w: 160, h: 108 };
  const fit = k.fitProjection(
    [...k.boxCorners(BASE, -1, 6), [-80, hinge[1] + up[1] * LID.h, hinge[2] + up[2] * LID.h], [80, hinge[1] + up[1] * LID.h, hinge[2] + up[2] * LID.h]],
    470,
    H - 40,
    { pad: 16, azimuth: 66, elevation: 24 },
  );
  const P2 = { ...fit, origin: [fit.origin[0] + 215, fit.origin[1] + 14] };
  const q = (p) => k.iso(p, P2);
  const onLid = (px, py) => q([hinge[0] + (px - LID.w / 2), hinge[1] + up[1] * (LID.h - py), hinge[2] + up[2] * (LID.h - py)]);
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(BASE, -1, 6, P2)}"/>`);
  // base and its deck
  out.push(S(k.slabOf(BASE, 0, 5, P2, 6, 0.8), { tone: "mid", crease: "lo" }));
  out.push(Ln(k.planOutline(k.insetPlan(BASE, 4), 5, P2, 5), { tone: "faint" }));
  // keyboard: five rows of keys, drawn as outlined caps
  const keys = [];
  const KW = 8.7;
  const KD = 7;
  for (let row = 0; row < 5; row++) {
    const cols = row === 4 ? 9 : 14;
    const span = cols * (KW + 1.2) - 1.2;
    for (let c = 0; c < cols; c++) {
      const wide = row === 4 && c === 4;
      const w = wide ? KW * 4 + 3.6 : KW;
      if (row === 4 && c > 4 && c < 8) continue;
      const x0 = row === 4 ? -span / 2 + c * (KW + 1.2) + (c > 4 ? KW * 3 + 3.6 : 0) : -span / 2 + c * (KW + 1.2);
      keys.push(k.planOutline({ x: x0, y: -45 + row * (KD + 1.3), w, d: KD, r: 1.2 }, 5, P2, 2));
    }
  }
  out.push(Ln(keys.join(""), { tone: "lo" }));
  // trackpad
  const pad = { x: -27, y: 14, w: 54, d: 33, r: 3.5 };
  out.push(Ln(k.planOutline(pad, 5, P2, 4), { tone: "mid" }));
  // speaker grilles either side of the keys
  const grille = [];
  for (const x of [-76.6, -73.2, 72.6, 76.0]) for (let r = 0; r < 11; r++) grille.push(q([x, -43 + r * 3.2, 5]));
  out.push(Dots(grille, { size: 0.42, tone: "mid" }));
  // x-ray of the chip under the keys
  const chip = { x: -20, y: -26, w: 40, d: 24, r: 2 };
  out.push(S(k.slabOf(chip, 5, 0.01, P2, 2), { tone: "lo", crease: "none", flat: true }));
  out.push(`<path class="ln dashed" d="${k.planOutline(chip, 5.1, P2, 2)}" style="stroke-dasharray:3 2.5;stroke:var(--ink)"/>`);
  out.push(Ln(k.planOutline(k.insetPlan(chip, 6), 5.1, P2, 2), { tone: "mid" }));
  // hinge and lid
  out.push(S(G.solidOf([[0, 2.1], [140, 2.1]], G.frameAlong([-70, -55, 6.2], [1, 0, 0]), P2), { tone: "lo", crease: "none" }));
  const lidFrame = G.frameOf(hinge, normal, [1, 0, 0], up);
  out.push(S(G.prismOf(lidFrame, [[-80, 0], [80, 0], [80, LID.h], [-80, LID.h]], -3, 0, P2), { tone: "mid", crease: "lo" }));
  // the screen, drawn in the plane of the lid
  const O = onLid(0, 0);
  const X1 = onLid(1, 0);
  const Y1 = onLid(0, 1);
  const m = `matrix(${(X1[0] - O[0]).toFixed(3)} ${(X1[1] - O[1]).toFixed(3)} ${(Y1[0] - O[0]).toFixed(3)} ${(Y1[1] - O[1]).toFixed(3)} ${O[0].toFixed(2)} ${O[1].toFixed(2)})`;
  const scr = [];
  scr.push(`<rect class="box soft" x="0" y="0" width="160" height="108" rx="4"/>`);
  scr.push(`<rect class="box" x="5" y="5" width="150" height="98" rx="1.5"/>`);
  scr.push(`<circle class="solid" cx="80" cy="2.6" r="0.9"/>`);
  scr.push(`<line class="ln" x1="5" y1="13" x2="155" y2="13" style="stroke-width:.5"/>`);
  scr.push(`<circle class="solid" cx="10" cy="9" r="1.7"/>`);
  scr.push(`<text class="lbl" x="16" y="10.6" style="font-size:4.6px">Chrome</text>`);
  scr.push(`<text class="lbl" x="152" y="10.6" text-anchor="end" style="font-size:4.6px">Mon 09:12</text>`);
  scr.push(`<rect class="box" x="14" y="19" width="132" height="78"/>`);
  scr.push(`<line class="ln" x1="14" y1="28" x2="146" y2="28" style="stroke-width:.5"/>`);
  [19, 23.5, 28].forEach((x) => scr.push(`<circle class="box" cx="${x}" cy="23.5" r="1.4" style="stroke-width:.5"/>`));
  scr.push(`<rect class="box" x="38" y="20.5" width="74" height="6" rx="3" style="stroke-width:.5"/>`);
  scr.push(`<text class="lbl-s" x="43" y="25" style="font-size:4px">news.example</text>`);
  scr.push(`<rect class="solid" x="20" y="34" width="52" height="4.4"/>`);
  scr.push(`<line class="ln2" x1="20" y1="44" x2="76" y2="44"/><line class="ln2" x1="20" y1="49" x2="70" y2="49"/>`);
  scr.push(`<rect class="box" x="20" y="56" width="42" height="34"/><line class="guide" x1="20" y1="56" x2="62" y2="90"/><line class="guide" x1="62" y1="56" x2="20" y2="90"/>`);
  scr.push(`<rect class="box dash" x="86" y="34" width="54" height="36" style="stroke-width:.6"/><text class="lbl-s" x="113" y="53" text-anchor="middle" style="font-size:4.4px">ad</text>`);
  out.push(`<g transform="${m}">${scr.join("")}</g>`);
  // callouts: a part, a probe
  const labels = [
    { n: 1, side: "L", y: 74, title: "display", sub: ["screen.width, height", "devicePixelRatio"], at: onLid(26, 78) },
    { n: 5, side: "L", y: 196, title: "chip (x-ray)", sub: ["hardwareConcurrency", "WebGL renderer string"], at: q([-14, -18, 5.1]) },
    { n: 4, side: "L", y: 318, title: "speakers", sub: ["OfflineAudioContext", "tiny float differences"], at: q([-75.5, -6, 5]) },
    { n: 2, side: "R", y: 74, title: "browser", sub: ["User-Agent", "supported features"], at: onLid(98, 24) },
    { n: 3, side: "R", y: 150, title: "system clock", sub: ["Intl time zone", "locale and calendar"], at: onLid(119, 9) },
    { n: 6, side: "R", y: 300, title: "keyboard and OS", sub: ["navigator.languages", "installed fonts"], at: q([48, -10, 5]) },
  ];
  const callouts = labels
    .map((c) => {
      const left = c.side === "L";
      const x = left ? 24 : W - 24;
      const edge = left ? 214 : W - 214;
      const [ax, ay] = c.at;
      const a = left ? "start" : "end";
      return (
        `<rect class="tag" x="${(left ? x : x - 16).toFixed(1)}" y="${c.y - 12}" width="16" height="16"/><text class="tag-t" x="${(left ? x + 8 : x - 8).toFixed(1)}" y="${c.y - 0.4}" text-anchor="middle">${c.n}</text>` +
        `<text class="lbl" x="${(left ? x + 24 : x - 24).toFixed(1)}" y="${c.y}" text-anchor="${a}">${c.title}</text>` +
        c.sub.map((t, i) => `<text class="lbl-s" x="${(left ? x + 24 : x - 24).toFixed(1)}" y="${c.y + 17 + i * 13}" text-anchor="${a}">${t}</text>`).join("") +
        `<path class="ldr" d="M${edge} ${c.y - 4}H${left ? edge + 16 : edge - 16}L${ax.toFixed(1)} ${ay.toFixed(1)}"/><circle class="tag-dot" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2.6"/>`
      );
    })
    .join("");
  return `<div class="stage isowrap"><svg class="iso-svg flat-iso" viewBox="0 0 ${W} ${H}" role="img" aria-label="A MacBook with its lid open, showing a browser. Six numbered callouts point at the display, browser, system clock, speakers, chip and keyboard, each with the browser API a script uses to read it.">${out.join("")}${callouts}</svg></div>`;
}

// ───────────────────────────── page ─────────────────────────────
const namespaced = (name, file) => {
  const src = readFileSync(file, "utf8");
  const names = [...src.matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]);
  return `const ${name} = (() => {\n${src.replace(/^export /gm, "")}\nreturn { ${names.join(", ")} };\n})();`;
};
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const PROBE = readFileSync(join(HERE, "probe.js"), "utf8");
// the Hairline figures: its kernel untouched, each figure in its own scope, and the page's host
const HL_NAMES = ["halving", "canvas", "survives", "needle"];
const HL_JS = [
  readFileSync(join(HERE, "..", "..", "kit", "hairline-kernel.js"), "utf8"),
  "const HL_FIGS = {};",
  ...HL_NAMES.map((n) => `(function (hairline) {\n${readFileSync(join(HERE, "hl", `${n}.js`), "utf8")}\n})((f) => { HL_FIGS[f.name] = f; });`),
  readFileSync(join(HERE, "hl-host.js"), "utf8"),
].join("\n");
const script = [kitScript(), latheScript(), namespaced("MODEL", join(HERE, "model.mjs")), LIVE, PROBE, HL_JS].join("\n");

let figCount = 0;
const used = {};
const num = (n) => `FIG_${String(n).padStart(3, "0")}`;
const fig = (caption, inner, foot = "", key = "") => {
  figCount += 1;
  if (key) used[key] = num(figCount);
  return `<figure><div class="fh"><b>${num(figCount)}</b><span>[ ${caption} ]</span></div>${inner}${foot ? `<div class="ff">${foot}</div>` : ""}</figure>`;
};
/** A Hairline figure in its card: the drawing, a legend that lights with it, the read-out and a play button. */
const hlFig = (name, caption, lead, items, foot) => {
  figCount += 1;
  const rows = items.map(([a, b], i) => `<li data-k="${i}"><span>${a}</span><b>${b}</b></li>`).join("");
  return `<figure class="hlf"><div class="fh"><b>${num(figCount)}</b><span>[ ${caption} ]</span></div>` +
    `<div class="hl-row"><div class="hl" data-hl="${name}"></div><div class="hl-side"><p class="hl-lead">${lead}</p><ol class="hl-legend" data-hl-legend>${rows}</ol></div></div>` +
    `<div class="ff"><span class="readout" data-hl-read>rest</span><span class="cap-t">${foot}</span><button type="button" class="chip" data-hl-play aria-pressed="false">play tour</button></div></figure>`;
};
const section = (title, text) => `<div class="prose"><h2>${title}</h2>${text ? `<p>${text}</p>` : ""}</div>`;

const modeButtons = M.MODES.map((id, i) => `<button type="button" class="chip" data-mode-btn="${id}"${i === 0 ? " data-on" : ""}>${M.MODE_LABEL[id]}</button>`).join("");
const stationButtons = M.TRAITS.map((t, i) => `<button type="button" class="chip" data-st-btn="${i + 1}"><span class="n">${i + 1}</span>${t.short}</button>`).join("");
const first = M.reading("open", 0);
const sieveFigure = () =>
  `<figure class="fp"><div class="fh"><b>${(figCount += 1, used.sieve = num(figCount))}</b><span>[ seven sieves, one per trait ]</span></div>` +
  `<div class="stage"><div class="fp-stage" tabindex="0" role="group" aria-label="Fingerprint sieve. Move the pointer over a sieve or use the arrow keys to pick a trait; M cycles the protection mode; space pauses the tour.">${svg}</div><span class="live" aria-live="polite" data-announce></span></div>` +
  `<div class="ctl"><span class="ctl-l">protection</span><span class="chips" data-modes>${modeButtons}</span><span class="ctl-l">trait</span><span class="chips" data-stations>${stationButtons}</span></div>` +
  `<div class="step"><b data-step-title></b><span data-step-text></span><span class="mono-s" data-step-stats></span></div>` +
  `<div class="ff"><span class="readout" data-readout>0/${N} · 0 bits · ${M.fmtCount(first.pool)} like you</span><span class="cap-t" data-mode-note></span></div></figure>`;

const probeFigure = () => fig(
  "your browser, measured here",
  `<div class="stage"><div class="win" data-probe>
    <div class="chrome"><i></i><i></i><i></i><span class="url">this page · nothing leaves your device</span></div>
    <div class="win-body">
      <div class="probe-id"><span class="mono-s">fingerprint</span><code data-probe-id>…</code><span data-probe-nick></span></div>
      <div class="scroll"><table class="log probe"><thead><tr><th>probe</th><th>reading</th><th>its hash</th></tr></thead><tbody data-probe-rows></tbody></table></div>
      <div class="ctl flush"><button type="button" class="chip" data-probe-run>measure again</button><button type="button" class="chip" data-probe-noise>add farbling noise</button><button type="button" class="chip" data-probe-clear>noise off</button></div>
      <div class="mono-s" data-probe-same></div>
    </div></div></div>`,
  `<p class="cap-t">One changed pixel moves the whole hash. That is why farbling works, and why an exact match is not needed to link two visits.</p>`,
);

const WORDS = [
  ["fingerprint", "One short ID computed from many readings of a browser and device."],
  ["probe", "A small test a script runs to read one trait, such as the pixels of a hidden canvas."],
  ["bit", "One halving of the crowd. 33 bits single out one person in 8.6 billion."],
  ["farbling", "Brave's defence: small noise on what probes read, seeded per site and per session."],
  ["letterboxing", "Tor's defence: window sizes rounded to fixed steps, so many users share one."],
];
const words = `<dl class="words"><div class="words-h mono-s">WORDS ON THIS PAGE</div>${WORDS.map(([w, d]) => `<div><dt>${w}</dt><dd>${d}</dd></div>`).join("")}</dl>`;

const SOURCES = [
  ["Cover Your Tracks (EFF)", "https://coveryourtracks.eff.org/"],
  ["Mitigating Browser Fingerprinting in Web Specifications (W3C)", "https://www.w3.org/TR/fingerprinting-guidance/"],
  ["Fingerprinting defenses 2.0 (Brave)", "https://brave.com/privacy-updates/4-fingerprinting-defenses-2.0/"],
  ["Understanding browser fingerprinting (Tor Project)", "https://manual-f04e0b.pages.torproject.net/anti-fingerprinting/"],
  ["Browser Fingerprinting: A Survey (Laperdrix et al.)", "https://arxiv.org/abs/1905.01051"],
  ["How Unique Is Your Web Browser? (Eckersley, 2010)", "https://www.springerprofessional.de/en/how-unique-is-your-web-browser/3331922"],
  ["AmIUnique", "https://amiunique.org/"],
  ["JShelter: farbling wrappers", "https://jshelter.org/farbling/"],
];

const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><marker id="ah" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1.2L9 5L1 8.8" fill="none" style="stroke:var(--ink)" stroke-width="1.3" stroke-linejoin="round"/></marker></defs></svg>`;

const body = [
  defs,
  `<nav class="top mono-s"><a href="/">← all figures</a><span>FINGERPRINTING / HOW IT WORKS</span><button type="button" data-theme-toggle>theme</button></nav>`,
  `<header><h1>How does browser fingerprinting work?</h1><p class="dek">Your browser answers a few dozen questions without being asked. Put together, the answers are a name.</p></header>`,
  words,
  section("What is the machine?", "Each sieve is one question. Only the people who answer like you fall through to the next."),
  sieveFigure(),
  section("Who talks to whom?", "A page loads a script from a third party. The script reports one ID, and no cookie is needed."),
  fig("one page view, three machines", DG.requestFlow(), `<p class="cap-t">The tracker sees the same ID on every site that embeds its script.</p>`),
  section("What does the request already say?", "Before any script runs, the headers and the IP have said a lot."),
  fig("a request, as DevTools shows it", DG.requestHeaders(), `<p class="cap-t">Marked rows are the ones that tell machines apart.</p>`),
  section("What can the script read?", "Six parts of the laptop, six probes. None of them asks permission."),
  fig("a MacBook, and what each part gives away", macbook(), `<p class="cap-t">The numbers are the browser APIs a script calls; the parts are where the answer comes from.</p>`),
  section("How does one probe tell machines apart?", "Same drawing code, different rounding. The edge pixels differ, so the hash does."),
  hlFig("canvas", "the canvas probe, on two machines", "Same drawing instructions, run on two machines. Move across the board.", [["A", "MacBook Pro · Safari"], ["B", "ThinkPad · Chrome"]], "Bright pillars are the pixels that come out differently. One changed pixel changes the whole hash."),
  section("Why is that enough?", "Every bit halves the crowd. Thirty-three bits leave one person."),
  hlFig("halving", "every question halves the crowd", "Move along the front to ask more questions. Whoever answers differently drops out.", [0,1,2,3,4,5,6].map((k) => [`${k} question${k === 1 ? "" : "s"}`, k === 6 ? "just you" : `${64 >> k} left`]), "Sixty-four pucks stand in for the crowd. The real one is 8.6 billion, which takes 33 questions."),
  fig("the crowd, as each sieve reads you", DG.crowdChart(), `<p class="cap-t">Bits per trait are illustrative; the arithmetic is exact. Real traits overlap, so real totals are lower.</p>`, "chart"),
  section("What does the tracker see?", "Cookies change and IPs change. The fingerprint does not."),
  fig("a tracker's visitor log", DG.trackerLog()),
  hlFig("needle", "one needle, five visits", "Each card is one visit, cut where it can be told apart. Move the needle across the top.", [["holes 1–2 · cookie", "lifts some visits"], ["holes 3–4 · address", "lifts some visits"], ["holes 5–8 · fingerprint", "lifts all five"]], "The cookie and the address differ between visits. The fingerprint cut is the same on every card, so one pass collects the whole history."),
  section("What changes it?", "Almost nothing you do on purpose."),
  hlFig("survives", "what survives what", "Pick a row. The pegs that action knocks down are what changes. Short is the cookie, middle the address, tall and bright the fingerprint.", [["Clear cookies", "cookie changes"], ["Open a private window", "cookie changes"], ["Switch on a VPN", "address changes"], ["Move to another network", "address changes"], ["Update the browser", "fingerprint may shift"], ["Install a font, change the display", "fingerprint changes"]], "About 37% of returning visitors in the 2010 Panopticlick data showed at least one change, so trackers match loosely."),
  section("How do browsers fight back?", "Three strategies, one test, three answers."),
  fig("the same canvas test in three browsers", DG.threeBrowsers(), `<p class="cap-t">Hashes are illustrative. Brave seeds noise per site and session; Tor makes everyone answer alike.</p>`),
  section("Try it", "Everything here runs in this tab, and nothing is sent."),
  probeFigure(),
  `<footer><div class="mono-s">SOURCES</div><ul>${SOURCES.map(([t, u]) => `<li><a href="${u}">${t}</a></li>`).join("")}</ul><p>Per-trait bit values in ${used.sieve} and ${used.chart} are illustrative round numbers that sum to 33. The study figures and the descriptions of Brave and Tor come from the sources above.</p></footer>`,
].join("\n");

const FONT = readFileSync(join(HERE, "departure-mono.woff2")).toString("base64");
const CSS = `@font-face{font-family:"Departure Mono";src:url(data:font/woff2;base64,${FONT}) format("woff2");font-display:swap}\n` + readFileSync(join(HERE, "fp.css"), "utf8");
const THEME_INIT = `<script>try{var t=new URLSearchParams(location.search).get("theme")||localStorage.getItem("iso-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.body.dataset.theme=t}catch(e){}</script>`;
const THEME_TOGGLE = `document.querySelector("[data-theme-toggle]")?.addEventListener("click",()=>{const next=document.body.dataset.theme==="dark"?"light":"dark";document.body.dataset.theme=next;try{localStorage.setItem("iso-theme",next)}catch(e){}});`;
const page = k.pageHtml({
  title: "How does browser fingerprinting work?",
  theme: THEME,
  body: `${THEME_INIT}<style>${CSS}</style>${body}`,
  script: script + "\n" + THEME_TOGGLE,
  width: 1040,
});
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page);
console.log("wrote", OUT, `${(page.length / 1024).toFixed(0)} KB`, `${R_.items.length} items`);
A.auditOrExit(R_, P);
