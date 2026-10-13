/**
 * Slicer: a 10 mm specimen cut into six slices, stacked with air between them. The pointer's height picks a slice;
 * the slices above it rise, staggered outwards, and the one picked shows its top face and its bubbles. At rest the
 * stack is already parted over the fourth slice. The slider is the void content, in percent: more bubbles on every slice.
 *
 * The pattern: one of many, discrete. Tweens, a stagger by distance, and a hit test on the rest centres of the
 * slices, which never move.
 */
const {
  Cam, circ, clamp, facing, fit, prism, proj, spring, stepS, tdone, tset, tval, tween,
  mk, place, pointer, put, register, disposer, solid,
} = HL;

const N = 6, R = 36, T = 4.8, PITCH = 15, LIFT = 24, NB = 30, VMAX = 40, REST = 3, STEP = 55, S = 1.55;

/** A small deterministic stream of numbers in [0, 1). */
const stream = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let act = -1;
  const vs = spring(value);

  const C = Cam(45, 0.5, S);
  fit(C, [[-R, -R, 0], [R, R, 0], [R, -R, 0], [-R, R, 0], [0, 0, (N - 1) * PITCH + T + LIFT]], 200, 162);
  const P = proj(C), front = facing(C);

  // slice i: its twist off the axis at rest, its bubbles, and the tween of how far it is lifted
  const g = mk("g", {}, svg);
  const outer = circ(R, 40), inner = circ(R - 2.2, 40);
  const slices = [];
  for (let i = 0; i < N; i++) {
    const rnd = stream(31 + i * 17), tw = Math.sin(i * 0.95) * 3.2;
    const bubbles = Array.from({ length: NB }, () => ({ a: rnd() * 6.283, d: Math.sqrt(rnd()) * (R - 5.5), r: 1.3 + rnd() * 2.7 }));
    const sl = solid(g);
    bubbles.forEach((b) => { b.el = mk("ellipse", { class: "dot m" }, g); });
    slices.push({ i, ox: tw, oy: -tw * 0.6, k: 0.78 + 0.44 * rnd(), bubbles, sl, z: tween(0), drawn: NaN, vDrawn: NaN });
  }

  // the lift each slice wants when slice a is picked (a = -1 is the rest composition)
  const want = (i, a) => (a < 0 ? (i > REST ? LIFT * 0.55 : 0) : i > a ? LIFT : 0);
  slices.forEach((s) => { s.z = tween(want(s.i, -1)); });

  function drawSlice(s, now) {
    const lift = tval(s.z, now), v = vs.x;
    if (lift === s.drawn && v === s.vDrawn) return;
    s.drawn = lift; s.vDrawn = v;
    const z0 = s.i * PITCH + lift, z1 = z0 + T;
    const Pc = (x, y, z) => P(x + s.ox, y + s.oy, z);
    put(s.sl, prism(Pc, front, outer, inner, z0, z1));
    const cnt = (clamp(v, 0, VMAX) / VMAX) * NB * s.k;
    s.bubbles.forEach((b, j) => {
      const grow = clamp(cnt - j, 0, 1);
      place(b.el, Pc(b.d * Math.cos(b.a), b.d * Math.sin(b.a), z1 + 0.15));
      b.el.setAttribute("rx", (b.r * S * grow).toFixed(2));
      b.el.setAttribute("ry", (b.r * S * 0.5 * grow).toFixed(2));
    });
  }
  const B = register(stage, (dt, now) => {
    let moving = stepS(vs, dt);
    slices.forEach((s) => { drawSlice(s, now); if (!tdone(s.z, now)) moving = true; });
    return moving;
  });
  bag.add(B.unregister);

  // the bright slice: its rim and its bubbles
  function light(a) {
    const bright = a < 0 ? REST : a;
    slices.forEach((s) => {
      s.sl.sil.classList.toggle("hi", s.i === bright);
      s.bubbles.forEach((b) => { b.el.setAttribute("class", s.i === bright ? "dot" : "dot m"); });
    });
  }
  light(-1);

  // hit test: the slices' rest centres, which the lifts never move
  const cy = slices.map((s) => P(s.ox, s.oy, s.i * PITCH + T / 2 + want(s.i, -1))[1]);
  const reach = R * S * 1.05, cx = P(0, 0, 0)[0];
  function hit([x, y]) {
    if (Math.abs(x - cx) > reach || y < cy[N - 1] - 20 || y > cy[0] + 20) return -1;
    let best = 0;
    cy.forEach((c, i) => { if (Math.abs(y - c) < Math.abs(y - cy[best])) best = i; });
    return best;
  }

  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act < 0 ? REST : act;
    act = a;
    slices.forEach((s) => tset(s.z, want(s.i, a), now, Math.abs(s.i - from) * STEP));
    light(a);
    read.textContent = a < 0 ? "rest" : `slice ${a + 1}`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => { vs.t = v; B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "slicer",
  means: "A specimen cut into six slices: the pointer picks one, the slices above it part, and its bubbles show.",
  rules: [1, 2, 5, 8],
  range: [8, 18, 32],
  tour: [[200, 232], [200, 168], [200, 108], null],
  mount,
});
