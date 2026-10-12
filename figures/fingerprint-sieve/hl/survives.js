/**
 * Survives: six actions as six rows of three pegs: cookie, address and
 * fingerprint, in rising height. The pointer picks a row; the pegs that action
 * changes drop into the board, staggered from the cookie, and the ones that
 * stay stand. The fingerprint is the bright column. Two actions do not change
 * it for sure: the update only half drops it, and a new font drops it.
 *
 * The pattern: one of many. A tween per peg, a stagger by distance, a hit
 * test on static bands along the rows.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, unproj, tdone, tset, tval, tween,
  mk, pointer, put, register, disposer, solid,
} = HL;

const ROWS = 6, GX = 30, GY = 17, FX = 21, FY = 12, EXT_X = 3 * GX, EXT_Y = ROWS * GY, PB = 5, STEP = 55;
const HEIGHT = [10, 15, 21], SUNK = 1.6, HALF = 0.55;
// per action: how much each of cookie, address, fingerprint drops (1 = all the way)
const DROP = [[1, 0, 0], [1, 0, 0], [0, 1, 0], [0, 1, 0], [0, 0, HALF], [0, 0, 1]];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value, act = -1;
  const C = Cam(45, 0.5, 2.5);
  fit(C, [[-6, -6, -PB], [EXT_X + 6, EXT_Y + 6, -PB], [EXT_X + 6, -6, -PB], [-6, EXT_Y + 6, -PB], [0, 0, 26]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-6, -6, EXT_X + 6, EXT_Y + 6, 8, 2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  const pegs = [];
  // back to front: rows ascending, and within a row columns ascending (x runs towards the viewer)
  for (let s = 0; s <= ROWS + 1; s++) for (let r = 0; r < ROWS; r++) {
    const c = s - r;
    if (c < 0 || c > 2) continue;
    const x0 = c * GX + (GX - FX) / 2, y0 = r * GY + (GY - FY) / 2;
    const [ring, inner] = rings(x0, y0, x0 + FX, y0 + FY, c === 0 ? 5 : 2.4, 0.9);
    pegs.push({ r, c, ring, inner, a: tween(HEIGHT[c]), drawn: NaN, el: solid(g) });
  }
  for (const p of pegs) p.el.sil.classList.toggle("hi", p.c === 2);

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const p of pegs) {
      const h = tval(p.a, now);
      if (h !== p.drawn) { p.drawn = h; put(p.el, prism(P, front, p.ring, p.inner, 0, h)); }
      if (!tdone(p.a, now)) moving = true;
    }
    return moving;
  });
  bag.add(B.unregister);

  /** Picks row a (-1 lets go). The drop spreads out along the row from the cookie, and from the row picked. */
  function pick(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    for (const p of pegs) {
      const d = a >= 0 ? DROP[a][p.c] : 0;
      tset(p.a, HEIGHT[p.c] + (SUNK - HEIGHT[p.c]) * d, now, (Math.abs(p.r - from) * 0.5 + p.c * 0.5) * stag);
      // the bright goes to the fingerprint of the row picked; at rest it is the whole column
      p.el.sil.classList.toggle("hi", p.c === 2 && (a < 0 || p.r === a));
    }
    read.textContent = a < 0 ? "rest" : `row ${a + 1} · ${DROP[a].filter((d) => d > 0).length} drop`;
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => {
      const [, y] = unproj(C, p[0], p[1], 0);
      pick(y < -4 || y > EXT_Y + 4 ? -1 : clamp(Math.floor(y / GY), 0, ROWS - 1));
    },
    leave: () => pick(-1),
  }));
  bag.add(() => svg.replaceChildren());
  read.textContent = "rest";

  return { set: (v) => { stag = v; }, destroy: bag.dispose };
}

hairline({
  name: "survives",
  means: "Six things you might do: the pegs they change drop, and the tall bright one almost never does.",
  rules: [1, 2, 4, 5],
  range: [0, 60, 130],
  tour: [[276, 145], [216, 175], [156, 206], [126, 221], null],
  mount,
});
