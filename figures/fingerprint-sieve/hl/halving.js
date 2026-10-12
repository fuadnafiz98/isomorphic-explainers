/**
 * Halving: a tray of 64 pucks, one of them you. The pointer's place along the
 * tray's front is how many questions have been asked, 0 to 6. Each question
 * lowers the pucks that answer differently, half of those still standing, and
 * the ripple runs outwards from the question being asked. At rest three
 * questions are in: eight pucks stand and you are the bright one.
 *
 * The pattern: one of many, discrete. A tween per puck, a stagger by distance
 * in questions, and a hit test on the ground, which never moves.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, unproj, tdone, tset, tval, tween,
  flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const N = 8, CELL = 14, FOOT = 9.2, EXT = N * CELL, PB = 5, UP = 16, DOWN = 0.9;
const KMAX = 6, YOU = 27, REST = 3, STEP = 60;

/** How many leading bits of the 6-bit code b match yours: the questions it survives. */
const matches = (b) => { const x = b ^ YOU; return x === 0 ? KMAX : 5 - Math.floor(Math.log2(x)); };

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let step = value, level = REST, over = false;

  const C = Cam(45, 0.5, 2.08);
  fit(C, [[-6, -6, -PB], [EXT + 6, EXT + 6, -PB], [EXT + 6, -6, -PB], [-6, EXT + 6, -PB], [0, 0, UP + 4]], 200, 170);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-6, -6, EXT + 6, EXT + 6, 9, 2.2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  // the question marks along the front edge: one dot a question, the asked ones lit
  const notch = [];
  for (let k = 0; k < KMAX; k++) notch.push(flatDot(g, C, 1.5, "dot off"));

  // a permutation of the 64 codes over the 64 cells, so what stands is scattered, not striped
  const pucks = [];
  for (let b = 0; b < N * N; b++) {
    const c = (b * 37 + 11) % (N * N), i = c % N, j = Math.floor(c / N);
    const x0 = i * CELL + (CELL - FOOT) / 2, y0 = j * CELL + (CELL - FOOT) / 2;
    const [ring, inner] = rings(x0, y0, x0 + FOOT, y0 + FOOT, 3.6, 0.9);
    pucks.push({ i, j, m: matches(b), ring, inner, a: tween(level <= matches(b) ? UP : DOWN), drawn: NaN, el: null });
  }
  // back to front: ascending i + j
  pucks.sort((p, q) => p.i + p.j - (q.i + q.j));
  for (const p of pucks) p.el = solid(g);
  const you = pucks.find((p) => p.m === KMAX);
  you.el.sil.classList.add("hi");

  function drawPuck(p, now) {
    const h = tval(p.a, now);
    if (h === p.drawn) return;
    p.drawn = h;
    put(p.el, prism(P, front, p.ring, p.inner, 0, h));
  }
  function drawNotches() {
    notch.forEach((el, k) => {
      place(el, P((k + 0.5) * (EXT / KMAX), EXT + 3.4, 0));
      el.setAttribute("class", "dot " + (k < level ? "m" : "off"));
    });
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const p of pucks) { drawPuck(p, now); if (!tdone(p.a, now)) moving = true; }
    return moving;
  });
  bag.add(B.unregister);
  drawNotches();

  /** Asks `k` questions. The stagger counts questions away from the one just asked. */
  function ask(k) {
    if (k === level) return;
    const now = performance.now(), from = Math.max(k, level);
    level = k;
    for (const p of pucks) {
      const alive = p.m >= k;
      p.el.sil.classList.toggle("lo", !alive);
      tset(p.a, alive ? UP : DOWN, now, Math.abs(p.m - from) * step);
    }
    drawNotches();
    read.textContent = over ? `${k} bit · ${N * N >> k}` : "rest";
    B.wake();
  }
  // the resting composition
  for (const p of pucks) p.el.sil.classList.toggle("lo", p.m < level);
  you.el.sil.classList.remove("lo");

  bag.add(pointer(stage, {
    move: (p) => {
      over = true;
      const [x] = unproj(C, p[0], p[1], 0);
      ask(clamp(Math.floor((x / EXT) * (KMAX + 1)), 0, KMAX));
      read.textContent = `${level} bit · ${N * N >> level}`;
    },
    leave: () => { over = false; ask(REST); read.textContent = "rest"; },
  }));
  bag.add(() => svg.replaceChildren());

  return { set: (v) => { step = v; }, destroy: bag.dispose };
}

hairline({
  name: "halving",
  means: "Sixty-four pucks, one of them you: each question lowers half of those still standing.",
  rules: [1, 2, 5, 8],
  range: [0, 60, 130],
  tour: [[124, 147], [194, 182], [265, 217], null],
  mount,
});
