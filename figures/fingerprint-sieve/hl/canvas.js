/**
 * Canvas: one ring drawn twice, as a board of 96 pillars whose height is how
 * much of each pixel the drawing covers. Pointer left is the first machine,
 * right is the second. The middle of the stroke is the same on both; the
 * pillars on its edge change height, and those are the bright ones: they are
 * the whole difference between two machines. At rest it is machine A.
 *
 * The pattern: a continuous field. One spring per pillar, a blend set by where
 * the pointer is, a hit test on the ground plane.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, unproj, spring, stepS,
  mk, pointer, put, register, disposer, solid,
} = HL;

const NX = 12, NY = 8, CELL = 12, FOOT = 8.6, EX = NX * CELL, EY = NY * CELL, PB = 5, HMAX = 13, MIN = 1;

/** Coverage 0..1 of a ring through cell (i, j): the second machine rounds it a little larger and thicker. */
function cover(i, j, m) {
  const d = Math.hypot(i + 0.5 - NX / 2, (j + 0.5 - NY / 2) * 1.12) - (m ? 3.25 : 2.9);
  return clamp(1.2 - Math.abs(d) / (m ? 1.05 : 0.9), 0, 1);
}

function mount({ stage, svg, read }) {
  const bag = disposer();
  const C = Cam(45, 0.5, 2.06);
  fit(C, [[-6, -6, -PB], [EX + 6, EY + 6, -PB], [EX + 6, -6, -PB], [-6, EY + 6, -PB], [0, 0, HMAX + 4]], 200, 170);
  const P = proj(C), front = facing(C);
  let t = 0;

  const g = mk("g", {}, svg), cols = [];
  const [pr, pi] = rings(-6, -6, EX + 6, EY + 6, 9, 2.2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));
  // back to front: ascending i + j
  for (let s = 0; s <= NX + NY - 2; s++) for (let j = 0; j < NY; j++) {
    const i = s - j;
    if (i < 0 || i >= NX) continue;
    const a = cover(i, j, 0), b = cover(i, j, 1);
    const x0 = i * CELL + (CELL - FOOT) / 2, y0 = j * CELL + (CELL - FOOT) / 2;
    const [ring, inner] = rings(x0, y0, x0 + FOOT, y0 + FOOT, 2.4, 0.9);
    const edge = Math.abs(a - b) > 0.2;
    const sp = spring(MIN + a * HMAX, { eps: 0.04 });
    const el = solid(g);
    el.sil.classList.toggle("hi", edge);
    cols.push({ i, j, a, b, ring, inner, sp, el, drawn: NaN });
  }

  function retarget() {
    for (const c of cols) c.sp.t = MIN + (c.a + (c.b - c.a) * t) * HMAX;
  }
  const B = register(stage, (dt) => {
    let moving = false;
    for (const c of cols) {
      if (stepS(c.sp, dt)) moving = true;
      if (c.sp.x === c.drawn) continue;
      c.drawn = c.sp.x;
      put(c.el, prism(P, front, c.ring, c.inner, 0, Math.max(0.6, c.sp.x)));
    }
    return moving;
  });
  bag.add(B.unregister);

  bag.add(pointer(stage, {
    move: (p) => {
      const [x] = unproj(C, p[0], p[1], 0);
      t = clamp(x / EX, 0, 1);
      retarget();
      read.textContent = t < 0.04 ? "A" : t > 0.96 ? "B" : `A→B ${Math.round(t * 100)}`;
      B.wake();
    },
    leave: () => { t = 0; retarget(); read.textContent = "rest"; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();
  read.textContent = "rest";

  return { set: () => {}, destroy: bag.dispose };
}

hairline({
  name: "canvas",
  means: "One ring drawn on two machines: the edge pillars disagree, and they are the whole difference.",
  rules: [1, 3, 5, 8],
  range: [0, 1, 2],
  tour: [[110, 131], [200, 176], [290, 221], null],
  mount,
});
