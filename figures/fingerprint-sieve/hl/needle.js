/**
 * Needle: a deck of five edge-notched cards, one a visit. Each card is cut
 * with a notch for its cookie, its address and its fingerprint. The pointer
 * drives a needle along the top of the deck, and the cards notched at that
 * place rise out of it. Through a cookie hole it lifts one or two; through the
 * fingerprint holes it lifts all five, because they share the same cut. At
 * rest the needle waits, bright, over the fingerprint holes.
 *
 * The pattern: one of many, plus a continuous follower. A spring for where the
 * needle is, a tween for which cards are out, a stagger by distance.
 */
const {
  Cam, clamp, facing, fillet, fit, open, poly, prism, proj, rings, seg, spring, stepS,
  tdone, tset, tval, tween, mk, place, pointer, put, register, disposer, solid, unproj,
} = HL;

const W = 104, H = 44, N = 5, G = 16, TK = 1.4, HOLES = 8, SLOT = 6, DEEP = 9, LIFT = 15, STEP = 55;
const HOLE_Z = H - 4.5, COL0 = 8, COLD = (W - 16) / (HOLES - 1), REST_COL = 5.5, PB = 4;
// the cut columns of each visit: a cookie hole of its own, an address hole, then the shared fingerprint holes 4..7
const CUTS = [[0, 2, 4, 5, 6, 7], [1, 2, 4, 5, 6, 7], [0, 3, 4, 5, 6, 7], [1, 3, 4, 5, 6, 7], [0, 2, 4, 5, 6, 7]];
const JOG = [3, -2, 1.5, -3, 0.5];
const colX = (c) => COL0 + c * COLD;

function outline(cuts) {
  const pts = [[0, 0], [W, 0], [W, H]], rad = [2.2, 2.2, 1.6];
  for (let c = HOLES - 1; c >= 0; c--) {
    if (!cuts.includes(c)) continue;
    const u = colX(c);
    pts.push([u + SLOT / 2, H], [u + SLOT / 2, H - DEEP], [u - SLOT / 2, H - DEEP], [u - SLOT / 2, H]);
    rad.push(0.8, 1.6, 1.6, 0.8);
  }
  pts.push([0, H]); rad.push(1.6);
  return fillet(pts, rad, 3);
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value, col = -1;
  const C = Cam(45, 0.5, 2.4);
  const EY = (N - 1) * G;
  fit(C, [[-8, -8, -PB], [W + 8, EY + 8, -PB], [W + 8, -8, H + LIFT], [-8, -8, H + LIFT], [-8, EY + 8, -PB]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-8, -8, W + 8, EY + 8, 7, 1.8);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  const cards = [];
  for (let i = 0; i < N; i++) {
    const shape = outline(CUTS[i]), grp = mk("g", {}, g), jx = JOG[i], y = i * G;
    const back = mk("path", { class: "lo" }, grp), face = mk("path", { class: "sil" }, grp);
    const rules = mk("path", { class: "nf lo" }, grp);
    const dots = [];
    for (let c = 0; c < HOLES; c++) if (!CUTS[i].includes(c)) dots.push([c, mk("circle", { r: 1.2, class: "dot off" }, grp)]);
    cards.push({ shape, jx, y, back, face, rules, dots, a: tween(0), drawn: NaN, cuts: CUTS[i] });
  }

  // the needle: a rod along the deck and a ball at its near end, on a spring for where, one for how low
  const sx = spring(colX(REST_COL), { eps: 0.02 }), sz = spring(H + 20, { eps: 0.05 });
  const rod = mk("path", { class: "nf sil" }, g), ball = mk("circle", { r: 2.4, class: "dot" }, g);

  function drawCard(c, now) {
    const lift = tval(c.a, now);
    if (lift === c.drawn) return;
    c.drawn = lift;
    const w = (u, v) => P(c.jx + u, c.y, v + lift), wb = (u, v) => P(c.jx + u, c.y - TK, v + lift);
    c.back.setAttribute("d", poly(c.shape.map((p) => wb(p[0], p[1]))));
    c.face.setAttribute("d", poly(c.shape.map((p) => w(p[0], p[1]))));
    c.rules.setAttribute("d", seg(w(6, 10), w(W - 6, 10)) + seg(w(6, 16), w(W - 30, 16)) + seg(w(6, 22), w(W - 44, 22)));
    for (const [k, el] of c.dots) place(el, w(colX(k), HOLE_Z));
  }
  const drawNeedle = () => {
    const x = sx.x, z = sz.x;
    rod.setAttribute("d", seg(P(x, -10, z), P(x, EY + 12, z)));
    place(ball, P(x, EY + 12, z));
  };

  const B = register(stage, (dt, now) => {
    let moving = stepS(sx, dt);
    if (stepS(sz, dt)) moving = true;
    for (const c of cards) { drawCard(c, now); if (!tdone(c.a, now)) moving = true; }
    drawNeedle();
    return moving;
  });
  bag.add(B.unregister);

  /** The needle goes through column k (-1 lifts it clear): the cards cut there rise, staggered from the nearest. */
  function through(k) {
    sx.t = colX(k < 0 ? REST_COL : k);
    sz.t = k < 0 ? H + 20 : HOLE_Z;
    if (k !== col) {
      col = k;
      const now = performance.now();
      cards.forEach((c, i) => {
        const out = k >= 0 && c.cuts.includes(k);
        tset(c.a, out ? LIFT : 0, now, i * stag * 0.5);
        c.face.classList.toggle("hi", out);
      });
      const n = k < 0 ? 0 : cards.filter((c) => c.cuts.includes(k)).length;
 ball.setAttribute("class", "dot" + (k < 0 ? "" : " m"));
      read.textContent = k < 0 ? "rest" : `hole ${k + 1} · ${n} out`;
    }
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => {
      const [x] = unproj(C, p[0], p[1], 0);
      through(clamp(Math.round((x - COL0 - 3) / COLD), 0, HOLES - 1));
    },
    leave: () => through(-1),
  }));
  bag.add(() => svg.replaceChildren());
  read.textContent = "rest";

  return { set: (v) => { stag = v; }, destroy: bag.dispose };
}

hairline({
  name: "needle",
  means: "A needle through a cookie hole lifts one visit; through the fingerprint holes it lifts all five.",
  rules: [1, 2, 4, 8],
  range: [0, 55, 120],
  tour: [[129, 101], [220, 147], [251, 162], null],
  mount,
});
