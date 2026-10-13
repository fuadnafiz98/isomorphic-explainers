// Everything the page states about the paper, in one place. Numbers are from Roman et al., Polymers 2022, 14(11), 2262.
// "read" means read off a published plot (about ±3-5%); everything else is printed in the paper.

export const PAPER = {
  title: "Natural Rubber Blend Optimization via Data-Driven Modeling: The Implementation for Reverse Engineering",
  authors: "Roman, Qin, Rodriguez, Gonzalez, Zavala, Osswald",
  venue: "Polymers 2022, 14(11), 2262",
  doi: "https://doi.org/10.3390/polym14112262",
  url: "https://www.mdpi.com/2073-4360/14/11/2262",
};

// Table 2. pph = parts per hundred of rubber. NaHCO3 is held at 8 pph in every blend.
export const BLENDS = [
  { n: 1, s: 2.5, p: 80 }, { n: 2, s: 2.5, p: 50 }, { n: 3, s: 1.5, p: 40 }, { n: 4, s: 1.5, p: 80 },
  { n: 5, s: 1.5, p: 20 }, { n: 6, s: 0.5, p: 20 }, { n: 7, s: 0.5, p: 0 }, { n: 8, s: 2.5, p: 0 },
  { n: 9, s: 4.0, p: 0 }, { n: 10, s: 0.6, p: 39, model: true }, { n: 11, s: 0.3, p: 59, model: true },
];

// The four things measured per specimen.
export const OUTPUTS = [
  { id: "dur", sym: "durometer", unit: "Shore A", what: "how hard it feels, one press" },
  { id: "sig", sym: "σ_relax", unit: "kPa", what: "peak stress when you squash it to 30 %" },
  { id: "n", sym: "n_relax", unit: "–", what: "how fast that stress fades afterwards" },
  { id: "tan", sym: "tan δ", unit: "–", what: "how much of each cycle becomes heat" },
];
export const INPUTS = [
  { id: "s", sym: "sulfur", unit: "pph", lo: 0.5, hi: 4, role: "crosslinker" },
  { id: "p", sym: "paraffin oil", unit: "pph", lo: 0, hi: 80, role: "plasticizer" },
  { id: "v", sym: "voids", unit: "%", lo: 0, hi: 40, role: "foam, set by mould fill" },
];

// Figure 13: Pearson correlation matrix. Order matters: three inputs, then four outputs.
export const VARS = ["sulfur", "paraffin", "voids", "durometer", "σ_relax", "n_relax", "tan δ"];
export const PEARSON = [
  [1],
  [-0.089, 1],
  [0.053, -0.036, 1],
  [0.52, -0.81, -0.18, 1],
  [0.58, -0.69, -0.33, 0.91, 1],
  [0.68, -0.015, -0.14, 0.49, 0.47, 1],
  [-0.8, -0.093, 0.016, -0.42, -0.41, -0.95, 1],
];

// Figures 22-24: max stress in the relaxation test against void content. Slope is printed (kPa per 1 % void);
// the intercept (stress at 0 % void) is read off the plot. The legend of Fig. 24 has its two sulfur levels swapped;
// these pairs follow Figs. 22 and 23 and the text (2.1 and 4.4 kPa per % at 80 pph oil).
export const VOID_LINES = [
  { id: "a", s: 1.5, p: 20, y0: 310, k: -3.9 },
  { id: "b", s: 1.5, p: 40, y0: 175, k: -3.7 },
  { id: "c", s: 1.5, p: 80, y0: 125, k: -2.1 },
  { id: "d", s: 2.5, p: 50, y0: 228, k: -3.3 },
  { id: "e", s: 2.5, p: 80, y0: 163, k: -4.4 },
];

// Figure 31 (read): n_relax against sulfur, error bars are the plotted ones.
export const N_VS_SULFUR = [{ s: 0.5, n: -0.0294, e: 0.0018 }, { s: 1.5, n: -0.0126, e: 0.0031 }, { s: 2.5, n: -0.0110, e: 0.0019 }];
// Figures 20 and 21 (read): stress at the start of the relaxation test, 30 % strain, by paraffin oil.
export const SAT = {
  s15: [{ p: 20, y: 340 }, { p: 40, y: 250 }, { p: 80, y: 170 }],
  s25: [{ p: 20, y: 640 }, { p: 40, y: 285 }, { p: 80, y: 262 }],
};
// Figure 25 (read): tan δ against paraffin oil.
export const TAN_VS_OIL = {
  s15: [{ p: 20, y: 0.0200 }, { p: 40, y: 0.0345 }, { p: 80, y: 0.0155 }],
  s25: [{ p: 50, y: 0.0122 }, { p: 80, y: 0.0164 }],
};

// Table 7: 5-fold cross-validated R2.
export const MODELS = [
  { id: "lr", name: "Linear regression", short: "linear", params: "4 per property", note: "baseline: Y = a0 + a1·S + a2·P + a3·V" },
  { id: "rsm", name: "Response surface", short: "RSM", params: "10 per property", note: "adds squares and pairwise products" },
  { id: "ann", name: "Neural network", short: "ANN", params: "161 to 353", note: "one small net per property" },
  { id: "gpr", name: "Gaussian process", short: "GPR", params: "kernel only", note: "mean plus error bar, no weights to read" },
];
export const R2 = {
  dur: { lr: 0.91, rsm: 0.97, ann: 0.99, gpr: 1.0 },
  sig: { lr: 0.90, rsm: 0.99, ann: 0.96, gpr: 1.0 },
  n: { lr: 0.48, rsm: 0.75, ann: 0.94, gpr: 1.0 },
  tan: { lr: 0.67, rsm: 0.87, ann: 0.98, gpr: 1.0 },
};

// Table 5: the chosen network for each property.
export const ANN = {
  dur: { layers: [64], lr: 0.01, params: 321 },
  sig: { layers: [16, 16], lr: 0.01, params: 353 },
  n: { layers: [16, 16], lr: 0.01, params: 353 },
  tan: { layers: [32], lr: 0.003, params: 161 },
};
export const annParams = (layers, nIn = 3) => {
  let n = nIn, t = 0;
  for (const h of layers) { t += n * h + h; n = h; }
  return t + n + 1;
};

// Table 6: the reverse-engineering target and what each method proposed.
export const TARGET = { sig: 90, n: -0.0527, tan: 0.066 };
export const PROPOSED = [
  { id: "rsm", name: "RSM", s: 0.65, p: 69.5, v: 30.0, pred: { dur: 0.45, sig: 90.26, n: -0.02875, tan: 0.0982 } },
  { id: "ann", name: "ANN", s: 0.55, p: 54, v: 17, pred: { dur: 5.612, sig: 82.45, n: -0.0399, tan: 0.113 } },
  { id: "gpr", name: "GPR", s: 0.55, p: 57, v: 10, pred: { dur: 6.187, sig: 111.78, n: -0.0347, tan: 0.114 } },
];
export const pctOff = (pred, target) => ((pred - target) / Math.abs(target)) * 100;

// A small exact Gaussian process (RBF kernel) for the playground: the same maths as scikit-learn's default GPR.
export function gp(points, xs, { length = 0.7, noise = 1e-4 } = {}) {
  const k = (a, b) => Math.exp(-((a - b) ** 2) / (2 * length * length));
  const n = points.length;
  if (!n) return xs.map(() => ({ m: 0, sd: 1 }));
  const K = points.map((a, i) => points.map((b, j) => k(a.x, b.x) + (i === j ? noise : 0)));
  const solve = (A, B) => {
    const m = A.length, M = A.map((r, i) => [...r, ...B[i]]);
    for (let c = 0; c < m; c++) {
      let p = c;
      for (let r = c + 1; r < m; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < m; r++) {
        if (r === c) continue;
        const f = M[r][c] / M[c][c];
        for (let j = c; j < M[0].length; j++) M[r][j] -= f * M[c][j];
      }
    }
    return M.map((r, i) => r.slice(m).map((v) => v / M[i][i]));
  };
  const y = points.map((p) => [p.y]);
  const alpha = solve(K, y).map((r) => r[0]);
  return xs.map((x) => {
    const ks = points.map((p) => k(p.x, x));
    const m = ks.reduce((s, v, i) => s + v * alpha[i], 0);
    const w = solve(K, ks.map((v) => [v])).map((r) => r[0]);
    const v = Math.max(0, 1 - ks.reduce((s, kv, i) => s + kv * w[i], 0));
    return { m, sd: Math.sqrt(v) };
  });
}
