/**
 * Tarp: twenty slats across a plinth, standing at the height a Gaussian process expects, with a dashed guide above
 * each for how far it could be wrong. Three bright posts are the measurements, bunched left of centre, so the slack
 * is plain on the right. The pointer previews a new measurement in its column: the slats nearby spring toward it and
 * their guides shrink. A press keeps it. The read-out says which post it would be. The slider is the kernel's reach.
 *
 * The pattern: a continuous field with a discrete commit. Springs on every slat, a hit test on the ground plane.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, spring, stepS, unproj, mk, pointer, put, register, disposer, solid,
} = HL;

const N = 20, W = 7, D = 30, BASE = 6, SC = 46, PM = 0.45, SF = 0.3, MAXPTS = 9, S = 1.86;
const truth = (u) => 0.45 + 0.3 * Math.sin(6.4 * u + 0.5) + 0.1 * Math.sin(13 * u);
const START = [5, 6, 8];

/** Posterior mean and standard deviation over the columns, given the measured columns (RBF kernel, reach in columns). */
function posterior(cols, reach) {
  const k = (a, b) => Math.exp(-((a - b) ** 2) / (2 * reach * reach));
  const n = cols.length;
  const K = cols.map((a, i) => [...cols.map((b, j) => k(a, b) + (i === j ? 1e-4 : 0)), truth(a / (N - 1)) - PM]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(K[r][c]) > Math.abs(K[p][c])) p = r;
    [K[c], K[p]] = [K[p], K[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = K[r][c] / K[c][c]; for (let j = c; j <= n; j++) K[r][j] -= f * K[c][j]; }
  }
  const alpha = K.map((r, i) => r[n] / r[i]);
  return Array.from({ length: N }, (_, x) => {
    const ks = cols.map((c) => k(c, x));
    // variance through the same elimination, one solve per column
    const m = ks.reduce((s, v, i) => s + v * alpha[i], 0);
    const A = cols.map((a, i) => [...cols.map((b, j) => k(a, b) + (i === j ? 1e-4 : 0)), ks[i]]);
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let j = c; j <= n; j++) A[r][j] -= f * A[c][j]; }
    }
    const v = 1 - ks.reduce((s, kv, i) => s + (kv * A[i][n]) / A[i][i], 0);
    return { m: PM + m, sd: Math.sqrt(Math.max(0, v)) };
  });
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value, data = START.slice(), pre = -1;

  const C = Cam(45, 0.5, S);
  const EX = N * W;
  fit(C, [[-6, -6, -5], [EX + 6, D + 6, -5], [EX + 6, -6, -5], [-6, D + 6, -5], [0, 0, BASE + SC * 1.1]], 200, 170);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-6, -6, EX + 6, D + 6, 8, 2);
  put(solid(g), prism(P, front, pr, pi, -5, 0));

  const slats = Array.from({ length: N }, (_, i) => {
    const [r, inn] = rings(i * W + 0.6, 4, i * W + W - 0.6, D - 4, 2.2, 0.8);
    const guide = mk("path", { class: "nf dash" }, g);
    return { i, r, inn, el: solid(g), guide, h: spring(BASE + SC * PM), u: spring(0), drawn: NaN };
  });

  function aim(init) {
    const cols = pre >= 0 && !data.includes(pre) ? [...data, pre] : data;
    const post = posterior(cols, reach);
    slats.forEach((s, i) => {
      s.h.t = BASE + SC * post[i].m; s.u.t = SC * SF * 1.96 * post[i].sd;
      if (init) { s.h.x = s.h.t; s.u.x = s.u.t; }
    });
    slats.forEach((s) => s.el.sil.classList.toggle("hi", cols.includes(s.i)));
  }
  function draw(s) {
    const h = Math.max(1, s.h.x), u = s.u.x, key = h + u * 1000;
    if (key === s.drawn) return;
    s.drawn = key;
    put(s.el, prism(P, front, s.r, s.inn, 0, h));
    s.guide.setAttribute("d", u > 0.6 ? prism(P, front, s.r, s.inn, h + 0.6, h + 0.6 + u).sil : "");
  }
  const B = register(stage, (dt) => {
    let m = false;
    for (const s of slats) { if (stepS(s.h, dt)) m = true; if (stepS(s.u, dt)) m = true; draw(s); }
    return m;
  });
  bag.add(B.unregister);
  aim(true);
  slats.forEach(draw);

  // the ground never moves: the column is the strip of the plinth under the pointer
  const column = ([x, y]) => {
    const [wx, wy] = unproj(C, x, y, 0);
    return wy < -4 || wy > D + 4 || wx < 0 || wx >= EX ? -1 : clamp(Math.floor(wx / W), 0, N - 1);
  };
  function preview(c) {
    if (c === pre) return;
    pre = c; aim();
    read.textContent = c < 0 ? "rest" : data.includes(c) ? `post ${data.indexOf(c) + 1}` : `post ${Math.min(data.length + 1, MAXPTS)}`;
    B.wake();
  }
  bag.add(pointer(stage, {
    move: (p) => preview(column(p)),
    down: (p) => {
      const c = column(p);
      if (c >= 0 && !data.includes(c)) { data = [...data, c].slice(-MAXPTS); pre = -2; }
      preview(c);
    },
    leave: () => preview(-1),
  }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { reach = v; aim(); B.wake(); }, destroy: bag.dispose };
}

hairline({
  name: "tarp",
  means: "A row of slats at the height a Gaussian process expects; each guide is how wrong it could be, and tightens near a new post.",
  rules: [1, 3, 5, 8],
  range: [1.2, 2.4, 4.5],
  tour: [[110, 215], [170, 190], [270, 160], null],
  mount,
});
