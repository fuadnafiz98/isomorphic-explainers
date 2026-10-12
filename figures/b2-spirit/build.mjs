import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../kit/tube.mjs";
import * as A from "../../kit/audit.mjs";
import { kitScript, latheScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import * as SH from "./shared.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
// the page follows the reader's system theme (or ?theme=dark); --dark only changes the theme it is built with
const THEME = flag("--dark") ? "dark" : "light";
const OUT = option("--out") ?? join(HERE, "..", "..", "dist", "b2-spirit", "index.html");
const DEG = Math.PI / 180;

// ───────────────────────────── world ─────────────────────────────
const WIDTH = 720;
const HEIGHT = 400;
const K = SH.K;
const ZB = SH.ZB; // underside of the wing above the bench top
const WING_H = SH.WING_H;
const BLEND_H = 1.6;
const ZF = ZB + WING_H + BLEND_H; // floor of the open centre body
const BAY_H = 7.4;
const ZT = ZF + BAY_H; // top of the centre body

const PLATE = { x: -150, y: -60, w: 300, d: 146, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;

const at2 = SH.at2;
const at3 = (u, v, z) => [u * K, (v - 10.5) * K, z];
const mirror = ([u, v]) => [-u, v];
const edgeV = (a, b, u) => a[1] + ((b[1] - a[1]) * (u - a[0])) / (b[0] - a[0]);

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...M.TEETH.flatMap((t) => [at3(...t.apex, ZB + 6), at3(...mirror(t.apex), ZB + 6)]),
    at3(...M.NOSE, ZT + 8),
    at3(...M.TIP, ZB + 8),
    at3(...mirror(M.TIP), ZB + 8),
    at3(...M.C, ZB + 4),
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 66, elevation: 40 },
);
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);

// ───────────────────────────── recorder ─────────────────────────────
const R = A.recorder(P);
const { items, nameFor } = R;
const record = R.solid;
const SYSTEM = { airframe: "frame", surface: "control", stick: "control", stand: "stand", engine: "engines", duct: "engines", bay: "payload", fcc: "control", dial: "control" };
function put(name, ref, svg, { bias = 0, shapes = [], cls = "", ...rest } = {}) {
  const piece = name.split(".")[0];
  return R.put({ piece, at: ref, bias, svg, shapes, name, sys: SYSTEM[piece] ?? "frame", cls, ...rest });
}
const centreOf = (ring, z) => [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length, z];

function slab(name, plan, z, h, style = {}, { steps = 4, bevel = 0, extra = "", inner = "", bias = 0, cls = "" } = {}) {
  const shape = record(A.slab(plan, z, h, { name }, steps));
  put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, { bias, shapes: [shape], cls });
}
function prism(name, ring, z, h, style = {}, { bevel = 0, extra = "", inner = "", bias = 0, convex = true, cls = "" } = {}) {
  const shape = record(A.extruded(ring, z, h, { name }));
  put(name, centreOf(ring, z + h / 2), S(k.extrude(ring, z, h, P, { bevel, convex }), { tone: "hi", ...style, inner }) + extra, { bias, shapes: [shape], cls });
}
function post(name, cx, cy, r, z, h, style = {}, { steps = 28, extra = "", inner = "", bias = 0, cls = "" } = {}) {
  const shape = record(A.cylinder(cx, cy, r, z, h, { name }));
  put(name, [cx, cy, z + h / 2], S(k.cylinder(cx, cy, r, z, h, P, steps), { tone: "mid", ...style, inner }) + extra, { bias, shapes: [shape], cls });
}
function turned(name, F, profile, style = {}, { extra = "", inner = "", bias = 0, bevel = 0, steps, rims, smooth, cls = "", owner } = {}) {
  const options = { bevel, ...(steps ? { steps } : {}), ...(rims ? { rims } : {}), ...(smooth !== undefined ? { smooth } : {}) };
  const paths = G.solidOf(profile, F, P, options);
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  const shape = record(A.solid(F, profile, { name, owner }));
  put(name, G.add3(F.o, G.mul3(F.a, mid)), S(paths, { tone: "hi", ...style, inner }) + extra, { bias, shapes: [shape], cls });
}
function route(name, points, r, { tone = "hi", maxLength = 14, spacing, bias = 0, cls = "", gaps = [], caps = true, breaks = [], ends, limp = false, touch } = {}) {
  R.route(name, points, r, { owner: name, gaps, ends, limp, touch, piece: name.split(".")[0] });
  tubePieces(points, r, P, { maxLength, spacing, gaps, caps, breaks }).forEach((part, index) =>
    put(`${name}:${index}`, part.mid, tubeSvg(part, { tone }), { bias, cls, route: name, chunk: index, shapes: [A.tube(part.points, part.radii, { name })] }),
  );
}

// ───────────────────────────── bench ─────────────────────────────
const back = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
for (const [x, y] of k.corners(PLATE, 24)) {
  post(`stand.foot-flange${x}${y}`, x, y, 7, -PLATE_H - FOOT_H, 1.6, { tone: "lo" });
  post(`stand.foot${x}${y}`, x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, { tone: "mid" });
}
{
  const screws = k.corners(PLATE, 10);
  const strip = { x: -130, y: PLATE.y + PLATE.d - 16, w: 200, d: 7, r: 1 };
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  slab("stand.plate", PLATE, -PLATE_H, PLATE_H, { tone: "mid" }, {
    steps: 8,
    bevel: 1.6,
    extra:
      Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }) +
      Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }) +
      Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }),
  });
  slab("stand.ruler", strip, 0, 0.6, { tone: "lo", crease: "none" }, { steps: 3, extra: Ln(ticks.minor, { tone: "lo" }) + Ln(ticks.major, { tone: "mid" }) + Dots([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }) });
}

// cradle posts under the wing
const POSTS = [
  [-46, 24],
  [46, 24],
  [-100, 21],
  [100, 21],
];
for (const [x, y] of POSTS) {
  const id = `${x}_${y}`;
  post(`stand.collar${id}`, x, y, 6, 0, 3.4, { tone: "mid" });
  post(`stand.post${id}`, x, y, 3.4, 3.4, ZB - 3.4 - 3, { tone: "mid", crease: "none" }, { steps: 20, inner: Ln(k.sideArc(x, y, 3.4, 12, P, 16), { tone: "faint" }) });
  post(`stand.pad${id}`, x, y, 5, ZB - 3, 3, { tone: "mid" }, { steps: 24 });
}

// ───────────────────────────── airframe ─────────────────────────────
const HZ = ZB + WING_H; // top of the plain wing
const WING = [M.NOSE, M.TIP, M.S0, [5.6, 16.32], [-5.6, 16.32], mirror(M.S0), mirror(M.TIP)];
const wingRing = WING.map(([u, v]) => at2(u, v));
// a faint outline just inside the edge, and access panels whose edges run in the wing's own directions
const inset = (ring, by) => {
  const c = [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
  return ring.map(([x, y]) => {
    const dx = c[0] - x;
    const dy = c[1] - y;
    const d = Math.hypot(dx, dy);
    return [x + (dx / d) * by, y + (dy / d) * by];
  });
};
const wingLines = [k.onTop(inset(wingRing, 4.5), HZ, P, true)];
const LEN = Math.hypot(...M.TIP);
const le = [M.TIP[0] / LEN, M.TIP[1] / LEN];
function panelOutline(u0, v0, along, across, sign = 1) {
  const a = [u0, v0];
  const b = [u0 + sign * le[0] * along, v0 + le[1] * along];
  const spar = [-1, 0];
  const c = [b[0] + spar[0] * across * sign, b[1] + spar[1] * across];
  const d = [a[0] + spar[0] * across * sign, a[1] + spar[1] * across];
  return [a, b, c, d].map(([u, v]) => at2(u, v));
}
for (const sign of [1, -1]) {
  wingLines.push(k.onTop(panelOutline(sign * 13.0, 9.2, 5.4, 4.0, sign), HZ, P, true));
  wingLines.push(k.onTop(panelOutline(sign * 18.0, 11.8, 6.2, 3.4, sign), HZ, P, true));
}
{
  const ring = wingRing.map(([x, y]) => [x + 5, y + 4]);
  put("stand.shadow", centreOf(ring, 0.2), `<path class="iso-halo b2-shadow" d="${k.extrude(ring, 0.15, 0.1, P).fill}"/>`, { shapes: [record(A.extruded(ring, 0.15, 0.1, { name: "stand.shadow" }))] });
}
prism("airframe.wing", wingRing, ZB, WING_H, { tone: "hi", crease: "lo" }, { bevel: 0.7, inner: Ln(wingLines.join(""), { tone: "faint" }) });

// the centre body: a hexagon; the starboard half is cut away
const BODY_V = 13.4; // rear wall, leaving room behind it for the actuator pods
const CUT_U = 1.0;
const HEX = { c0: [0, 0.8], c1: [10.5, 6.4], c2: [9.5, BODY_V], c3: [-9.5, BODY_V], c4: [-10.5, 6.4] };
const SKIN = [[CUT_U, edgeV(HEX.c0, HEX.c1, CUT_U)], HEX.c0, HEX.c4, HEX.c3, [CUT_U, BODY_V]];
const skinLines = [];
// four inlet mouths (two per side) and four exhaust troughs on the covered half, mirrored from the open half
const INLET_U = [5.7, 8.0];
for (const u of INLET_U.map((value) => -value)) {
  const v0 = edgeV(HEX.c0, HEX.c4, u) + 0.9;
  skinLines.push(k.planOutline({ x: u * K - 3.2, y: (v0 - 10.5) * K, w: 6.4, d: 5.2, r: 2 }, ZT, P, 6));
  skinLines.push(k.planOutline({ x: u * K - 3.0, y: (10.3 - 10.5) * K, w: 6.0, d: 10.0, r: 1.5 }, ZT, P, 5));
}
prism("airframe.skin", SKIN.map(([u, v]) => at2(u, v)), HZ, ZT - HZ, { tone: "hi", crease: "lo" }, { bevel: 0.7, inner: Ln(skinLines.join(""), { tone: "lo" }) });

// the open half: a floor, and a single C-shaped wall round it
const OPEN = [[CUT_U, edgeV(HEX.c0, HEX.c1, CUT_U)], HEX.c1, HEX.c2, [CUT_U, BODY_V]];
const WALL_T = 0.55;
const lineAt = (p, q) => {
  const d = [q[0] - p[0], q[1] - p[1]];
  const l = Math.hypot(...d);
  return { p, d: [d[0] / l, d[1] / l] };
};
const meet = (l1, l2) => {
  const det = l1.d[0] * -l2.d[1] - l1.d[1] * -l2.d[0];
  const t = ((l2.p[0] - l1.p[0]) * -l2.d[1] - (l2.p[1] - l1.p[1]) * -l2.d[0]) / det;
  return [l1.p[0] + l1.d[0] * t, l1.p[1] + l1.d[1] * t];
};
const OPEN_EDGES = [0, 1, 2].map((i) => lineAt(OPEN[i], OPEN[i + 1]));
// shift every edge toward the inside of the open half, toward its centroid
const centroid = [OPEN.reduce((s, p) => s + p[0], 0) / 4, OPEN.reduce((s, p) => s + p[1], 0) / 4];
const IN = OPEN_EDGES.map((e) => {
  let n = [-e.d[1], e.d[0]];
  if ((centroid[0] - e.p[0]) * n[0] + (centroid[1] - e.p[1]) * n[1] < 0) n = [-n[0], -n[1]];
  return { p: [e.p[0] + n[0] * WALL_T, e.p[1] + n[1] * WALL_T], d: e.d, n };
});
const B1 = meet(IN[0], IN[1]);
const B2 = meet(IN[1], IN[2]);
const cutLine = { p: [CUT_U, 0], d: [0, 1] };
const B0 = meet(IN[0], cutLine);
const B3 = meet(IN[2], cutLine);
// front, side and rear wall meet on the corner miters, so each is a plain convex block
const WALLS = [
  [OPEN[0], OPEN[1], B1, B0],
  [OPEN[1], OPEN[2], B2, B1],
  [OPEN[2], OPEN[3], B3, B2],
];
prism("airframe.floor", OPEN.map(([u, v]) => at2(u, v)), HZ, ZF - HZ, { tone: "hi", crease: "lo" }, { bevel: 0.4 });
WALLS.forEach((ring, index) => prism(`airframe.wall${index}`, ring.map(([u, v]) => at2(u, v)), ZF, BAY_H, { tone: "hi", crease: "lo" }, { bevel: 0.4 }));
const wallInner = (u) => {
  // a point on the inner face of the front wall at plan coordinate u
  const e = IN[0];
  const t = (u - e.p[0]) / e.d[0];
  return [u, e.p[1] + e.d[1] * t];
};

// ───────────────────────────── interior (the cavity) ─────────────────────────────
const CAV = "b2-in";
// flight computers: a 2 x 2 rack behind the front wall
for (let i = 0; i < 4; i++) {
  const u = 1.55 + (i % 2) * 1.4;
  const v = 3.7 + Math.floor(i / 2) * 1.2;
  const plan = { x: u * K, y: (v - 10.5) * K, w: 1.15 * K, d: 1.0 * K, r: 0.8 };
  slab(`fcc.box${i}`, plan, ZF, 2.4, { tone: "mid" }, {
    steps: 3,
    bevel: 0.35,
    cls: CAV,
    extra: Dots([0.3, 0.55, 0.8].map((f) => at([plan.x + plan.w * f, plan.y + plan.d - 0.1, ZF + 1.8])), { size: 0.45, tone: "hi" }),
  });
}
// the weapons bay: a rotary launcher, eight stations between two end plates, resting on the bay floor
{
  const R_PLATE = 3.1;
  const R_RING = 2.1;
  const R_STORE = 0.9;
  const FLOOR_T = 0.5;
  const zc = ZF + FLOOR_T + R_PLATE;
  const F = G.frameOf(at3(2.7, 6.2, zc), [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const bay = { x: 1.4 * K, y: (6.0 - 10.5) * K, w: 2.6 * K, d: 6.4 * K, r: 1.5 };
  slab("bay.floor", bay, ZF, FLOOR_T, { tone: "lo", crease: "none" }, { steps: 4, cls: CAV, extra: Ln(k.planOutline(k.insetPlan(bay, 1.4), ZF + FLOOR_T, P, 4), { tone: "faint" }) });
  const LEN = 32;
  turned("bay.spindle", F, [[1.0, 0.8], [LEN - 0.8, 0.8]], { tone: "mid", crease: "none" }, { steps: 16, cls: CAV, owner: "bay.rack" });
  turned("bay.plate-front", F, [[0.2, R_PLATE], [1.0, R_PLATE]], { tone: "mid", crease: "lo" }, { steps: 40, cls: CAV, owner: "bay.rack" });
  turned("bay.plate-rear", F, [[LEN - 0.8, R_PLATE], [LEN, R_PLATE]], { tone: "mid", crease: "lo" }, { steps: 40, cls: CAV, owner: "bay.rack" });
  for (let s = 0; s < 8; s++) {
    const a = (s / 8) * Math.PI * 2 + Math.PI / 8;
    const centre = [F.o[0] + Math.cos(a) * R_RING, F.o[1], F.o[2] + Math.sin(a) * R_RING];
    const Fs = G.frameOf(centre, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    // a bomb: blunt nose toward the cockpit, the tail toward the viewer
    turned(`bay.store${s}`, Fs, [[1.0, 0.0], [1.0, 0.45], [2.4, 0.82, 1], [6, R_STORE], [LEN - 8, R_STORE], [LEN - 2.4, 0.5, 1], [LEN - 0.9, 0.3], [LEN - 0.8, 0]], { tone: "hi", crease: "none" }, { steps: 14, cls: CAV, smooth: false, owner: "bay.rack" });
  }
}
// engines, S-ducts and exhaust ramps
const R_DUCT = 2.2;
const ENGINE_V = 7.5;
function engine(index, u) {
  const zc = ZF + 3.4;
  const F = G.frameOf(at3(u, ENGINE_V, zc), [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const profile = [
    [0, 2.9],
    [0, 3.4],
    [0.9, 3.4],
    [0.9, 3.0],
    [10.5, 3.0],
    [10.5, 3.3],
    [11.7, 3.3],
    [11.7, 2.95],
    [13.5, 2.95],
    [18.5, 2.4],
  ];
  const ribs = G.ribsOf(F, 1.2, 10.2, 3.0, 20, P, { fade: [0.1, 0.55], seams: true });
  turned(`engine.core${index}`, F, profile, { tone: "hi", crease: "lo" }, { steps: 28, cls: CAV, extra: k.fadedSvg(ribs, { tone: "lo" }) });
  // inlet: leaves the inside of the front wall, bends over to the engine axis and settles onto the fan face
  const [mu, mv] = wallInner(u - 0.2);
  const n = IN[0].n;
  const start = at3(mu, mv, ZF + 4.9);
  const lead = [start[0] + n[0] * 4, start[1] + n[1] * 4, ZF + 4.9];
  const leadV = lead[1] / K + 10.5;
  const duct = G.fillet([start, lead, at3(u, leadV + 0.9, zc + 0.9), at3(u, leadV + 1.7, zc), at3(u, ENGINE_V, zc)], 6, 7, { P, tube: R_DUCT });
  route(`duct.inlet${index}`, duct, R_DUCT, { tone: "hi", cls: CAV, maxLength: 12 });
  // exhaust: out of the nozzle and up onto the rear wall
  const wallV = BODY_V - WALL_T;
  const ex = G.fillet([at3(u, ENGINE_V + 3.7, zc), at3(u, ENGINE_V + 4.4, zc), at3(u, wallV - 0.3, zc + 1.4), at3(u, wallV, zc + 1.4)], 3);
  route(`duct.exhaust${index}`, ex, 2.0, { tone: "hi", cls: CAV, maxLength: 12 });
}
INLET_U.forEach((u, i) => engine(i, u));

// ───────────────────────────── control surfaces ─────────────────────────────
const HINGE_Z = ZB + WING_H;
// the rear spar: a low bar along the hinge line on each side and across the centre
{
  const bar = (a, b, name) => {
    const quad = [[a[0], a[1] - 0.8], [b[0], b[1] - 0.8], [b[0], b[1] - 0.1], [a[0], a[1] - 0.1]].map(([u, v]) => at2(u, v));
    prism(name, quad, HINGE_Z, 0.9, { tone: "mid", crease: "lo" }, { bevel: 0.25 });
  };
  bar(M.S0, [5.6, 16.32], "airframe.spar-R");
  bar([-5.6, 16.32], mirror(M.S0), "airframe.spar-L");
  bar([5.6, 16.32], [-5.6, 16.32], "airframe.spar-C");
}
const LIB = { prismOf: G.prismOf, solidSvg: k.solidSvg, segment: k.segment, lineSvg: k.lineSvg, frameAlong: G.frameAlong, solidOf: G.solidOf, lineOnTop: k.lineOnTop };
const SURFACES = [];
let NEEDLE = "";
for (const side of [1, -1]) {
  for (const tooth of [...M.TEETH, ...(side > 0 ? [M.BEAVER] : [])]) {
    const sid = side > 0 ? "R" : "L";
    const halves = tooth.id === "rudder" ? ["up", "down"] : [null];
    for (const half of halves) {
      const id = `${sid}-${tooth.id}${half ? `-${half}` : ""}`;
      const frame = SH.panelFrame(tooth, side, 0);
      if (half) frame.F.o[2] += half === "up" ? SH.PANEL_T / 4 : -SH.PANEL_T / 4;
      const F = G.frameOf(frame.F.o, frame.F.a, frame.F.u, frame.F.v);
      const thick = half ? SH.PANEL_T / 2 : SH.PANEL_T;
      const shape = record(A.prism(F, frame.polygon, -thick / 2, thick / 2, { name: `surface.${id}` }));
      put(`surface.${id}`, G.add3(F.o, G.mul3(F.u, frame.pu / 2)), `<g data-panel="${id}">${SH.panelMarkup(LIB, P, tooth, side, 0, half)}</g>`, { bias: 5, shapes: [shape] });
      SURFACES.push({ id, tooth: tooth.id, side, half });
    }
    // actuator pod on the wing ahead of the hinge
    const o = SH.podOrigin(tooth, side);
    const FP = G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    turned(`surface.pod${sid}-${tooth.id}`, FP, [[0, 0.8], [0, 0.95], [6.5, 0.95], [6.5, 0.6], [9, 0.6]], { tone: "mid", crease: "lo" }, { steps: 16 });
  }
}

// ───────────────────────────── canopy, plates, nose ─────────────────────────────
{
  const bump = [[0, 1.3], [1.0, 2.3], [1.0, 4.7], [-1.0, 4.7], [-1.0, 2.3]];
  const win = [
    [-0.75, 2.7, 0.65, 0.85],
    [0.1, 2.7, 0.65, 0.85],
    [-0.8, 3.85, 0.5, 0.6],
    [0.3, 3.85, 0.5, 0.6],
  ];
  const lines = win.map(([u, v, w, d]) => k.planOutline({ x: u * K, y: (v - 10.5) * K, w: w * K, d: d * K, r: 1 }, ZT + 2.4, P, 3));
  prism("airframe.canopy", bump.map(([u, v]) => at2(u, v)), ZT, 2.4, { tone: "hi", crease: "lo" }, { bevel: 0.6, inner: Ln(lines.join(""), { tone: "mid" }) });
  // air-data plates in place of pitot tubes
  for (const u of [-3.7]) {
    const plan = { x: u * K - 3, y: (3.2 - 10.5) * K, w: 6, d: 4, r: 1 };
    slab("airframe.plate", plan, ZT, 0.5, { tone: "mid", crease: "none" }, { steps: 3, extra: Dots([0.25, 0.5, 0.75].map((f) => at([plan.x + plan.w * f, plan.y + plan.d / 2, ZT + 0.5])), { size: 0.4 }) });
  }
}

// ───────────────────────────── pilot's stick and dial ─────────────────────────────
const STICK = SH.STICK_AT;
const STICK_BASE_H = SH.STICK_BASE_H;
{
  const base = { x: STICK[0] - 19, y: STICK[1] - 12, w: 38, d: 24, r: 3 };
  slab("stand.stick-base", base, 0, STICK_BASE_H, { tone: "mid" }, {
    steps: 4,
    bevel: 0.7,
    extra: Ln(k.planOutline(k.insetPlan(base, 2.6), STICK_BASE_H, P, 3), { tone: "faint" }) + Dots(k.corners(base, 4).map(([x, y]) => at([x, y, STICK_BASE_H])), { size: 0.45 }),
  });
  const FB = G.frameOf([STICK[0], STICK[1], STICK_BASE_H], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  turned("stand.stick-boot", FB, [[0, 9], [3, 8.2, 1], [8, 4.8, 1], [11, 3.6]], { tone: "mid", crease: "none" }, { steps: 28, smooth: true, inner: Ln(G.arcOf(FB, 5, 6.4, P, { slope: -0.7 }), { tone: "faint" }) });
}
const dialAt = SH.DIAL_AT;
const DIAL_R = SH.DIAL_R;
const DIAL_TOP = SH.DIAL_TOP;
post("stand.dial-puck", dialAt[0], dialAt[1], DIAL_R, 0, DIAL_TOP, { tone: "hi", crease: "lo" }, {
  steps: 56,
  extra:
    Ln(k.knurl(dialAt[0], dialAt[1], DIAL_R, DIAL_TOP - 3, DIAL_TOP, 72, P, 0.3), { tone: "lo" }) +
    Ln(k.sideArc(dialAt[0], dialAt[1], DIAL_R, DIAL_TOP - 3, P, 40), { tone: "faint" }) +
    Ln(k.ring(dialAt[0], dialAt[1], DIAL_R - 2.2, DIAL_TOP, P, 56), { tone: "lo" }) +
    (() => {
      const t = k.radialTicks(dialAt[0], dialAt[1], DIAL_R - 3, 60, 5, DIAL_TOP, [1.2, 2.5], P, -Math.PI / 2, Math.PI);
      return Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" });
    })() +
    Ln(k.ring(dialAt[0], dialAt[1], 1.5, DIAL_TOP, P, 16), { tone: "mid" }),
});

{
  const F = G.frameAlong([STICK[0], STICK[1], STICK_BASE_H + 11], [0, 0, 1], undefined);
  const profile = [[0, 1.5], [17, 1.5], [17, 2.5], [19, 3.2, 1], [29, 3.4, 1], [33, 2.7, 1], [35, 1.3], [35.2, 0]];
  const shape = record(A.solid(F, profile, { name: "stick.grip" }));
  put("stick.grip", [STICK[0], STICK[1], STICK_BASE_H + 11 + 17], `<g data-stick>${SH.stickMarkup(LIB, P, 0, 0)}</g>`, { bias: 2, shapes: [shape] });
  NEEDLE = `<path data-needle class="iso-line" data-tone="lit" data-free="start" d="${SH.needlePath(LIB, P, 0)}" style="stroke-width:1.1"/>`;
}

// ───────────────────────────── output ─────────────────────────────
const SOLVED = A.settle(R, P);
if (flag("--debug")) console.log("dropped rules", SOLVED.solved.dropped?.map((r) => `${R.items[r.front].name} over ${R.items[r.back].name}`), "cycles", SOLVED.solved.cycles?.length);
items.sort((a, b) => a.key - b.key);
const groups = items.map((item) => `<g class="it${item.cls ? ` ${item.cls}` : ""}" data-sys="${item.sys}">${item.svg}</g>`).join("") + `<g class="it" data-sys="control">${NEEDLE}</g>`;

const FACT = M.FACTS;
const SYSTEMS = ["control", "engines", "payload", "frame"];
const NAMES = { control: "Flight controls", engines: "Engines", payload: "Weapons bays", frame: "Airframe" };
const ABOUT = {
  control:
    "No tail, so the trailing edge does everything: four pairs of surfaces plus a centre beaver tail. Elevons together pitch the wing, one side against the other rolls it, and the split drag rudders at the tips open to yaw. The stick only asks; four redundant flight computers decide what each surface does.",
  engines: `Four F118-GE-100 turbofans, ${FACT.thrustLbf.toLocaleString("en-US")} lbf each and no afterburner, sit inside the wing. S-shaped inlets on top hide the fan faces from radar, and the exhaust is mixed with cool air and spread over the upper surface to hide the heat.`,
  payload: `Two internal bays, each with a rotary launcher: 16 B61 bombs in all, or 80 500-lb JDAMs. Everything is carried inside, so nothing hangs on the outside to reflect radar.`,
  frame: `A flying wing: ${FACT.span} m across and ${FACT.length} m long, with no tail and no vertical surfaces. The skin is carbon-graphite composite under radar-absorbent coating, and every edge sweeps at the same few angles.`,
};
const READ = {
  engines: `${FACT.engines} × F118 · ${FACT.thrustLbf.toLocaleString("en-US")} lbf each · ${M.totalThrustLbf.toLocaleString("en-US")} lbf`,
  payload: `${FACT.bays} bays · ${FACT.bays * FACT.b61PerBay} B61 or 80 JDAM`,
  frame: `${FACT.span} m span · ${FACT.length} m long · no tail`,
};
const DATA = {
  P,
  panels: SURFACES,
  systems: SYSTEMS,
  names: NAMES,
  about: ABOUT,
  facts: READ,
};

// model.mjs and shared.mjs go into the page as namespaces, so their names cannot collide with the kit's
const namespaced = (name, file) => {
  const src = readFileSync(file, "utf8");
  const names = [...src.matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]);
  return `const ${name} = (() => {\n${src.replace(/^export /gm, "")}\nreturn { ${names.join(", ")} };\n})();`;
};
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const script = [kitScript(), latheScript(), namespaced("MODEL", join(HERE, "model.mjs")), namespaced("SHARED", join(HERE, "shared.mjs")), LIVE].join("\n");

const LABEL =
  "A B-2 Spirit flying wing on a bench test stand. Its sawtooth trailing edge carries four pairs of control surfaces and a centre beaver tail; the starboard half of the centre body is cut away to show a rack of four flight computers, a rotary launcher in a weapons bay, and two engines fed by S-shaped inlets. A pilot's stick and a bank dial stand in front of the wing.";
const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [back.join(""), groups] });
const corners = `<div class="iso-plate-corners" aria-hidden="true"><span class="iso-plate-corner" data-corner="fig">Fig 1</span><span class="iso-plate-corner" data-corner="title">B-2 Spirit · test stand</span><span class="iso-plate-corner" data-corner="hint">Move over the wing to fly it<span class="b2-hint-extra"> · B airbrake</span></span><span class="iso-plate-corner" data-corner="readout" data-readout></span></div>`;
const buttons = SYSTEMS.map((id, index) => `<button type="button" class="b2-sys" data-sys-btn="${id}"><span class="b2-num">${String(index + 1).padStart(2, "0")}</span>${NAMES[id]}</button>`).join("");
const stage = `<div class="b2-stage" tabindex="0" role="group" aria-label="B-2 test stand. Move the pointer over the wing or use the arrow keys to move the stick; B opens the split rudders as an airbrake; 1 to 4 pick a system to highlight.">${svg}</div><span class="b2-live" aria-live="polite" data-announce></span>`;
const figure = `<figure class="iso-figure b2"><div class="iso-plate">${corners}${stage}</div><figcaption class="iso-legend"><span class="b2-systems">${buttons}</span><span class="iso-caption" data-about></span></figcaption></figure>`;

const PROSE = `
<div class="b2-prose">
<h2>Why it has no tail</h2>
<p>Every other bomber hangs its pitch and yaw control on a tail. A tail is also a bright, vertical radar reflector, so the B-2 drops it and becomes the wing: the whole aircraft is the lifting surface, and the crew and the load sit inside it.</p>
<h2>How it steers without one</h2>
<p>Pitch and roll come from the elevons along the trailing edge. Yaw comes from the split drag rudders at the wingtips, which open top and bottom like a clam: drag on one tip pulls the nose round, and opened on both sides at once they act as an airbrake. A wing like this is not naturally stable, so a quadruple-redundant fly-by-wire system flies it, and the beaver tail at the centre moves constantly to smooth out gusts.</p>
<h2>Where the engines went</h2>
<p>Four non-afterburning F118s are buried in the wing. Air reaches them through S-shaped ducts, so no fan face is visible to radar, and the exhaust leaves over the top of the wing after being mixed with cool air, so there is no hot pipe to see from below.</p>
<h2>What it carries</h2>
<p>Two bays on the centreline each hold a rotary launcher. Because the weapons never hang outside, the shape is the same loaded or empty.</p>
<p class="b2-src">Figures from the published Block 30 specification (Wikipedia: Northrop Grumman B-2 Spirit). The control law in the figure is a simplified sketch of what the real flight computers do; surface counts and gains are illustrative.</p>
</div>`;
const THEME_INIT = `<script>try{var t=new URLSearchParams(location.search).get("theme")||localStorage.getItem("iso-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.body.dataset.theme=t}catch(e){}</script>`;
const THEME_TOGGLE = `document.querySelector("[data-theme-toggle]")?.addEventListener("click",()=>{const next=document.body.dataset.theme==="dark"?"light":"dark";document.body.dataset.theme=next;try{localStorage.setItem("iso-theme",next)}catch(e){}});`;
const CSS = readFileSync(join(HERE, "b2.css"), "utf8");
const body =
  `${THEME_INIT}<style>${CSS}</style>` +
  `<nav class="b2-nav"><a href="/">← All figures</a><button type="button" data-theme-toggle>Theme</button></nav>` +
  `<header class="b2-head"><h1>How a B-2 flies without a tail</h1><p>A flying wing on a test bench, cut open on one side. Move over the wing to work the stick and watch the flight computer move the surfaces.</p></header>` +
  figure +
  PROSE;
const page = k.pageHtml({ title: "How a B-2 flies without a tail", theme: THEME, body, script: script + "\n" + THEME_TOGGLE, width: 880 });
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page);
console.log("wrote", OUT, `${(page.length / 1024).toFixed(0)} KB`, `${items.length} items`);
A.auditOrExit(R, P);
