// The always-on desk: world layout and the markup builders shared by the static build and the live page.
// This machine is a dispatch desk. Signals arrive at a hopper, fall down one channel, meet a gate that
// decides whether the engine is worth waking, sail onto a work table under a glass splash guard, are
// carried by a dolly to the smallest of three spindle heads that can do the work, and print out to your
// chat apps. A dial tracks the day's dollars against a guard cap, a front switchboard carries the three
// fixes, and two spare tools can slide off the rack.

// ── world layout ────────────────────────────────────────────────────────────
export const FOOT_H = 7;
export const PLATE = { x: -234, y: -104, w: 468, d: 224, r: 14 };
export const PLATE_H = 14;

export const BOARD = { x: -218, y: -100, w: 436, d: 9, r: 2 }; // back wall, z 0..146
export const BOARD_FACE = -91; // y of the board's front face
export const PILLAR_L = { x: -232, y: -100, w: 14, d: 190, r: 3 }; // end panels, z 0..146
export const PILLAR_R = { x: 218, y: -100, w: 14, d: 190, r: 3 };
export const TOPRAIL = { x: -232, y: -100, w: 464, d: 14, r: 4 }; // z 146..154
export const BOARD_TOP = 146;
export const RAIL_TOP = 154;

export const HOPPER = { x: -168, y: -98, w: 50, d: 14, r: 2 }; // z 154..172
export const HOPPER_H = 18;
export const CHANNEL_X = -143; // centre line of the drop
export const CHANNEL_Y = -85.5; // tokens fall here
export const CHANNEL_L = { x: -155, y: -91, w: 4, d: 10, r: 0.6 }; // rails hang off the board face
export const CHANNEL_R = { x: -127, y: -91, w: 4, d: 10, r: 0.6 };
export const CHANNEL_BOTTOM = 98;
export const GATE_PIVOT = [-123, -85.5];
export const GATE_Z = 98;
export const GATE_H = 5.5;

export const BELL = { x: -96, z: 113 }; // bell dome on the board; striker taps below
export const DIAL = { x: 70, z: 106, r: 24 }; // big dial on the board
export const SCALE = { x: 100, w: 22, z0: 64, z1: 128 }; // dollar scale plate, left of the right end panel's shadow line
export const PENNANT = { x: 113, z: 128 }; // guard flag mast on the scale
export const BOARD_PLANE = -85.8; // z-plane where board-face parts sit

export const DESK = { x: -218, y: -86, w: 436, d: 172, r: 6 }; // z 56..60
export const DESK_Z = 56;
export const DESK_H = 4;
export const DESK_FACE = 86;
export const LEGS = [
  [-204, -72],
  [204, -72],
  [-204, 72],
  [204, 72],
];

// the switchboard: three knife switches on a plate on the desk's front face (x-z plane, facing you)
export const PANEL = { x0: 100, x1: 212, z0: 4, z1: 56, y: 86 };
export const SWITCH_X = [128, 156, 184];
export const SWITCH_PIVOT_DZ = 12;
export const SWITCH_L = 26; // blade length: clears the next switch's boss at rest
export const SWITCH_ANGLE = { on: 62, off: 14 }; // degrees above the panel base line
export const SWITCH_Y = 90.4; // the blade rides just off the panel face

// cabinet on the desk's left half: a tool chest, two shut drawers and a wide open one
export const CABINET = { x: -172, y: 40, w: 166, d: 46, r: 2 };

export const BIN = { x: -206, y: -70, w: 46, d: 40, r: 2 }; // quiet bin, open top
export const BIN_TOP = 74;
export const RACK = { x: -140, y: -70, w: 108, d: 11, r: 2 }; // tool rail
export const SOCKETS = [-124, -106, -88, -70, -52]; // five sockets; the last two hold the spares
export const TRAY = { x: -24, y: -76, w: 30, d: 16, r: 2 }; // spares tray (slim switch)
export const SPARE_SHIFT = 47; // world x the spares slide when the rack is slimmed

// the work frame: three spindle heads on masts over the table, a dolly carrying the call
export const TABLE = { x: -4, y: -52, w: 70, d: 60, r: 3 }; // work table z 60..66
export const TABLE_TOP = 66;
export const DOLLY_Y = -22.5; // the dolly's groove line
export const PAD_X = 16; // where the call lands (over the cheap station)
export const STATION_X = [16, 34, 52]; // small, mid, large — head centres
export const HEAD_R = [6.5, 7.5, 8];
export const HEAD_H = [22, 29, 36];
export const HEAD_TOP = 134; // every head parks with its top here
export const MAST = { y: -39, w: 6, d: 7 }; // per station, on the table's back strip
export const BEAM = { x: 10, y: -39, w: 48, d: 7, r: 1 }; // z 139..146
export const DOLLY_R = 7.2;
export const DOLLY_TOP = 68.7; // TABLE_TOP + 0.5 + 2.2: the lathe's true top face
export const TOKEN_REST = DOLLY_TOP + 2.6; // the puck's top face; its base sits on the dolly

// the sandbox: a low glass guard round the table, open front
export const SANDBOX = { x0: 7.5, x1: 62.5, y0: -44, y1: -2, top: 84 };
export const PARAPET = 84;

export const PRINTER = { x: 124, y: -52, w: 60, d: 44, r: 3 }; // z 60..90 on the desk
export const STRIP = { x: 138, y: -8.4, w: 32, x0: 138, x1: 170 }; // paper on the printer's front face
export const STRIP_SLOTS = 22;
export const STRIP_Z0 = 86;
export const STRIP_DZ = 1.15;

export const PLAQUES = [
  { x: 154, z: 64, w: 53.4, h: 18 },
  { x: 154, z: 86, w: 53.4, h: 18 },
  { x: 154, z: 108, w: 53.4, h: 18 },
];
export const PLAQUE_POST = { x: 210, y: 60 };

export const CUBBY = { x: 20, y: 8, w: 104, d: 76, r: 2 }; // tape store, open top, z 60..78
export const DRUM = { x: 84, y: 34, r: 12, len: 46 };

// the day that flows through: 124 events, 96 of them heartbeats
export const TOKEN_PATH = {
  spawn: [CHANNEL_X, CHANNEL_Y, 148],
  gate: [CHANNEL_X, CHANNEL_Y, 101.5],
  wake: [
    [CHANNEL_X, CHANNEL_Y, 101.5],
    [-130, -72, 94],
    [-100, -54, 88],
    [-64, -34, 85],
    [-24, -18, 85],
    [20, 10, 89],
    [PAD_X, -4, 86],
    [PAD_X, -18, 76],
    [PAD_X, DOLLY_Y, TOKEN_REST],
  ],
  quiet: [
    [CHANNEL_X, CHANNEL_Y, 101.5],
    [-150, -75, 94],
    [-176, -58, 82],
    [-181, -48, 70],
    [-181, -48, 64.8],
  ],
};

// ── geometry helpers ────────────────────────────────────────────────────────
export function rotRing(ring, deg, pivot = [0, 0]) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return ring.map(([x, y]) => [pivot[0] + x * c - y * s, pivot[1] + x * s + y * c]);
}

// the gate paddle: a plate that seals the drop at rest, swinging clear (toward you) when it opens
export function paddleRing(lib, open) {
  const deg = -62 * open;
  const ring = lib.ringOf({ x: -27, y: -4.7, w: 27, d: 9.4, r: 1.2 }, 6);
  return rotRing(ring, deg, GATE_PIVOT);
}
export function paddleMarkup(lib, P, open = 0) {
  const blade = lib.extrude(paddleRing(lib, open), GATE_Z + 0.6, GATE_H - 1.2, P, { bevel: 0.5 });
  return lib.solidSvg(blade, { tone: "mid" });
}

// a knife switch on the front panel: a tapered blade swung about its pivot in the panel plane,
// a knob on the tip, two contact studs and a lamp above
export function switchMarkup(lib, P, cx, angle) {
  const th = (angle * Math.PI) / 180;
  const L = SWITCH_L;
  const local = [
    [0, -2.6],
    [0, 2.6],
    [L - 7, 1.7],
    [L, 0.9],
    [L, -0.9],
    [L - 7, -1.7],
  ];
  const poly = local.map(([u, v]) => [u * Math.cos(th) - v * Math.sin(th), u * Math.sin(th) + v * Math.cos(th)]);
  const F = lib.G.frameOf([cx, SWITCH_Y, SWITCH_PIVOT_DZ], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const width = 3.6;
  const blade = lib.G.prismOf(F, poly, -width / 2, width / 2, P);
  const tip = [cx + L * Math.cos(th), SWITCH_Y, SWITCH_PIVOT_DZ + L * Math.sin(th)];
  const knob = lib.G.sphereOf(tip, 3.1, P, { steps: 20 });
  return lib.solidSvg(blade, { tone: "hi", crease: "lo" }) + lib.solidSvg(knob, { tone: "mid" });
}
// the static parts of one switch (pivot boss, studs, lamp) — not rebuilt per frame
export function switchFittings(lib, P, cx, on) {
  const th = (SWITCH_ANGLE.on * Math.PI) / 180;
  const th2 = (SWITCH_ANGLE.off * Math.PI) / 180;
  const L = SWITCH_L;
  const studs = lib.dotsSvg(
    [
      lib.iso([cx + L * Math.cos(th), SWITCH_Y + 1.2, SWITCH_PIVOT_DZ + L * Math.sin(th)], P),
      lib.iso([cx + L * Math.cos(th2), SWITCH_Y + 1.2, SWITCH_PIVOT_DZ + L * Math.sin(th2)], P),
    ],
    { size: 1.15, tone: "lo" },
  );
  const boss = lib.cylinder(cx, SWITCH_Y + 1.2, 3.0, SWITCH_PIVOT_DZ - 3.0, 8.4, P, 20);
  const lamp = lib.G.sphereOf([cx - 12, SWITCH_Y + 1.6, SWITCH_PIVOT_DZ + 30], 3.4, P, { steps: 22 });
  return lib.solidSvg(boss, { tone: "lo" }) + studs + lib.solidSvg(lamp, { tone: on ? "lit" : "lo" });
}

// a token: the one lit part when the model is woken, a dim one when the gate says quiet
export function tokenMarkup(lib, P, kind = "wake", pos = TOKEN_PATH.spawn) {
  const [x, y, z] = pos;
  const puck = lib.cylinder(x, y, 3.5, z - 2.6, 2.6, P, 18, 0.4);
  const dot = lib.dotsSvg([lib.iso([x, y, z], P)], { size: 0.6, tone: kind === "wake" ? "lit" : "lo" });
  return lib.solidSvg(puck, { tone: kind === "wake" ? "lit" : "lo" }) + dot;
}

// the dial face: ticks from 210° down to −30°, the day's dollars read against the guard cap
export const DIAL_SWEEP = { from: 210, to: -30 };
export function dialAngle(frac) {
  return DIAL_SWEEP.from + (DIAL_SWEEP.to - DIAL_SWEEP.from) * Math.max(0, Math.min(1, frac));
}
export function dialPoint(lib, P, frac, r) {
  const F = lib.G.frameOf([DIAL.x, BOARD_FACE, DIAL.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  return lib.G.pointOf(F, 4.4, r, (dialAngle(frac) * Math.PI) / 180);
}
export function needleD(lib, P, frac) {
  const tip = dialPoint(lib, P, frac, 19);
  const c = [DIAL.x, BOARD_FACE + 4.4, DIAL.z]; // the needle rides 4.4 out from the board face
  const a = lib.iso(c, P);
  const b = lib.iso(tip, P);
  return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
}

// the cost scale: ticks on the plate face and a sliding index that reads the day's bill.
// the zero sits at 80: high enough that the right end panel never hides the index at rest.
export const SCALE_FULL = 15.48; // the raw day, full scale
export function scaleZ(v) {
  const z0 = SCALE.z0 + 16; // 80
  const z1 = SCALE.z1 - 6; // 122
  return z0 + ((z1 - z0) * v) / SCALE_FULL;
}
export function scaleTickPoints() {
  const out = [];
  for (let v = 0; v <= 15; v += 1) out.push({ v, z: scaleZ(v), major: v % 5 === 0 });
  out.push({ v: SCALE_FULL, z: scaleZ(SCALE_FULL), major: true, cap: true });
  return out;
}
export function indexOffset(lib, P, frac) {
  // travel from the zero mark to the full mark, matching where the index is drawn at rest
  const dz = (SCALE.z1 - 6 - (SCALE.z0 + 16)) * Math.max(0, Math.min(1, frac));
  const o = lib.iso([0, 0, dz], P);
  const zero = lib.iso([0, 0, 0], P);
  return `translate(${(o[0] - zero[0]).toFixed(2)} ${(o[1] - zero[1]).toFixed(2)})`;
}

// printer strip slots (revealed one per finished call)
export function tapeSlotLines() {
  const out = [];
  for (let i = 0; i < STRIP_SLOTS; i++) {
    const z = STRIP_Z0 - i * STRIP_DZ;
    out.push({ z, i });
  }
  return out;
}

// a head's plunge: translate the whole head group down along the screen's z axis
export function plungeTransform(lib, P, dz) {
  const a = lib.iso([0, 0, 0], P);
  const b = lib.iso([0, 0, -dz], P);
  return `translate(${(b[0] - a[0]).toFixed(2)} ${(b[1] - a[1]).toFixed(2)})`;
}

export const money0 = (v) => (v >= 100 ? "$" + Math.round(v) : "$" + v.toFixed(2));
