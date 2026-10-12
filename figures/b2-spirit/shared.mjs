// Geometry that both the build and the live page need. No imports: the live page inlines this file as text.
// Plan coordinates (u, v) are metres: u to starboard, v aft from the nose. World units are K per metre.

export const K = 5;
export const ZB = 26; // underside of the wing above the bench top
export const WING_H = 3;
export const PANEL_T = 1.8;

export const at2 = (u, v) => [u * K, (v - 10.5) * K];

// A control surface is a triangle hinged along a (nearly spanwise) line. `deg` is trailing-edge-down.
// Returns the frame (origin on the hinge, axis along the panel normal, u along the hinge, v along the chord)
// and the triangle in that frame.
export function panelFrame(tooth, side, deg) {
  const flip = ([u, v]) => (side > 0 ? [u, v] : [-u, v]);
  const A3 = at2(...flip(tooth.a));
  const B3 = at2(...flip(tooth.b));
  const X3 = at2(...flip(tooth.apex));
  let h = [B3[0] - A3[0], B3[1] - A3[1]];
  const len = Math.hypot(h[0], h[1]);
  h = [h[0] / len, h[1] / len];
  let f = [-h[1], h[0]];
  if (f[1] < 0) f = [-f[0], -f[1]];
  const d = [X3[0] - A3[0], X3[1] - A3[1]];
  const pu = d[0] * h[0] + d[1] * h[1];
  const pv = d[0] * f[0] + d[1] * f[1];
  const r = (deg * Math.PI) / 180;
  const c = [f[0] * Math.cos(r), f[1] * Math.cos(r), -Math.sin(r)];
  const n = [f[0] * Math.sin(r), f[1] * Math.sin(r), Math.cos(r)];
  const o = [A3[0], A3[1], ZB + WING_H - PANEL_T / 2];
  return { F: { o, a: n, u: [h[0], h[1], 0], v: c }, polygon: [[0, 0], [len, 0], [pu, pv]], len, pu, pv, h, f };
}

// A point `s` along the hinge and `t` across the chord of a panel, on its top surface, at deflection `deg`.
export function panelPoint(frame, s, t, lift = 0) {
  const { F } = frame;
  const top = PANEL_T / 2 + lift;
  return [
    F.o[0] + F.u[0] * s + F.v[0] * t + F.a[0] * top,
    F.o[1] + F.u[1] * s + F.v[1] * t + F.a[1] * top,
    F.o[2] + F.u[2] * s + F.v[2] * t + F.a[2] * top,
  ];
}

// The pilot's stick: pivots about `pivot`; `roll` and `pitch` are in -1..1, the grip leans up to 18 degrees.
export const STICK_LEAN = 18;
export function stickAxis(roll, pitch) {
  const r = (roll * STICK_LEAN * Math.PI) / 180;
  const p = (pitch * STICK_LEAN * Math.PI) / 180;
  // pitch up pulls the grip toward the viewer (+y); roll right leans it to +x
  const x = Math.sin(r);
  const y = Math.sin(p);
  const z = Math.sqrt(Math.max(0.01, 1 - x * x - y * y));
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

export const HINGE_Z = ZB + WING_H;
export const POD = { back: 2.7, length: 9, lift: 1.0 }; // metres behind the hinge, world units

// the actuator pod sits on the wing just ahead of each hinge: origin and tip, in world units
export function podOrigin(tooth, side) {
  const a = side > 0 ? tooth.a : [-tooth.a[0], tooth.a[1]];
  const b = side > 0 ? tooth.b : [-tooth.b[0], tooth.b[1]];
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - POD.back];
  const [x, y] = at2(mid[0], mid[1]);
  return [x, y, HINGE_Z + POD.lift];
}
export const podTip = (tooth, side) => {
  const o = podOrigin(tooth, side);
  return [o[0], o[1] + POD.length, o[2]];
};

// One control surface as SVG markup (the plate). `lib` supplies the kit calls (prismOf, solidSvg) so this runs
// in Node and in the page. A split rudder is two plates, `half` = "up" or "down", each half the thickness.
export function panelMarkup(lib, P, tooth, side, deg, half = null) {
  const thick = half ? PANEL_T / 2 : PANEL_T;
  const frame = panelFrame(tooth, side, deg);
  if (half) frame.F.o[2] += half === "up" ? PANEL_T / 4 : -PANEL_T / 4;
  return lib.solidSvg(lib.prismOf(frame.F, frame.polygon, -thick / 2, thick / 2, P), { tone: "hi", crease: "lo" });
}

// The pilot's stick on the bench, and the bank dial beside it.
export const STICK_AT = [-112, 58];
export const STICK_BASE_H = 6;
export const STICK_PIVOT = [STICK_AT[0], STICK_AT[1], STICK_BASE_H + 5];
export const DIAL_AT = [112, 60];
export const DIAL_R = 17;
export const DIAL_TOP = 9;
export const DIAL_BANK = 45; // degrees of bank at the end of the scale

export function stickMarkup(lib, P, roll, pitch) {
  const a = stickAxis(roll, pitch);
  const o = [STICK_PIVOT[0] + a[0] * 6, STICK_PIVOT[1] + a[1] * 6, STICK_PIVOT[2] + a[2] * 6];
  const F = lib.frameAlong(o, a);
  const profile = [[0, 1.5], [17, 1.5], [17, 2.5], [19, 3.2, 1], [29, 3.4, 1], [33, 2.7, 1], [35, 1.3], [35.2, 0]];
  return lib.solidSvg(lib.solidOf(profile, F, P, { steps: 20 }), { tone: "hi", crease: "none" });
}

// bank in degrees, right positive; zero points away from the viewer along the dial
export function needlePath(lib, P, bankDeg) {
  const angle = (Math.max(-DIAL_BANK, Math.min(DIAL_BANK, bankDeg)) / DIAL_BANK) * (Math.PI / 2);
  const [cx, cy] = DIAL_AT;
  return lib.lineOnTop([cx - Math.sin(angle) * 3, cy + Math.cos(angle) * 3], [cx + Math.sin(angle) * (DIAL_R - 4.4), cy - Math.cos(angle) * (DIAL_R - 4.4)], DIAL_TOP + 0.15, P);
}
