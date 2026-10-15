import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import * as A from "../../kit/audit.mjs";
import { kitScript, latheScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";
import * as SH from "./shared.mjs";
import * as D from "./diagrams.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const THEME = flag("--dark") ? "dark" : "light";
const OUT = option("--out") ?? join(HERE, "..", "..", "dist", "agent-harnesses", "index.html");
const DEG = Math.PI / 180;

// ───────────────────────────── world ─────────────────────────────
const WIDTH = 900;
const HEIGHT = 600;

const P = k.fitProjection(
  [
    ...k.boxCorners(SH.PLATE, -SH.PLATE_H - SH.FOOT_H, 0),
    [SH.CHANNEL_X, SH.HOPPER.y, SH.RAIL_TOP + SH.HOPPER_H],
    [SH.PENNANT.x, SH.BOARD_FACE, SH.PENNANT.z + 26],
    [SH.PLAQUE_POST.x + 4, SH.PLAQUE_POST.y, 132],
    [SH.PLAQUES[0].x, SH.PLAQUE_POST.y, SH.PLAQUES[2].z + SH.PLAQUES[2].h],
  ],
  WIDTH,
  HEIGHT,
  { pad: 20, azimuth: 48, elevation: 30 },
);
const V = G.viewOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);

// ───────────────────────────── recorder ─────────────────────────────
const R = A.recorder(P);
const { items, nameFor } = R;
const record = R.solid;
function put(name, ref, svg, { bias = 0, shapes = [], cls = "", ...rest } = {}) {
  return R.put({ piece: name.split(".")[0], at: ref, bias, svg, shapes, name, cls, ...rest });
}
const midOf = (ring, z) => [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length, z];
const planMid = (plan, z) => [plan.x + plan.w / 2, plan.y + plan.d / 2, z];

function slab(name, plan, z, h, style = {}, { steps = 4, bevel = 0, extra = "", inner = "", bias = 0, cls = "", owner } = {}) {
  const shape = record(A.slab(plan, z, h, { name, owner }, steps));
  put(name, planMid(plan, z + h / 2), S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, { bias, shapes: [shape], cls });
}
function prism(name, ring, z, h, style = {}, { bevel = 0, extra = "", inner = "", bias = 0, convex = true, cls = "", owner } = {}) {
  const shape = record(A.extruded(ring, z, h, { name, owner }));
  put(name, midOf(ring, z + h / 2), S(k.extrude(ring, z, h, P, { bevel, convex }), { tone: "hi", ...style, inner }) + extra, { bias, shapes: [shape], cls });
}
function post(name, cx, cy, r, z, h, style = {}, { steps = 24, extra = "", inner = "", bias = 0, cls = "", owner } = {}) {
  const shape = record(A.cylinder(cx, cy, r, z, h, { name, owner }));
  put(name, [cx, cy, z + h / 2], S(k.cylinder(cx, cy, r, z, h, P, steps), { tone: "mid", ...style, inner }) + extra, { bias, shapes: [shape], cls });
}
function turned(name, F, profile, style = {}, { extra = "", inner = "", bias = 0, bevel = 0, steps, rims, smooth, cls = "", owner } = {}) {
  const options = { bevel, ...(steps ? { steps } : {}), ...(rims ? { rims } : {}), ...(smooth !== undefined ? { smooth } : {}) };
  const paths = G.solidOf(profile, F, P, options);
  const shape = record(A.solid(F, profile, { name, owner }));
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  put(name, G.add3(F.o, G.mul3(F.a, mid)), S(paths, { tone: "hi", ...style, inner }) + extra, { bias, shapes: [shape], cls });
}
function ball(name, centre, r, style = {}, { bias = 0, cls = "", extra = "", owner } = {}) {
  const shape = record(A.ball(centre, r, { name, owner }));
  put(name, centre, S(G.sphereOf(centre, r, P), { tone: "hi", ...style }) + extra, { bias, shapes: [shape], cls });
}

// the desk top's working base: everything on the desk sits at this height
const DB = SH.DESK_Z + SH.DESK_H; // 60

// ───────────────────────────── stand ─────────────────────────────
const back = [`<path class="iso-halo" d="${k.haloOf(SH.PLATE, -SH.PLATE_H - SH.FOOT_H + 2, 2, P)}"/>`];
for (const [x, y] of k.corners(SH.PLATE, 30)) {
  post(`stand.foot-flange${x}${y}`, x, y, 8, -SH.PLATE_H - SH.FOOT_H, 2, { tone: "lo" });
  post(`stand.foot${x}${y}`, x, y, 6.2, -SH.PLATE_H - SH.FOOT_H + 2, SH.FOOT_H - 2, { tone: "mid" });
}
{
  const screws = k.corners(SH.PLATE, 10);
  slab("stand.plate", SH.PLATE, -SH.PLATE_H, SH.PLATE_H, { tone: "mid" }, {
    steps: 10,
    bevel: 1.6,
    extra:
      Ln(k.planOutline(k.insetPlan(SH.PLATE, 6), 0, P), { tone: "lo" }) +
      Ln(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }) +
      Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }),
  });
  // a maker's plate on the floor of the bench, engraved with three rules
  const label = { x: -196, y: 96, w: 76, d: 20, r: 2 };
  slab("stand.plate-label", label, 0, 1.1, { tone: "lo", crease: "none" }, {
    steps: 4,
    extra:
      Dots(k.corners(label, 4).map(([x, y]) => at([x, y, 1.1])), { size: 0.4 }) +
      Ln([[0, 0.42], [0.9, 0.42], [0.9, 0.62], [0, 0.62]].map(([u, v]) => k.pathOf([at([label.x + label.w * u, label.y + label.d * v, 1.1]), at([label.x + label.w * (u + 0.02), label.y + label.d * v, 1.1])], false)).join(""), { tone: "mid" }),
  });
}
// desk legs with feet (the pad wraps the foot, so leg and pad are one item)
for (const [x, y] of SH.LEGS) {
  const leg = record(A.cylinder(x, y, 5.6, 0, SH.DESK_Z, { name: `stand.leg${x}_${y}` }));
  const pad = record(A.cylinder(x, y, 7.4, 0, 2.2, { name: `stand.leg-pad${x}_${y}`, owner: `stand.leg${x}_${y}` }));
  put(`stand.leg${x}_${y}`, [x, y, SH.DESK_Z / 2], S(k.cylinder(x, y, 5.6, 0, SH.DESK_Z, P, 20), { tone: "mid", crease: "none", inner: Ln(k.sideArc(x, y, 2.6, SH.DESK_Z - 3, P, 14), { tone: "faint" }) }) + S(k.cylinder(x, y, 7.4, 0, 2.2, P, 20), { tone: "lo" }) + Dots([at([x + 3.4, y - 3.4, 52])], { size: 0.35 }), { shapes: [leg, pad] });
}
// the cabinet of drawers: a tool chest standing on the desk's left half. Two shut drawers up
// top; the wide bottom drawer is pulled out toward you, holding the day's transcript.
{
  const C = SH.CABINET;
  const base = DB;
  const svg = [];
  const shapes = [];
  const chest = record(A.slab(C, base, 42, { name: "stand.cabinet" }, 5));
  shapes.push(chest);
  svg.push(
    S(k.slabOf(C, base, 42, P, 5, 0.8), { tone: "mid" }) +
      Ln(k.planOutline(k.insetPlan(C, 3.5), base + 42, P), { tone: "faint" }) +
      Dots(k.corners(C, 5).map(([x, y]) => at([x, y, base + 42])), { size: 0.5 }),
  );
  // two shut drawers, their fronts proud of the face
  for (const [i, band] of [
    { x: -166, w: 74 },
    { x: -88, w: 74 },
  ].entries()) {
    const plan = { x: band.x, y: C.y + C.d - 0.4, w: band.w, d: 2.4, r: 1 };
    shapes.push(record(A.slab(plan, base + 20, 20, { name: `desk.drawer${i}` }, 3)));
    svg.push(
      S(k.slabOf(plan, base + 20, 20, P, 3, 0.5), { tone: "hi", crease: "lo" }) +
        Dots([at([band.x + 8, C.y + C.d + 2.6, base + 30]), at([band.x + band.w - 8, C.y + C.d + 2.6, base + 30])], { size: 0.6 }),
    );
  }
  // the dark bay the open drawer left behind
  const hole = record(A.slab({ x: -166, y: C.y + C.d - 0.4, w: 152, d: 0.8, r: 1 }, base + 3, 13, { name: "desk.drawer-hole" }, 3));
  shapes.push(hole);
  svg.push(S(k.slabOf({ x: -166, y: C.y + C.d - 0.4, w: 152, d: 0.8, r: 1 }, base + 3, 13, P, 3), { tone: "lo", crease: "none" }));
  // the open drawer: floor, walls, its face board, and one ruled sheet per call
  {
    const floor = { x: -168, y: C.y + C.d - 0.4, w: 156, d: 15.6, r: 1.6 };
    const face = { x: -170, y: floor.y + floor.d, w: 160, d: 2.8, r: 1.2 };
    shapes.push(record(A.slab(floor, base + 1, 1.6, { name: "desk.drawer-floor" }, 3)));
    svg.push(S(k.slabOf(floor, base + 1, 1.6, P, 3, 0.5), { tone: "mid" }) + Ln(k.planOutline(k.insetPlan(floor, 2), base + 2.6, P), { tone: "faint" }));
    for (const [i, wx] of [floor.x, floor.x + floor.w - 2.4].entries()) {
      const wall = { x: wx, y: floor.y, w: 2.4, d: floor.d, r: 0.6 };
      shapes.push(record(A.slab(wall, base + 2.6, 13.4, { name: `desk.drawer-wall${i}` }, 2)));
      svg.push(S(k.slabOf(wall, base + 2.6, 13.4, P, 2, 0.4), { tone: "hi" }));
    }
    for (let s = 0; s < 8; s++) {
      const sheet = { x: -162, y: 88, w: 144, d: 12.4 - s * 0.6, r: 0.8 };
      shapes.push(record(A.slab(sheet, base + 2.6 + s * 0.8, 0.8, { name: `desk.sheet${s}` }, 3)));
      svg.push(S(k.slabOf(sheet, base + 2.6 + s * 0.8, 0.8, P, 3, 0.2), { tone: s === 7 ? "hi" : "lo", crease: "none" }));
    }
    shapes.push(record(A.slab(face, base + 1, 15, { name: "desk.drawer-face" }, 3)));
    svg.push(
      S(k.slabOf(face, base + 1, 15, P, 3, 0.7), { tone: "hi", crease: "lo" }) +
        Ln(k.planOutline(k.insetPlan(face, 2.4), face.y + face.d, P), { tone: "faint" }) +
        Dots([at([face.x + 12, face.y + face.d + 0.4, base + 8.5]), at([face.x + face.w - 12, face.y + face.d + 0.4, base + 8.5])], { size: 0.8, tone: "mid" }),
    );
  }
  put("stand.cabinet", planMid(C, base + 21), svg.join(""), { shapes, bias: 1 });
}
// the desk top
{
  const screwPlans = [[-196, -60], [196, -60], [-196, 60], [196, 60]];
  slab("desk.top", SH.DESK, SH.DESK_Z, SH.DESK_H, { tone: "mid" }, {
    steps: 8,
    bevel: 1.1,
    extra:
      Ln(k.planOutline(k.insetPlan(SH.DESK, 7), SH.DESK_Z + SH.DESK_H, P), { tone: "lo" }) +
      Dots(screwPlans.map(([x, y]) => at([x, y, SH.DESK_Z + SH.DESK_H])), { size: 0.5 }),
  });
}
// the back board, end panels and top rail
{
  slab("board.wall", SH.BOARD, 0, SH.BOARD_TOP, { tone: "mid" }, {
    steps: 5,
    owner: "board.throat",
    inner: Ln(
      [[-150, 122], [150, 122]].map(([x, z]) => k.pathOf([at([x, SH.BOARD_FACE, z]), at([x, SH.BOARD_FACE, z + 0.01])])).join(""),
      { tone: "faint" },
    ),
  });
  for (const [side, pl] of [["L", SH.PILLAR_L], ["R", SH.PILLAR_R]]) {
    slab(`board.pillar${side}`, pl, 0, SH.BOARD_TOP, { tone: "mid" }, {
      steps: 4,
      bevel: 0.9,
      extra: Ln(k.planOutline(k.insetPlan(pl, 3.4), 6, P), { tone: "faint" }),
    });
    for (const y of [pl.y + 18, pl.y + pl.d - 18]) {
      DotsOnce(`board.pillar${side}-bolt${y}`, [pl.x + pl.w, y, 132], 0.55, "mid", `board.pillar${side}`);
    }
  }
  slab("board.rail", SH.TOPRAIL, SH.BOARD_TOP, SH.RAIL_TOP - SH.BOARD_TOP, { tone: "mid" }, {
    steps: 6,
    bevel: 0.9,
    owner: "board.channelR",
    extra: Dots(k.corners(SH.TOPRAIL, 9).map(([x, y]) => at([x, y, SH.RAIL_TOP])), { size: 0.45 }),
  });
}
function DotsOnce(name, point, size, tone = "mid", owner) {
  const shape = record(A.ball(point, size + 0.2, { name, owner }));
  put(name, point, Dots([at(point)], { size, tone }), { shapes: [shape], bias: 4 });
}

// ───────────────────────────── backboard: intake, gate, bell, dial, guard ───
const BOARD_OUT = -91;
const faceFrame = (x, z) => G.frameOf([x, BOARD_OUT, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const facePoint = (lib, frac, r, s = 4.4) => G.pointOf(faceFrame(SH.DIAL.x, SH.DIAL.z), s, r, ((SH.dialAngle(frac)) * Math.PI) / 180);

// the hopper on the top rail: a letter slot the signals fall into
{
  const H = SH.HOPPER;
  const z0 = SH.RAIL_TOP;
  slab("board.hopper", H, z0, 7, { tone: "hi" }, {
    steps: 3,
    bevel: 0.7,
    owner: "board.throat",
    extra:
      Dots(k.corners(H, 3.4).map(([x, y]) => at([x, y, z0 + 7])), { size: 0.45 }) +
      Ln(k.planOutline({ x: H.x + 3, y: H.y + 3, w: H.w - 6, d: H.d - 6, r: 1.5 }, z0 + 7, P), { tone: "lo" }),
  });
  slab("board.hopper-mouth", { x: H.x + 3, y: H.y + 3, w: H.w - 6, d: H.d - 6, r: 1.5 }, z0 + 7, 0.5, { tone: "lo", crease: "none" }, { steps: 3 });
  for (const side of [-1, 1]) {
    slab(`board.hopper-cheek${side}`, { x: H.x + (side > 0 ? H.w - 5 : 0), y: H.y, w: 5, d: H.d, r: 1 }, z0 + 7, 6, { tone: "mid" }, { steps: 3, bevel: 0.5 });
  }
  slab("board.hopper-lip", { x: H.x - 2, y: H.y - 1, w: H.w + 4, d: H.d + 2, r: 1.5 }, z0 + 13, 2.6, { tone: "mid" }, { steps: 3, bevel: 0.5 });
  // the throat under the hopper, down to the channel mouth
  slab("board.throat", { x: SH.CHANNEL_X - 7, y: H.y + 1, w: 14, d: H.d - 2, r: 1 }, z0 - 9, 12, { tone: "mid" }, { steps: 3, owner: "board.rail" });
}
// the drop channel: two rails against the board face
{
  for (const [name, plan] of [["L", SH.CHANNEL_L], ["R", SH.CHANNEL_R]]) {
    slab(`board.channel${name}`, plan, SH.CHANNEL_BOTTOM, 56, { tone: "mid" }, {
      steps: 3,
      bevel: 0.5,
      // the blade swings through the right rail's foot: one owner keeps that overlap quiet
      owner: name === "R" ? "board.gate" : "board.rail",
      extra: Dots([at([plan.x + plan.w / 2, plan.y + plan.d, SH.CHANNEL_BOTTOM + 14]), at([plan.x + plan.w / 2, plan.y + plan.d, SH.CHANNEL_BOTTOM + 40])], { size: 0.4, tone: "lo" }),
    });
  }
  // pulse dots down the channel: marks of the last four signals read, fading with age
  put("board.channel-log", [SH.CHANNEL_X, SH.BOARD_FACE, 130], Dots([112, 122, 132, 142].map((z) => at([SH.CHANNEL_X, BOARD_OUT + 8, z])), { size: 0.55, tone: "hi" }), {
    shapes: [record(A.box([SH.CHANNEL_X - 3, BOARD_OUT + 6, 108], [SH.CHANNEL_X + 3, BOARD_OUT + 10, 146], { name: "board.channel-log" }))],
    bias: 2,
  });
}
// the wake gate at the mouth of the channel
{
  const boss = record(A.cylinder(SH.GATE_PIVOT[0], SH.GATE_PIVOT[1], 3.4, SH.GATE_Z - 2, SH.GATE_H + 1.6, { name: "board.gate-boss", owner: "board.channelR" }));
  put("board.gate-boss", [SH.GATE_PIVOT[0], SH.GATE_PIVOT[1], SH.GATE_Z + 1], S(k.cylinder(SH.GATE_PIVOT[0], SH.GATE_PIVOT[1], 3.4, SH.GATE_Z - 2, SH.GATE_H + 1.6, P, 20), { tone: "lo" }), { shapes: [boss] });
  const link = record(A.box([-127, -91, SH.GATE_Z - 6], [-121, -83, SH.GATE_Z - 1.8], { name: "board.gate-link" }));
  put("board.gate-link", [-124, -87, SH.GATE_Z - 4], S(k.slabOf({ x: -127, y: -91, w: 6, d: 8, r: 1 }, SH.GATE_Z - 6.2, 4.2, P, 3), { tone: "mid" }), { shapes: [link] });
  const blade = record(A.extruded(SH.paddleRing({ ringOf: k.ringOf }, 0), SH.GATE_Z + 0.6, SH.GATE_H - 1.2, { name: "board.gate", owner: "board.gate-boss" }));
  put("board.gate", [-136, SH.CHANNEL_Y, SH.GATE_Z + 1], `<g data-gate>${SH.paddleMarkup({ ringOf: k.ringOf, extrude: k.extrude, cylinder: k.cylinder, solidSvg: k.solidSvg }, P, 0)}</g>`, { shapes: [blade], bias: 2 });
  const stop = record(A.box([-128, -82.6, SH.GATE_Z + 4.6], [-118, -79.4, SH.GATE_Z + 6.4], { name: "board.gate-stop", owner: "board.channelR" }));
  put("board.gate-stop", [-123, -81, SH.GATE_Z + 5.4], S(k.slabOf({ x: -128, y: -82.6, w: 10, d: 3.2, r: 1 }, SH.GATE_Z + 4.6, 1.8, P, 3), { tone: "hi" }), { shapes: [stop], bias: 3 });
}
// the bell: a dome on the board, and a striker that taps it every time the gate lets a signal through
{
  const F = faceFrame(SH.BELL.x, SH.BELL.z);
  turned("board.bell", F, [[0, 12.4], [1.2, 12.4], [1.6, 11.6], [4, 10.2], [8.4, 6.6], [11.4, 2.6], [12, 0]], { tone: "hi", crease: "lo" }, {
    smooth: true,
    steps: 44,
    owner: "board.striker-knob",
    extra: Ln(G.arcOf(F, 5.4, 9.4, P, { slope: -0.6 }), { tone: "faint" }) + Dots([at([SH.BELL.x, BOARD_OUT + 12.6, SH.BELL.z])], { size: 0.5, tone: "mid" }),
  });
  const bracket = record(A.box([-76, -92, 106], [-70, -84, 120], { name: "board.striker-post", owner: "board.wall" }));
  put("board.striker-post", [-73, -88, 113], S(k.slabOf({ x: -76.6, y: -92.4, w: 6.6, d: 8.4, r: 1 }, 106, 14, P, 3), { tone: "mid" }), { shapes: [bracket] });
  // the striker rod leaves the bracket to the left; its knob rests against the bell's near side
  const kx = SH.BELL.x + 13.5; // radial reach that dips the knob 0.4 into the dome
  const AF = G.frameAlong([-70.4, -88.4, 112.6], [-1, 0, 0]);
  const armProfile = [[0, 1.6], [1.8, 1.6], [2.6, 2.3], [12, 2.3]];
  const arm = record(A.solid(AF, armProfile, { name: "board.striker", owner: "board.striker-post" }));
  const knob = record(A.ball([kx, -88.4, 112.6], 2.9, { name: "board.striker-knob", owner: "board.striker" }));
  put("board.striker", [kx + 2, -88.4, 112.6], `<g data-striker>${S(G.solidOf(armProfile, AF, P, { steps: 20 }), { tone: "hi" })}${S(G.sphereOf([kx, -88.4, 112.6], 2.9, P), { tone: "lo" })}</g>`, { shapes: [arm, knob], bias: 3 });
}
// the dial: the day's dollars against the guard cap
{
  const D = SH.DIAL;
  const F = faceFrame(D.x, D.z);
  const bezel = [[0, 26.5], [2.2, 26.5], [3.4, 25.6], [3.4, 24.4], [4.6, 23.4], [4.6, 0]];
  turned("board.dial-cup", F, bezel, { tone: "mid", crease: "lo" }, { smooth: true, steps: 64 });
  const faceProf = [[4.7, 22.6], [5.3, 22.6], [5.3, 0]];
  const faceShape = record(A.solid(F, faceProf, { name: "board.dial-face" }));
  const tickLines = [];
  const tickAt = (deg, r0, r1) => {
    const a = (deg * Math.PI) / 180;
    const p0 = G.pointOf(faceFrame(D.x, D.z), 5.4, r0, a);
    const p1 = G.pointOf(faceFrame(D.x, D.z), 5.4, r1, a);
    return k.pathOf([at(p0), at(p1)]);
  };
  for (let deg = 210; deg >= -30; deg -= 10) {
    const major = ((deg + 510) % 60 === 0) || deg === 210 || deg === -30;
    tickLines.push(major ? { d: tickAt(deg, 18.6, 22.2), major: true } : { d: tickAt(deg, 20.6, 22.2), major: false });
  }
  const guardAt = (frac, r0, r1) => {
    const a = (SH.dialAngle(frac) * Math.PI) / 180;
    const p0 = G.pointOf(faceFrame(D.x, D.z), 5.5, r0, a);
    const p1 = G.pointOf(faceFrame(D.x, D.z), 5.5, r1, a);
    return k.pathOf([at(p0), at(p1)]);
  };
  const guard =
    Ln(guardAt(0.8, 17.4, 23.4), { tone: "red" }) +
    Ln(guardAt(1, 15.4, 25.4), { tone: "red" }) +
    Dots([at(G.pointOf(faceFrame(D.x, D.z), 5.5, 25.6, (SH.dialAngle(1) * Math.PI) / 180)), at(G.pointOf(faceFrame(D.x, D.z), 5.5, 25.6, (SH.dialAngle(0.8) * Math.PI) / 180))], { size: 0.75, tone: "red" });
  put("board.dial-face", [D.x, BOARD_OUT + 5, D.z], S(G.lathe(faceProf, F, P, { steps: 64 }), { tone: "lo", crease: "lo", inner: Ln(tickLines.map((t) => t.d).join(""), { tone: "lo" }) + Ln(tickLines.filter((t) => t.major).map((t) => t.d).join(""), { tone: "mid" }) + guard }), { shapes: [faceShape], bias: 1 });
  const hub = record(A.solid(faceFrame(D.x, D.z), [[5.3, 3.4], [7.6, 3.4], [7.6, 0]], { name: "board.dial-hub" }));
  put("board.dial-hub", [D.x, BOARD_OUT + 6.5, D.z], S(G.lathe([[5.3, 3.4], [7.6, 3.4], [7.6, 0]], faceFrame(D.x, D.z), P, { steps: 24 }), { tone: "hi" }), { shapes: [hub], bias: 4 });
}
// the cost scale: the day's bill on a full scale, with the index that slides as the fixes come on
{
  const S0 = SH.SCALE;
  const plate = { x: S0.x, y: BOARD_OUT, w: S0.w, d: 3, r: 0.6 };
  slab("guard.scale", plate, S0.z0, S0.z1 - S0.z0, { tone: "mid" }, {
    steps: 4,
    bevel: 0.7,
    extra:
      Dots([at([S0.x + S0.w / 2, S0.y, S0.z0 + 4]), at([S0.x + S0.w / 2, S0.y, S0.z1 - 4])].map((p) => p), { size: 0.45 }),
  });
  const front = BOARD_OUT + 3.4;
  const ticks = SH.scaleTickPoints();
  const capZ = SH.scaleZ(SH.SCALE_FULL);
  const tickD = ticks.filter((t) => !t.major).map((t) => k.pathOf([at([S0.x, front, t.z]), at([S0.x + 5.2, front, t.z])])).join("");
  const majorD = ticks.filter((t) => t.major && !t.cap).map((t) => k.pathOf([at([S0.x, front, t.z]), at([S0.x + 10.4, front, t.z])])).join("");
  const capD = k.pathOf([at([S0.x, front, capZ]), at([S0.x + 12.4, front, capZ])]);
  const labels = [["$5", 5], ["$10", 10], ["$15.5", SH.SCALE_FULL - 0.4]].map(([text, v]) =>
    k.faceTextSvg(k.sideMatrix([S0.x + S0.w - 1.4, front, SH.scaleZ(v)], SH.scaleZ(v), P, "left"), text, { size: 4.4, tone: "lo", anchor: "end" }),
  );
  const guardD =
    k.pathOf([at([S0.x - 1.2, front + 0.6, SH.scaleZ(8)]), at([S0.x + 11.4, front + 0.6, SH.scaleZ(8)])]) +
    k.pathOf([at([S0.x - 1.2, front + 0.6, SH.scaleZ(10)]), at([S0.x + 11.4, front + 0.6, SH.scaleZ(10)])]);
  put("guard.scale-ticks", [S0.x, front, (S0.z0 + S0.z1) / 2], Ln(tickD, { tone: "lo" }) + Ln(majorD, { tone: "mid" }) + Ln(capD, { tone: "hi" }) + Ln(guardD, { tone: "red" }) + labels.join(""), {
    shapes: [record(A.box([S0.x - 1, front - 0.8, S0.z0], [S0.x + 12, front + 1, S0.z1], { name: "guard.scale-ticks", owner: "guard.scale" }))],
    bias: 2,
  });
  const collar = { x: S0.x - 2.6, y: BOARD_OUT, w: S0.w + 5.2, d: 7.4, r: 1.2 };
  const restZ = SH.scaleZ(0);
  const shape = record(A.slab(collar, restZ - 2.4, 4.8, { name: "guard.index", owner: "guard.scale" }, 3));
  const indexSvg =
    S(k.slabOf(collar, restZ - 2.4, 4.8, P, 3, 0.6), { tone: "hi" }) +
    Ln(k.pathOf([at([S0.x + S0.w + 1.6, BOARD_OUT + 4.6, restZ]), at([S0.x + S0.w + 9, BOARD_OUT + 4.6, restZ - 2.6]), at([S0.x + S0.w + 9, BOARD_OUT + 4.6, restZ + 2.6]), at([S0.x + S0.w + 1.6, BOARD_OUT + 4.6, restZ])]), { tone: "red" }) +
    Dots([at([collar.x + 3, collar.y + collar.d, restZ + 3.6]), at([collar.x + collar.w - 3, collar.y + collar.d, restZ + 3.6])], { size: 0.45 });
  put("guard.index", [S0.x + S0.w / 2, BOARD_OUT, restZ], `<g data-index>${indexSvg}</g>`, { shapes: [shape], bias: 5 });
}
// the guard pennant: flies red when the cap trips
{
  const mast = record(A.cylinder(SH.PENNANT.x, BOARD_OUT - 1, 1.7, SH.PENNANT.z, 18, { name: "guard.pennant-mast", owner: "board.wall" }));
  put("guard.pennant-mast", [SH.PENNANT.x, BOARD_OUT - 1, SH.PENNANT.z + 9], S(k.cylinder(SH.PENNANT.x, BOARD_OUT - 1, 1.7, SH.PENNANT.z, 18, P, 16), { tone: "hi" }), { shapes: [mast] });
  // the flag hangs in the board plane from the mast's top, clear of the top rail
  const flagProfile = [[0, 0], [15, 0], [15, 4.6], [0, 9.2]];
  const FF = G.frameOf([SH.PENNANT.x - 0.7, BOARD_OUT + 0.5, SH.PENNANT.z + 4], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const flag = record(A.prism(FF, flagProfile, -0.5, 0.5, { name: "guard.pennant", owner: "guard.pennant-mast" }));
  put("guard.pennant", [SH.PENNANT.x + 8, BOARD_OUT + 0.5, SH.PENNANT.z + 8], `<g data-pennant>${S(G.prismOf(FF, flagProfile, -0.5, 0.5, P), { tone: "lo" })}</g>`, { shapes: [flag], bias: 3 });
}

// ───────────────────────────── desk: tools, the work frame, the cage ────────
// the quiet bin: signals the gate turned away pile up here
{
  const B = SH.BIN;
  slab("desk.bin-floor", B, DB, 1.4, { tone: "lo", crease: "none" }, { steps: 3 });
  const walls = [
    { x: B.x, y: B.y, w: B.w, d: 2.6, r: 0.6 },
    { x: B.x, y: B.y + B.d - 2.6, w: B.w, d: 2.6, r: 0.6 },
    { x: B.x, y: B.y + 2.6, w: 2.6, d: B.d - 5.2, r: 0.6 },
    { x: B.x + B.w - 2.6, y: B.y + 2.6, w: 2.6, d: B.d - 5.2, r: 0.6 },
  ];
  for (const [i, w] of walls.entries()) {
    slab(`desk.bin-wall${i}`, w, DB + 1.4, 12.6, { tone: "mid" }, { steps: 2, bevel: 0.4 });
  }
  const spots = [
    { x: -196, y: -60, z: DB + 1.4 },
    { x: -196.8, y: -59.2, z: DB + 3.8 },
    { x: -178, y: -63, z: DB + 1.4 },
    { x: -178.8, y: -62.2, z: DB + 3.8 },
    { x: -190, y: -43, z: DB + 1.4 },
    { x: -190.8, y: -42.4, z: DB + 3.8 },
  ];
  for (const [i, s] of spots.entries()) {
    slab(`desk.quiet${i}`, { x: s.x - 2.5, y: s.y - 2.5, w: 5, d: 5, r: 2.5 }, s.z, 2.4, { tone: "lo" }, { steps: 6 });
  }
  slab("desk.quiet-top", { x: -179.6 - 2.5, y: -61.4 - 2.5, w: 5, d: 5, r: 2.5 }, DB + 6.2, 2.4, { tone: "mid" }, { steps: 6 });
  DotsOnce("desk.bin-bolt", [B.x + 1.3, B.y + B.d / 2, DB + 14], 0.5, "mid", "desk.bin-wall2");
}
// the tool rack: five tools in their sockets; the last two are spares
{
  const K = SH.RACK;
  slab("tool.rack", K, DB, 6.6, { tone: "mid" }, {
    steps: 3,
    bevel: 0.7,
    extra:
      Dots(k.corners(K, 3.4).map(([x, y]) => at([x, y, DB + 6.6])), { size: 0.45 }) +
      Ln(k.onTop([[K.x + 4, K.y + K.d / 2], [K.x + K.w - 4, K.y + K.d / 2]], DB + 6.6, P), { tone: "faint" }),
  });
  for (const [i, sx] of SH.SOCKETS.entries()) {
    prism(`tool.socket${i}`, k.circleRing(sx, K.y + 4.6, 3.4, 20), DB + 6.6, 0.7, { tone: "lo", crease: "none" }, { owner: "tool.post" });
  }
  const toolY = K.y + 4.6;
  const collar = (sx) => k.cylinder(sx, toolY, 2.9, DB + 6.6, 1.8, P, 18);
  const shapes = (sx, extra = []) => [record(A.cylinder(sx, toolY, 1.3, DB + 6.6, 14.8, { name: "tool.post" })), ...extra];
  const tool = (i, svg, extra, atZ) => {
    const sx = SH.SOCKETS[i];
    const spare = i >= 3 ? ` data-spare="${i - 3}"` : "";
    put(`tool.tool${i}`, [sx, toolY, atZ], `<g${spare}>${S(collar(sx), { tone: "mid" })}${svg}</g>`, { shapes: shapes(sx, extra), bias: 3 });
  };
  // 0: a probe stylus
  tool(0,
    S(k.cylinder(SH.SOCKETS[0], toolY, 1.1, DB + 6.6, 11.8, P, 14), { tone: "hi" }) + S(G.sphereOf([SH.SOCKETS[0], toolY, SH.DESK_Z + 20], 2.7, P), { tone: "hi" }),
    [record(A.cylinder(SH.SOCKETS[0], toolY, 1.1, DB + 8.4, 10, { name: "tool.a", owner: "tool.post" })), record(A.ball([SH.SOCKETS[0], toolY, DB + 20], 2.7, { name: "tool.b", owner: "tool.post" }))],
    DB + 15);
  // 1: a gear cutter on a stub arbor
  tool(1,
    S(k.cylinder(SH.SOCKETS[1], toolY, 1.4, DB + 6.6, 9.8, P, 16), { tone: "hi" }) +
      S(k.cylinder(SH.SOCKETS[1], toolY, 4.4, DB + 16.4, 2.8, P, 26, 0.5), { tone: "hi" }, ) +
      Ln(k.knurl(SH.SOCKETS[1], toolY, 4.4, DB + 16.4, DB + 19.2, 18, P, 0.5), { tone: "lo" }),
    [record(A.cylinder(SH.SOCKETS[1], toolY, 1.4, DB + 8.4, 8, { name: "tool.a", owner: "tool.post" })), record(A.cylinder(SH.SOCKETS[1], toolY, 4.4, DB + 16.4, 2.8, { name: "tool.b", owner: "tool.post" }))],
    DB + 15);
  // 2: a clamp with its tommy bar
  tool(2,
    S(k.slabOf({ x: SH.SOCKETS[2] - 4.6, y: toolY - 3.6, w: 9.2, d: 7.2, r: 1 }, DB + 8.4, 6, P, 4, 0.6), { tone: "hi" }) +
      S(k.cylinder(SH.SOCKETS[2], toolY, 1.6, DB + 14.4, 4, P, 16), { tone: "hi" }) +
      S(k.cylinder(SH.SOCKETS[2], toolY, 3.4, DB + 18.4, 1.4, P, 20, 0.4), { tone: "hi" }),
    [record(A.slab({ x: SH.SOCKETS[2] - 4.6, y: toolY - 3.6, w: 9.2, d: 7.2, r: 1 }, DB + 8.4, 6, { name: "tool.a", owner: "tool.post" }, 4)), record(A.cylinder(SH.SOCKETS[2], toolY, 1.6, DB + 14.4, 4, { name: "tool.b", owner: "tool.post" })), record(A.cylinder(SH.SOCKETS[2], toolY, 3.4, DB + 18.4, 1.4, { name: "tool.c", owner: "tool.post" }))],
    DB + 15);
  // 3 (spare): a brush roller
  {
    const sx = SH.SOCKETS[3];
    const RF = G.frameAlong([sx - 5.4, toolY, SH.DESK_Z + 19.4], [1, 0, 0]);
    const prof = [[0, 3.2], [10.8, 3.2]];
    tool(3,
      S(k.slabOf({ x: sx - 6.6, y: toolY - 1.2, w: 2.4, d: 2.4, r: 0.6 }, DB + 6.6, 14.4, P, 3), { tone: "hi" }) +
        S(G.solidOf(prof, RF, P, { steps: 26 }), { tone: "hi", inner: Ln(G.ribsOf(RF, 0.6, 10.2, 3.2, 12, P, { fade: [0.1, 0.5], seams: true }), { tone: "lo" }) }),
      [record(A.slab({ x: sx - 6.6, y: toolY - 1.2, w: 2.4, d: 2.4, r: 0.6 }, DB + 6.6, 14.4, { name: "tool.a", owner: "tool.post" }, 3)), record(A.solid(RF, prof, { name: "tool.b", owner: "tool.post" }))],
      DB + 15);
  }
  // 4 (spare): a mallet
  {
    const sx = SH.SOCKETS[4];
    const HF = G.frameAlong([sx - 4.6, toolY, SH.DESK_Z + 14.2], [1, 0, 0]);
    const prof = [[0, 3.6], [9.2, 3.6], [10.4, 2.8], [10.4, 1.6], [11.2, 0]];
    tool(4,
      S(G.solidOf(prof, HF, P, { steps: 24, rims: "all" }), { tone: "hi", crease: "lo" }) +
        S(k.cylinder(sx + 0.4, toolY, 1.3, DB + 9.8, 22, P, 14), { tone: "hi" }),
      [record(A.solid(HF, prof, { name: "tool.a", owner: "tool.post" })), record(A.cylinder(sx + 0.4, toolY, 1.3, DB + 9.8, 22, { name: "tool.b", owner: "tool.post" }))],
      DB + 15);
  }
  // the spares tray
  {
    const T = SH.TRAY;
    slab("tool.tray-floor", T, DB, 1.4, { tone: "lo", crease: "none" }, { steps: 3 });
    const walls = [
      { x: T.x, y: T.y, w: T.w, d: 2.2, r: 0.6 },
      { x: T.x, y: T.y + T.d - 2.2, w: T.w, d: 2.2, r: 0.6 },
      { x: T.x, y: T.y + 2.2, w: 2.2, d: T.d - 4.4, r: 0.6 },
      { x: T.x + T.w - 2.2, y: T.y + 2.2, w: 2.2, d: T.d - 4.4, r: 0.6 },
    ];
    for (const [i, w] of walls.entries()) slab(`tool.tray-wall${i}`, w, DB + 1.4, 5.4, { tone: "mid" }, { steps: 2 });
    slab("tool.tray-pad", { x: T.x + 2.6, y: T.y + 2.6, w: T.w - 5.2, d: T.d - 5.2, r: 1 }, DB + 1.4, 1.6, { tone: "lo", crease: "none" }, { steps: 3, extra: Ln(k.planOutline({ x: T.x + 4, y: T.y + 4, w: T.w - 8, d: T.d - 8, r: 1 }, DB + 3, P), { tone: "faint" }) });
  }
}
// the work table
{
  const T = SH.TABLE;
  slab("work.table", T, DB, 6, { tone: "hi" }, {
    steps: 6,
    bevel: 0.9,
    extra:
      Ln(k.planOutline(k.insetPlan(T, 5), DB + 6, P), { tone: "lo" }) +
      Dots(k.corners(T, 6).map(([x, y]) => at([x, y, DB + 6])), { size: 0.5 }) +
      Ln(k.pathOf([at([T.x + T.w - 9, T.y + 6, DB + 6]), at([T.x + T.w - 9, T.y + T.d - 6, DB + 6])]), { tone: "faint" }) +
      Ln(k.pathOf([at([T.x + 6, T.y + T.d - 9, DB + 6]), at([T.x + T.w - 6, T.y + T.d - 9, DB + 6])]), { tone: "faint" }),
  });
  // the dolly's groove, milled down the centre line
  const groove = { x: 8.6, y: SH.DOLLY_Y - 7.6, w: 51.4, d: 15.2, r: 7 };
  slab("work.groove", groove, SH.TABLE_TOP, 0.5, { tone: "lo", crease: "none" }, {
    steps: 8,
    extra: Ln(k.planOutline(groove, SH.TABLE_TOP + 0.5, P, 8), { tone: "faint" }),
  });
  // guide rails on either side of the groove: the dolly runs between them
  for (const side of [-1, 1]) {
    slab(`work.track${side > 0 ? "R" : "L"}`, { x: 8.6, y: SH.DOLLY_Y + side * 8.6 - 0.8, w: 51.4, d: 1.6, r: 0.6 }, SH.TABLE_TOP, 1.7, { tone: "mid" }, { steps: 3, bevel: 0.4 });
  }
  // the lead screw the dolly rides
  {
    const SF = G.frameAlong([8.6, SH.DOLLY_Y + 11.4, SH.TABLE_TOP + 0.9], [1, 0, 0]);
    const prof = [[0, 0.9], [4, 0.9], [52.4, 0.9], [53, 0.6], [53.4, 0]];
    turned("work.screw", SF, prof, { tone: "mid", crease: "none" }, { steps: 14, inner: Ln(G.ribsOf(SF, 1, 51.4, 0.9, 40, P, { fade: [0.5, 0.5] }), { tone: "faint" }) });
    for (const bx of [12.2, 34, 56]) {
      slab(`work.pillow${bx}`, { x: bx - 1.6, y: SH.DOLLY_Y + 9.4, w: 3.2, d: 4, r: 0.8 }, SH.TABLE_TOP, 3.6, { tone: "mid" }, { steps: 3, bevel: 0.4, owner: "work.screw" });
    }
  }
}
// the dolly: the call rides here to whichever head is cheapest for the job
{
  const dx = SH.PAD_X;
  const R0 = SH.DOLLY_R;
  const F = G.frameOf([dx, SH.DOLLY_Y, SH.TABLE_TOP + 0.5], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const prof = [[0, R0], [0.5, R0 + 0.4], [1.4, R0], [1.4, R0 - 0.6], [2.2, R0 - 1.1], [2.2, 0]];
  const ring = G.ringBand(1.5, 2.7, R0 - 1.2, R0 - 0.4, F, P, { steps: 40 });
  const shapes = [
    record(A.solid(F, prof, { name: "work.dolly" })),
    record(A.ring(F, 1.5, 2.7, R0 - 1.2, R0 - 0.4, { name: "work.dolly-rim", owner: "work.dolly" })),
    record(A.box([dx + 10.8, SH.DOLLY_Y + 9.4, SH.TABLE_TOP + 0.5], [dx + 14.2, SH.DOLLY_Y + 13.8, SH.TABLE_TOP + 3.9], { name: "work.dolly-nut", owner: "work.screw" })),
  ];
  put("work.dolly", [dx, SH.DOLLY_Y, SH.TABLE_TOP + 1.7], `<g data-dolly>${S(G.lathe(prof, F, P, { steps: 40 }), { tone: "hi", crease: "lo" })}${S(ring, { tone: "mid" })}${Ln(k.ring(dx, SH.DOLLY_Y, R0 - 2.6, SH.TABLE_TOP + 2.2, P, 26), { tone: "lo" })}${S(k.slabOf({ x: dx + 10.8, y: SH.DOLLY_Y + 9.4, w: 3.4, d: 4.4, r: 0.8 }, SH.TABLE_TOP + 0.5, 3.4, P, 3, 0.4), { tone: "mid" })}</g>`, { shapes, bias: 2 });
}
// the cage: a low glass guard over the work, closed on three sides, open in front
{
  const G0 = SH.SANDBOX;
  const posts = [[G0.x0, G0.y0], [G0.x1, G0.y0], [G0.x0, G0.y1], [G0.x1, G0.y1]];
  for (const [x, y] of posts) {
    slab(`work.post${x}_${y}`, { x: x - 1.8, y: y - 1.8, w: 3.6, d: 3.6, r: 0.8 }, SH.TABLE_TOP, SH.PARAPET - SH.TABLE_TOP, { tone: "mid" }, { steps: 3, bevel: 0.4 });
    DotsOnce(`work.post-bolt${x}_${y}`, [x, y, SH.PARAPET], 0.4, "mid", `work.post${x}_${y}`);
  }
  // the top rails on the three closed sides (the front stays open, so calls can sail in)
  const rails = [
    { x: G0.x0 - 1.3, y: G0.y0 + 1.8, w: 2.6, d: G0.y1 - G0.y0 - 3.6, r: 0.8 },
    { x: G0.x1 - 1.3, y: G0.y0 + 1.8, w: 2.6, d: G0.y1 - G0.y0 - 3.6, r: 0.8 },
    { x: G0.x0 + 1.8, y: G0.y0 - 1.3, w: G0.x1 - G0.x0 - 3.6, d: 2.6, r: 0.8 },
  ];
  for (const [i, rail] of rails.entries()) slab(`work.rail${i}`, rail, SH.PARAPET, 2.4, { tone: "hi" }, { steps: 3, bevel: 0.4 });
  const panes = [
    { name: "W", plan: { x: G0.x0 - 0.7, y: G0.y0 + 3, w: 1.4, d: G0.y1 - G0.y0 - 6, r: 0 } },
    { name: "E", plan: { x: G0.x1 - 0.7, y: G0.y0 + 3, w: 1.4, d: G0.y1 - G0.y0 - 6, r: 0 } },
    { name: "N", plan: { x: G0.x0 + 3, y: G0.y0 - 0.7, w: G0.x1 - G0.x0 - 6, d: 1.4, r: 0 } },
    { name: "S", plan: { x: G0.x0 + 3, y: G0.y1 - 0.7, w: G0.x1 - G0.x0 - 6, d: 1.4, r: 0 } },
  ];
  // a light diagonal hatch so the glass reads as glass
  const hatchOf = (plan, z0, z1) => {
    const lines = [];
    if (plan.w < plan.d) {
      const fx = plan.x;
      for (let y = plan.y + 5; y < plan.y + plan.d - 9; y += 12) lines.push(k.pathOf([at([fx, y, z0 + 1.6]), at([fx, y + 5, z1 - 1.6])]));
    } else {
      const fy = plan.y + plan.d;
      for (let x = plan.x + 5; x < plan.x + plan.w - 9; x += 12) lines.push(k.pathOf([at([x, fy, z0 + 1.6]), at([x + 5, fy, z1 - 1.6])]));
    }
    return lines.join("");
  };
  for (const pane of panes) {
    const shape = record(A.slab(pane.plan, SH.TABLE_TOP, SH.PARAPET - SH.TABLE_TOP - 2, { name: `work.pane${pane.name}` }, 3));
    put(`work.pane${pane.name}`, planMid(pane.plan, (SH.TABLE_TOP + SH.PARAPET) / 2), S(k.slabOf(pane.plan, SH.TABLE_TOP, SH.PARAPET - SH.TABLE_TOP - 2, P, 3, 0.4), { tone: "lo", crease: "lo", className: "ao-glass", inner: Ln(hatchOf(pane.plan, SH.TABLE_TOP + 1, SH.PARAPET - 3), { tone: "faint" }) }), { shapes: [shape], bias: 1 });
  }
}
// the three spindle heads on their masts
for (const [i, sx] of SH.STATION_X.entries()) {
  const r = SH.HEAD_R[i];
  const h = SH.HEAD_H[i];
  const z0 = SH.HEAD_TOP - h;
  const M = SH.MAST;
  const mastPlan = { x: sx - M.w / 2, y: M.y, w: M.w, d: M.d, r: 1 };
  slab(`work.mast${i}`, mastPlan, SH.TABLE_TOP, 148 - SH.TABLE_TOP, { tone: "mid" }, {
    steps: 3,
    bevel: 0.6,
    extra: Ln(k.sideSeam(mastPlan, 100, P, 3), { tone: "faint" }) + Dots([at([sx, M.y + M.d, 132])], { size: 0.4, tone: "lo" }),
  });
  slab(`work.mast-foot${i}`, { x: sx - 6, y: M.y - 2, w: 12, d: 9, r: 1.4 }, SH.TABLE_TOP, 2.4, { tone: "mid" }, {
    steps: 3,
    bevel: 0.5,
    owner: `work.mast${i}`,
    extra: Dots([[sx - 4, M.y - 0.4], [sx + 4, M.y - 0.4]].map(([x, y]) => at([x, y, SH.TABLE_TOP + 2.4])), { size: 0.45 }),
  });
  // the head: a quill with a chuck nose at the work, belt steps on top, hung off the mast
  const HF = G.frameOf([sx, SH.DOLLY_Y, z0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const prof = [
    [0, 0],
    [0, r * 0.5],
    [2.8, r * 0.5],
    [3.1, r * 0.78],
    [4.6, r * 0.78],
    [h - 8.6, r * 0.94],
    [h - 6.4, r],
    [h - 5.2, r * 0.86],
    [h - 4.2, r * 0.52],
    [h - 2.6, r * 0.52],
    [h - 2.3, r * 0.7],
    [h - 1.1, r * 0.7],
    [h - 0.8, r * 0.46],
    [h, r * 0.46],
    [h, 0],
  ];
  const hang = { x: sx - 3.5, y: M.y, w: 7, d: SH.DOLLY_Y - M.y, r: 1.2 };
  const block = { x: sx - 5.4, y: M.y - 2.2, w: 10.8, d: M.d + 4.4, r: 1.2 };
  const shapes = [
    record(A.solid(HF, prof, { name: `work.head${i}`, owner: `work.mast${i}` })),
    record(A.box([hang.x, hang.y, SH.HEAD_TOP - 3.6], [hang.x + hang.w, hang.y + hang.d, SH.HEAD_TOP], { name: `work.hang${i}`, owner: `work.mast${i}` })),
    record(A.box([block.x, block.y, SH.HEAD_TOP - 2.2], [block.x + block.w, block.y + block.d, 148], { name: `work.block${i}`, owner: `work.mast${i}` })),
    record(A.cylinder(sx, SH.DOLLY_Y, 3.2, SH.HEAD_TOP - 3, 3.4, { name: `work.collar${i}`, owner: `work.mast${i}` })),
  ];
  const svg =
    S(G.lathe(prof, HF, P, { steps: 40 }), { tone: "hi", crease: "lo", inner: Ln(G.ribsOf(HF, 5.4, h - 6.8, r * 0.86, 9, P, { fade: [0.25, 0.45] }), { tone: "faint" }) }) +
    S(k.slabOf(hang, SH.HEAD_TOP - 3.6, 3.6, P, 4, 0.5), { tone: "mid" }) +
    S(k.slabOf(block, SH.HEAD_TOP - 2.2, 148 - (SH.HEAD_TOP - 2.2), P, 4, 0.5), { tone: "mid", extra: Dots([at([sx, M.y - 2, SH.HEAD_TOP + 3]), at([sx, M.y - 2, SH.HEAD_TOP + 7])], { size: 0.4 }) }) +
    S(k.cylinder(sx, SH.DOLLY_Y, 3.2, SH.HEAD_TOP - 3, 3.4, P, 18), { tone: "mid" }) +
    S(k.cylinder(sx, SH.DOLLY_Y, r * 0.5 + 0.6, z0 + 2.8, 1.2, P, 20), { tone: "lo" }) +
    S(k.cylinder(sx, SH.DOLLY_Y, 1.1, z0 - 2.2, 2.6, P, 12), { tone: "mid" }) +
    S(G.sphereOf([sx, SH.DOLLY_Y + r + 0.6, z0 + h - 6.4], 1.9, P), { tone: "lit", className: "ao-lamp" });
  put(`work.head${i}`, [sx, SH.DOLLY_Y, z0 + h / 2], `<g data-head="${i}">${svg}</g>`, { shapes, bias: 4 });
}
// the beam that ties the mast tops together
slab("work.beam", SH.BEAM, 148, 6, {
  tone: "mid",
}, {
  steps: 4,
  bevel: 0.8,
  extra:
    Ln(k.onTop([[SH.BEAM.x + 5, SH.BEAM.y + SH.BEAM.d / 2], [SH.BEAM.x + SH.BEAM.w - 5, SH.BEAM.y + SH.BEAM.d / 2]], 154, P), { tone: "faint" }) +
    Dots([[SH.BEAM.x + 3, SH.BEAM.y - 1], [SH.BEAM.x + SH.BEAM.w - 3, SH.BEAM.y - 1]].map(([x, y]) => at([x, y, 154])), { size: 0.5 }),
});

// ───────────────────────────── output: printer, tape, chat plaques ──────────
{
  const PR = SH.PRINTER;
  const top = DB + 30; // the printer's top face, 90
  slab("out.printer", PR, DB, 30, { tone: "mid" }, {
    steps: 5,
    bevel: 1.0,
    extra:
      Ln(k.planOutline(k.insetPlan(PR, 4.5), DB + 7, P), { tone: "faint" }) +
      Dots(k.corners(PR, 6).map(([x, y]) => at([x, y, top])), { size: 0.5 }),
  });
  const lid = k.insetPlan(PR, 3);
  slab("out.printer-lid", lid, top, 1.6, { tone: "hi", crease: "lo" }, { steps: 4, bevel: 0.5 });
  // the paper roll resting on the lid, and the sheet it feeds down the front
  {
    const axis = top + 1.6 + 4.5; // the roll's underside touches the lid
    const RL = G.frameAlong([PR.x + 13, PR.y + 8, axis], [1, 0, 0]);
    const prof = [[0, 0], [0, 4.2], [0.8, 4.5], [34, 4.5], [34.8, 4.2], [34.8, 0]];
    turned("out.roll", RL, prof, { tone: "hi", crease: "lo" }, { steps: 30, rims: "all" });
    const sheet = { x: SH.STRIP.x0, y: SH.STRIP.y, w: SH.STRIP.w, d: 1.2, r: 0.4 };
    // the feed sheet lying on the lid, its lip tucked under the roll
    slab("out.sheet", { x: sheet.x + 1, y: PR.y + 6, w: sheet.w - 2, d: -8.8 - (PR.y + 6), r: 0.4 }, top + 1.6, 0.5, { tone: "hi", crease: "none" }, { steps: 3 });
    slab("out.sheet-front", sheet, 60.6, 37.2, { tone: "hi", crease: "lo" }, {
      steps: 3,
      extra: Ln(k.planOutline({ x: sheet.x - 1, y: sheet.y - 0.6, w: sheet.w + 2, d: 1.8, r: 0.4 }, 97.4, P), { tone: "lo" }),
    });
    const slot = { x: sheet.x + 2, y: sheet.y, w: sheet.w - 4, d: 1.2, r: 0.4 };
    slab("out.slot-mouth", slot, 86.6, 1.6, { tone: "lo", crease: "none" }, { steps: 3, owner: "out.sheet-front" });
    // the day's printed lines: one ruled tick per finished call, revealed as they land
    const slots = SH.tapeSlotLines().map(({ z, i }) => {
      const len = 6 + ((i * 7) % 5) * 2.6;
      const d = k.pathOf([at([sheet.x + 3, sheet.y + 1.3, z]), at([sheet.x + 3 + len, sheet.y + 1.3, z])]);
      return `<path class="iso-line ao-slot" data-tone="lo" data-free="start" data-slot="${i}" d="${d}"/>`;
    });
    put("out.tape-lines", [sheet.x + sheet.w / 2, sheet.y, 73], slots.join(""), {
      shapes: [record(A.box([sheet.x + 2, sheet.y + 0.3, 60.6], [sheet.x + sheet.w - 2, sheet.y + 1.6, 88], { name: "out.tape-lines" }))],
      bias: 6,
    });
  }
  // the chat plaques clamped to their post: three windows, the last thing said, a question, the idle one
  {
    const P0 = SH.PLAQUE_POST;
    const postShapes = [
      record(A.cylinder(P0.x, P0.y, 5.2, DB, 2.4, { name: "out.plaque-post-foot" })),
      record(A.cylinder(P0.x, P0.y, 2.6, DB + 2.4, 65.6, { name: "out.plaque-post" })),
      record(A.cylinder(P0.x, P0.y, 3.4, DB + 68, 2.6, { name: "out.plaque-post-cap" })),
    ];
    let postSvg =
      S(k.cylinder(P0.x, P0.y, 5.2, DB, 2.4, P, 20), { tone: "mid" }) +
      S(k.cylinder(P0.x, P0.y, 2.6, DB + 2.4, 65.6, P, 18), { tone: "mid", crease: "none" }) +
      S(k.cylinder(P0.x, P0.y, 3.4, DB + 68, 2.6, P, 18), { tone: "hi" });
    const lines = [
      [30, 22, 26],
      [24, 32, 14],
      [16],
    ];
    const marks = ["check", "alert", "idle"];
    for (const [i, pl] of SH.PLAQUES.entries()) {
      // the clamp wraps the post, the plate hangs off it; both share the post's owner
      const clamp = { x: P0.x - 4.6, y: P0.y - 2.8, w: 6, d: 5.6, r: 1 };
      postShapes.push(record(A.slab(clamp, pl.z, pl.h, { name: `out.plaque-clamp${i}`, owner: "out.plaque-post" }, 3)));
      postSvg += S(k.slabOf(clamp, pl.z, pl.h, P, 3, 0.6), { tone: "mid" });
      const plate = { x: pl.x, y: P0.y - 1.2, w: pl.w, d: 2.4, r: 1 };
      const inner = k.planOutline(k.insetPlan({ x: plate.x, y: plate.y, w: plate.w, d: plate.d, r: 2 }, 2.4), pl.z + pl.h, P, 4);
      const rules = [];
      let zy = pl.z + pl.h - 5.4;
      for (const len of lines[i]) {
        rules.push(k.pathOf([at([plate.x + 16, plate.y - 0.2, zy]), at([plate.x + 16 + len, plate.y - 0.2, zy])]));
        zy -= 4.2;
      }
      const mark =
        marks[i] === "check"
          ? k.pathOf([at([plate.x + pl.w - 10, plate.y - 0.2, pl.z + 9]), at([plate.x + pl.w - 7.4, plate.y - 0.2, pl.z + 6.4]), at([plate.x + pl.w - 3.4, plate.y - 0.2, pl.z + 13])])
          : marks[i] === "alert"
            ? k.pathOf([at([plate.x + pl.w - 7, plate.y - 0.2, pl.z + 5]), at([plate.x + pl.w - 7, plate.y - 0.2, pl.z + 11.4])]) + k.pathOf([at([plate.x + pl.w - 7, plate.y - 0.2, pl.z + 14.6]), at([plate.x + pl.w - 7, plate.y - 0.2, pl.z + 15.2])])
            : k.pathOf([at([plate.x + pl.w - 10.4, plate.y - 0.2, pl.z + 9]), at([plate.x + pl.w - 7.6, plate.y - 0.2, pl.z + 9]), at([plate.x + pl.w - 4.6, plate.y - 0.2, pl.z + 9])]);
      const tail = k.pathOf([at([plate.x + 7, plate.y - 0.4, pl.z + 2]), at([plate.x + 5, plate.y - 0.4, pl.z - 2.6]), at([plate.x + 11, plate.y - 0.4, pl.z + 1.6])]);
      put(`out.plaque${i}`, [plate.x + plate.w / 2, plate.y, pl.z + pl.h / 2], S(k.slabOf(plate, pl.z, pl.h, P, 4, 0.8), { tone: i === 2 ? "lo" : "hi", crease: "lo" }) + Ln(inner, { tone: "faint" }) + Ln(rules.join(""), { tone: "mid" }) + Ln(mark + tail, { tone: i === 1 ? "red" : "lo" }) + Dots([at([plate.x + 9, plate.y - 0.2, pl.z + pl.h - 5.4])], { size: 1.5, tone: "hi" }), {
        shapes: [record(A.slab(plate, pl.z, pl.h, { name: `out.plaque${i}`, owner: "out.plaque-post" }, 4))],
      });
    }
    put("out.plaque-post", [P0.x, P0.y, DB + 34], postSvg, { shapes: postShapes, bias: 2 });
  }
}
// the tape store: a cubby with the memory reel and the loose end over the drum
{
  const C = SH.CUBBY;
  slab("out.cubby-floor", C, DB, 1.4, { tone: "lo", crease: "none" }, { steps: 3 });
  const walls = [
    { x: C.x, y: C.y, w: C.w, d: 3, r: 0.8 },
    { x: C.x, y: C.y + C.d - 3, w: C.w, d: 3, r: 0.8 },
    { x: C.x, y: C.y + 3, w: 3, d: C.d - 6, r: 0.8 },
    { x: C.x + C.w - 3, y: C.y + 3, w: 3, d: C.d - 6, r: 0.8 },
  ];
  for (const [i, w] of walls.entries()) slab(`out.cubby-wall${i}`, w, DB + 1.4, 16.6, { tone: "mid" }, { steps: 2, bevel: 0.5 });
  // the memory reel: one spool — drum and both flanges in a single turn — resting on the floor
  const D = SH.DRUM;
  const RF = G.frameAlong([D.x - D.len / 2, D.y, DB + 1.4 + 13.4], [1, 0, 0]);
  const prof = [
    [0, 0], [0, 13.4], [1.4, 13.4], [1.4, 11.4], [2.8, 12.6],
    [D.len - 2.8, 12.6], [D.len - 1.4, 11.4], [D.len - 1.4, 13.4], [D.len, 13.4], [D.len, 0],
  ];
  turned("out.reel", RF, prof, { tone: "hi", crease: "lo" }, { steps: 40, rims: "all", inner: Ln(G.ribsOf(RF, 2.8, D.len - 2.8, 12.6, 13, P, { fade: [0.2, 0.5], seams: true }), { tone: "lo" }) });
  // the loose end: a stub on the barrel, its tail drawn down to the coil on the floor
  const stub = { x: D.x - 19.4, y: D.y - 3, w: 3.6, d: 6, r: 0.6 };
  slab("out.tape-end", stub, DB + 27.4, 1.2, { tone: "mid", crease: "none" }, { steps: 2 });
  const coilX = C.x + 34;
  const coilY = C.y + 42;
  put("out.coil", [coilX, coilY, DB + 1.6], Ln(k.ring(coilX, coilY, 7, DB + 1.7, P, 30), { tone: "lo" }) + Ln(k.ring(coilX, coilY, 5.2, DB + 1.7, P, 30), { tone: "lo" }) + Ln(k.ring(coilX, coilY, 3.4, DB + 1.7, P, 30), { tone: "lo" }) + Ln(k.pathOf([[68.2, 34, 88.6], [68.2, 42, 87.2], [65, 48.5, 80], [60, 51.5, 70], [56.5, 50.6, 62.4]].map((p) => at(p))), { tone: "lo" }), {
    shapes: [
      record(A.disc(G.frameOf([coilX, coilY, DB + 1.4], [0, 0, 1], [1, 0, 0], [0, 1, 0]), 0, 0.3, 8, { name: "out.coil", owner: "out.reel" })),
      record(A.box([55, 33, DB + 1.4], [69, 52, DB + 26], { name: "out.coil-end", owner: "out.reel" })),
    ],
    bias: 1,
  });
}
// ───────────────────────────── the switchboard on the desk's front ───────────
{
  const PN = SH.PANEL;
  const plate = { x: PN.x0, y: PN.y, w: PN.x1 - PN.x0, d: 2.6, r: 1.4 };
  slab("desk.switch-panel", plate, PN.z0, PN.z1 - PN.z0, { tone: "mid" }, {
    steps: 4,
    bevel: 0.9,
    extra:
      Ln(k.planOutline(k.insetPlan(plate, 3), PN.z1, P), { tone: "lo" }) +
      Dots(k.corners(plate, 4).map(([x, y]) => at([x, y, PN.z1])), { size: 0.5 }),
  });
  const glyph = [
    [[0, 0], [0, 7], [4.4, 5.6], [4.4, 1.4], [0, 0]],
    [[0, 0], [4.6, 0], [4.6, 3], [8.4, 3], [8.4, 6], [13, 6]],
    [[0, 3], [5, 3], [5, 0], [11, 0], [11, 6], [15, 6]],
  ];
  const FACE = PN.y + 2.6; // the panel's front face: the blades ride just off it
  const bladeAt = (deg) => {
    const th = (deg * Math.PI) / 180;
    const L = SH.SWITCH_L;
    return [[0, -2.6], [0, 2.6], [L - 7, 1.7], [L, 0.9], [L, -0.9], [L - 7, -1.7]].map(([u, v]) => [u * Math.cos(th) - v * Math.sin(th), u * Math.sin(th) + v * Math.cos(th)]);
  };
  for (const [i, cx] of SH.SWITCH_X.entries()) {
    const fittings = SH.switchFittings({ G, cylinder: k.cylinder, sphereOf: G.sphereOf, dotsSvg: k.dotsSvg, iso: k.iso, solidSvg: k.solidSvg }, P, cx, false);
    put(`guard.switch${i}`, [cx, SH.SWITCH_Y, SH.SWITCH_PIVOT_DZ + 15], `<g data-switch="${i}">${SH.switchMarkup({ G, prismOf: G.prismOf, solidSvg: k.solidSvg }, P, cx, SH.SWITCH_ANGLE.off)}</g><g data-fittings="${i}">${fittings}</g>`, {
      shapes: [
        record(A.prism(G.frameOf([cx, SH.SWITCH_Y, SH.SWITCH_PIVOT_DZ], [0, 1, 0], [1, 0, 0], [0, 0, 1]), bladeAt(SH.SWITCH_ANGLE.off), -1.3, 1.3, { name: `guard.switch${i}` })),
        record(A.cylinder(cx, SH.SWITCH_Y + 1.2, 3.0, SH.SWITCH_PIVOT_DZ - 3.0, 8.4, { name: `guard.switch${i}-boss`, owner: `guard.switch${i}` })),
        record(A.ball([cx - 12, SH.SWITCH_Y + 1.6, SH.SWITCH_PIVOT_DZ + 30], 3.4, { name: `guard.switch${i}-lamp` })),
      ],
      bias: 6,
      cls: "ao-switchrow",
    });
    const gl = glyph[i].map(([u, v], index) => (index ? "L" : "M") + at([cx - 16 + u, SH.SWITCH_Y - 1.5, PN.z0 + 5 + v]).map((n) => n.toFixed(1)).join(" ")).join("");
    put(`guard.switch-glyph${i}`, [cx, SH.SWITCH_Y - 1.5, PN.z0 + 12], Ln(gl, { tone: "lo" }) + Dots([at([cx + 12, SH.SWITCH_Y - 1.5, PN.z0 + 5]), at([cx + 12, SH.SWITCH_Y - 1.5, PN.z0 + 18])], { size: 0.45 }), {
      shapes: [record(A.box([cx - 16, FACE - 0.1, PN.z0 + 5], [cx + 13, FACE + 0.4, PN.z0 + 21], { name: `guard.switch-glyph${i}` }))],
      bias: 7,
    });
  }
}

// ───────────────────────────── the call token ─────────────────────────────
{
  const pos = [SH.PAD_X, SH.DOLLY_Y, SH.TOKEN_REST];
  const shape = record(A.cylinder(pos[0], pos[1], 3.5, SH.TOKEN_REST - 2.6, 2.6, { name: "signals.token" }));
  put("signals.token", pos, `<g data-tokens>${SH.tokenMarkup({ cylinder: k.cylinder, dotsSvg: k.dotsSvg, iso: k.iso, solidSvg: k.solidSvg }, P, "wake", pos)}</g>`, { shapes: [shape], bias: 5 });
}

// ───────────────────────────── output ─────────────────────────────
const SOLVED = A.settle(R, P);
if (flag("--debug")) console.log("dropped rules", SOLVED.solved.dropped?.map((r) => `${R.items[r.front].name} over ${R.items[r.back].name}`), "cycles", SOLVED.solved.cycles?.length);
items.sort((a, b) => a.key - b.key);
const CLR = { "desk.bin-wall1": 1, "work.paneS": 1 };
const ordered = [...items.filter((item) => !CLR[item.name]), ...items.filter((item) => CLR[item.name])];
const groups = ordered.map((item) => `<g class="it${item.cls ? ` ${item.cls}` : ""}">${item.svg}</g>`).join("");
const needle = `<g class="it"><path data-needle class="iso-line" data-tone="lit" data-free="end" d="${SH.needleD({ iso: k.iso, G }, P, 0)}" style="stroke-width:1.1"/><circle class="ao-hub" cx="${at([SH.DIAL.x, SH.BOARD_FACE + 6.6, SH.DIAL.z])[0].toFixed(1)}" cy="${at([SH.DIAL.x, SH.BOARD_FACE + 6.6, SH.DIAL.z])[1].toFixed(1)}" r="2.6"/></g>`;

const LABEL =
  "The always-on desk: a dispatch machine for a personal agent. Signals drop into a hopper, fall down one channel past a wake gate, sail onto a work table under a glass guard, and a dolly carries each call to the smallest of three spindle heads that can do it. A dial tracks the day's dollars against a guard cap; three knife switches on the front panel turn on the three fixes; two spare tools wait on the rack.";
const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: [back.join(""), groups, needle] });

const keys = [
  { mark: "raised", label: "the machine" },
  { mark: "lit", label: "the call, and each head as it works" },
  { mark: "dim", label: "a call the gate turns away" },
  { mark: "red", label: "the guard: cap, warn line, tripped pennant" },
];
const stage = `<div class="ao-stage" tabindex="0" role="group" aria-label="The always-on desk. Keys 1, 2 and 3 flip the wake gate, tier routing and the slimmed tool list; R restarts the day.">${svg}</div><span class="ao-live" aria-live="polite" data-announce></span>`;
const figure = k.plateHtml({
  fig: "always-on",
  title: "the always-on desk",
  hint: "flip the three switches · keys 1 2 3",
  readout: "raw day: $15.48",
  keys,
  caption: "One day of signals: 124 events fall in (96 heartbeats, 12 messages, 8 crons, 8 webhooks). The gate lets 20 wake a model; the dolly routes each to the cheapest of three heads; the tape prints one line per finished call. Numbers from the field reports of the best-of-agent-harnesses repo.",
  body: stage,
});

const DATA = {
  P,
  padX: SH.PAD_X,
  dollyY: SH.DOLLY_Y,
  tokenRest: SH.TOKEN_REST,
  stations: SH.STATION_X,
  angleOn: SH.SWITCH_ANGLE.on,
  angleOff: SH.SWITCH_ANGLE.off,
  cap: M.CAP_USD,
  warn: M.WARN_FRAC,
  trip: M.TRIP,
  slots: SH.STRIP_SLOTS,
  ladder: M.LADDER.map(({ key, day, month, wakes, tok }) => ({ key, day, month, wakes, tok })),
  field: M.FIELD_TOKENS,
  bill: M.FIELD_BILL,
  total: M.TOTAL_EVENTS,
};

// model.mjs and shared.mjs go into the page as namespaces, so their names cannot collide with the kit's
const namespaced = (name, file) => {
  const src = readFileSync(file, "utf8");
  const names = [...src.matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]);
  return `const ${name} = (() => {\n${src.replace(/^export /gm, "")}\nreturn { ${names.join(", ")} };\n})();`;
};
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const SCRIPT = [kitScript(), latheScript(), namespaced("MODEL", join(HERE, "model.mjs")), namespaced("SHARED", join(HERE, "shared.mjs")), LIVE].join("\n");

const SEC = (title, text) => `<div class="prose"><h2>${title}</h2><p>${text}</p></div>`;
const FIG = (key, label, inner, cap = "") =>
  `<figure id="${key}"><div class="fh"><b>${key.toUpperCase()}</b><span>[ ${label} ]</span></div>${inner}${cap ? `<div class="ff"><p class="cap-t">${cap}</p></div>` : ""}</figure>`;

const LEAD = `<div class="prose lead"><p>Based on the <b>best-of-agent-harnesses</b> repo: a hand-curated, ranked list of the runtimes that turn a model into a working agent. Every number here is the repo's; every drawing is redrawn.</p></div>`;

const SECTIONS = [
  SEC("What a harness is", "A model answers; an agent acts. The harness is everything around the loop: which tools exist, what needs approval, what the model sees each turn, what survives a crash."),
  FIG("anatomy", "the seven parts of a minimal harness", D.anatomy(M), "After the repo's minimal-harness template, about 180 lines of Python. Each station notes what the big harnesses add."),
  SEC("The harness moves the score more than the model", "Hold the weights fixed and swap only the harness: four published measurements, four benchmarks."),
  FIG("spread", "same model weights, only the harness changes", D.spread(M), "Because harness rankings barely transfer between models, the pick is a pairing to re-ask whenever the model changes."),
  SEC("The field", "166 ranked projects in twelve categories, one dot per project. Stars refresh weekly; scores are editorial, from public docs."),
  FIG("field", "one dot per ranked project", D.landscape(M), "Outside the ranked count sit the graveyard (archived upstream, or flagged for curation integrity) and the radar, weekly finds waiting for a vetting pass."),
  SEC("How to pick one", "Six questions, in order. Each eliminates most of the list; by the last one you should be choosing between two or three projects."),
  FIG("pick", "six questions, in order", D.pick(M), "The ladders are the repo's own tiers. Question five is where the bill shape gets priced."),
  SEC("Prove it on your own repos", "Leaderboards measure someone else's repositories. The protocol is an afternoon to set up and about two weeks to run."),
  FIG("drive", "the two-week test drive", D.drive(M), "The walk-away test on the winner prices your exit: export what you built and time the runner-up on it."),
  SEC("The toolbelt", "Ten skills that run on your own setup and hand back a number you can check: what your agent loads, reaches, claims, and wastes."),
  FIG("skills", "ten skills, each hands back a number", D.toolbelt(M), "A Python script does the checking; your data stays on your machine; the agent explains the result."),
  SEC("Start from a template", "Three files to copy into a project, two step-by-step playbooks, three agent skeletons that run on the subscription you already pay for."),
  FIG("start", "templates, playbooks, skeletons", D.starter(M), "The minimal harness is the loop, three tools, a permission gate, a context file, a turn budget, and a transcript you can resume after a crash."),
  SEC("One thread worked all the way down: always-on", "The repo's field reports price one question in detail. An agent that never sleeps burns money while it waits: about $360 a month on the raw setting, under $10 after three fixes, in priority order: wake less, route by tier, slim the tool list."),
  figure,
  FIG("bill", "the bill, four settings", D.billLadder(M), "A log scale; the dashed line is the $0.50/hour field report left on for a month."),
  FIG("gate", "one day of signals through the gate", D.dayGrid(M), "The gate wakes a model only when a script finds something; a person's message always counts as something."),
  FIG("engines", "three engines by price", D.tiers(M), "Routing by tier sends background work to the cheap engine and never puts a frontier model on a timer."),
  FIG("guard", "the guard's trip wires", D.guardWires(M), "runaway-guard's defaults: a hook stops the session on repeats, failure streaks, or the daily cap."),
  SEC("How the list stays honest", "Nightly stars, one hand-edited queue, a generator that validates every researched attribute file, an integrity check that fails the build, and a weekly rescore."),
  FIG("pipeline", "how the list stays fresh", D.pipeline(M), "One queue in; the README, the data files, the charts, and the MCP server's answers out."),
  FIG("rubric", "the deep-dive rubric", D.rubric(M), "Five axes per researched project, every rating carrying an evidence URL, validated on every build."),
].join("\n");

const FOOTER = `<footer><div class="mono-s">SOURCE</div><ul><li><a href="${M.REPO.url}">best-of-agent-harnesses</a> · Ryan Alberts · data snapshot ${M.REPO.snapshot}; every diagram here is redrawn</li></ul></footer>`;
const THEME_INIT = `<script>try{var t=new URLSearchParams(location.search).get("theme")||localStorage.getItem("iso-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.body.dataset.theme=t}catch(e){}</script>`;
const THEME_TOGGLE = `document.querySelector("[data-theme-toggle]")?.addEventListener("click",()=>{const next=document.body.dataset.theme==="dark"?"light":"dark";document.body.dataset.theme=next;try{localStorage.setItem("iso-theme",next)}catch(e){}});`;
const CSS = readFileSync(join(HERE, "..", "fingerprint-sieve", "fp.css"), "utf8") + readFileSync(join(HERE, "ao.css"), "utf8");
const body =
  `${THEME_INIT}<style>${CSS}</style>` +
  `<nav class="ao-nav"><a href="/">← All figures</a><button type="button" data-theme-toggle>Theme</button></nav>` +
  `<header class="ao-head"><h1>Agent harnesses: what they are, how to pick one, what a day costs</h1><p>The whole best-of-agent-harnesses field guide on one page: the seven parts of a harness, the measurements where it beats the model, the ranked field, the six questions, ten skills, three templates, and a working desk for the always-on problem.</p></header>` +
  LEAD +
  SECTIONS +
  FOOTER;
const page = k.pageHtml({ title: "Agent harnesses: field guide", theme: THEME, body, width: 980, script: SCRIPT + "\n" + THEME_TOGGLE });
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page);
console.log("wrote", OUT, `${(page.length / 1024).toFixed(0)} KB`, `${items.length} items`);
A.auditOrExit(R, P, {
  allow: [
    // the intake: the throat pierces the wall, the rail and the hopper; the channels hang off the rail
    ["board.wall", "board.throat"],
    ["board.rail", "board.throat"],
    ["board.channel*", "board.rail"],
    // the wake gate swings through its boss, the right rail's foot and the stop
    ["board.gate*", "board.gate*"],
    ["board.gate*", "board.channelR"],
    ["board.channelR", "board.gate-stop"],
    ["board.wall", "board.striker*"],
    ["board.wall", "guard.pennant-mast"],
    // the scale plate, its ticks and the index slider overlap by design
    ["guard.scale*", "guard.index"],
    // tools stand in their sockets
    ["tool.socket*", "tool.tool*"],
    // the table mechanism: groove, rails, screw, pillows, dolly and the glass over them
    ["work.pane*", "work.track*"],
    ["work.pane*", "work.screw"],
    ["work.pane*", "work.pillow*"],
    ["work.pane*", "work.dolly"],
    ["work.track*", "work.dolly"],
    ["work.screw", "work.pillow*"],
    ["work.screw", "work.dolly"],
    ["work.mast*", "work.mast-foot*"],
    ["work.mast*", "work.head*"],
    ["work.mast*", "work.beam"],
    // the tape end coils off the reel onto the floor beside it
    ["out.reel", "out.coil*"],
    // the printed lines live on the sheet
    ["out.tape-lines", "out.sheet-front"],
  ],
});




