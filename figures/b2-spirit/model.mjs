// The truth behind the B-2 figure: real dimensions, the planform, and a small flight-control law.
// Everything the drawing and the readout show comes from here, so the picture and the numbers cannot disagree.
//
// Plan coordinates are metres: u runs to starboard, v runs aft from the nose.

export const METRE = 5; // world units per metre
export const Z_BELLY = 26; // underside of the wing above the bench top, in world units

// Published figures (Block 30): length 69 ft, span 172 ft, 4 x F118-GE-100 at 17,300 lbf, no afterburner.
export const FACTS = {
  span: 52.4, // m
  length: 21.0, // m
  engines: 4,
  thrustLbf: 17300,
  cruiseKn: 487,
  bays: 2,
  b61PerBay: 8,
};

// The fixed wing ends on one slightly raked hinge line; nine surfaces hang behind it.
export const NOSE = [0, 0];
export const TIP = [26.2, 15.6];
export const S0 = [25.6, 16.32];
export const C = [0, 21.08];

// One tooth of the sawtooth trailing edge = one control surface, outboard to inboard on each side.
// `a` and `b` are the two ends of its hinge line (all on the same straight rear spar), `apex` is the tip of the tooth.
export const TEETH = [
  { id: "rudder", name: "Split drag rudder", a: S0, apex: [23.1, 18.445], b: [20.6, 16.32] },
  { id: "e1", name: "Outboard elevon", a: [20.6, 16.32], apex: [18.1, 18.445], b: [15.6, 16.32] },
  { id: "e2", name: "Middle elevon", a: [15.6, 16.32], apex: [13.1, 18.445], b: [10.6, 16.32] },
  { id: "e3", name: "Inboard elevon", a: [10.6, 16.32], apex: [8.1, 18.445], b: [5.6, 16.32] },
];
export const BEAVER = { id: "glas", name: "Beaver tail (gust-load alleviation)", a: [5.6, 16.32], apex: C, b: [-5.6, 16.32] };

// Degrees of trailing-edge-down per unit of command. The outboard surfaces do the most work,
// the inboard pair is mostly a low-speed helper.
export const GAIN = {
  pitch: { e1: 20, e2: 17, e3: 12 },
  roll: { e1: 14, e2: 10, e3: 6 },
  rudderMax: 38, // each half of a split rudder opens this far at full yaw command
  glasPitch: 6,
  glasGust: 2.4,
  limit: 25,
};

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// roll: +1 banks right. pitch: +1 pulls the nose up. yaw: +1 swings the nose right. gust: -1..1 turbulence.
// Returns trailing-edge-down degrees for the elevons and the beaver tail, and the open angle of each split rudder.
export function surfaces({ roll = 0, pitch = 0, yaw = 0, gust = 0 }) {
  const side = (sign) => {
    const out = {};
    for (const id of ["e1", "e2", "e3"]) {
      out[id] = clamp(-pitch * GAIN.pitch[id] + sign * roll * GAIN.roll[id], -GAIN.limit, GAIN.limit);
    }
    return out;
  };
  const left = side(+1); // banking right: the left elevons go down, the right ones go up
  const right = side(-1);
  // Yaw right opens the right wingtip rudder: drag on that side pulls the nose round.
  const open = (value) => clamp(value, 0, 1) * GAIN.rudderMax;
  left.rudder = open(-yaw);
  right.rudder = open(yaw);
  return { left, right, glas: clamp(-pitch * GAIN.glasPitch + gust * GAIN.glasGust, -12, 12) };
}

// What a banked turn at cruise does, from g * tan(bank) / V.
export function turnRate(bankDeg, speedKn = FACTS.cruiseKn) {
  const v = speedKn * 0.514444;
  return ((9.80665 * Math.tan((bankDeg * Math.PI) / 180)) / v) * (180 / Math.PI);
}

export const BANK_MAX = 30; // degrees of bank at full roll command
export const totalThrustLbf = FACTS.engines * FACTS.thrustLbf;
