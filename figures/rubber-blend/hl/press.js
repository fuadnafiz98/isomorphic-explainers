/**
 * Press: a foam block of five cell walls between a base and a platen. The pointer's height is the strain. In the
 * first stretch the air gaps close evenly; in the second the walls buckle sideways, alternately, while the rod at the
 * side barely rises; once the gaps are shut the walls themselves squash and the rod shoots up. At rest the block is
 * mid-buckle. The slider is where the plateau ends, in percent strain.
 *
 * The pattern: a continuous field. A spring on the strain, and a hit test that maps the pointer's height onto the
 * strain range directly, so the platen moving cannot move the choice.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, spring, stepS, mk, pointer, put, register, disposer, solid,
} = HL;

const H0 = 60, M = 5, X0 = 0, X1 = 70, Y0 = 0, Y1 = 46, PL = 5, SMAX = 0.75, S0 = 0.3, ZI = 0.2, S = 1.95, RH = 58;

/** Stress in kPa on the rod, from the strain and where the plateau ends: Fig. 1's three stretches. */
const stress = (s, pe) =>
  s <= ZI ? 3 * (s / ZI) : s <= pe ? 3 + 3.6 * ((s - ZI) / (pe - ZI)) : 6.6 + 23.4 * Math.pow((s - pe) / (SMAX - pe), 2.2);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let pe = value / 100;
  const sp = spring(S0, { eps: 0.0005 });

  const C = Cam(45, 0.5, S);
  fit(C, [[-8, -8, -5], [102, 54, -5], [102, -8, -5], [-8, 54, -5], [0, 0, H0 + PL + 4], [90, 6, RH]], 200, 168);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const [br, bi] = rings(-8, -8, 102, 54, 8, 2);
  put(solid(g), prism(P, front, br, bi, -5, 0));
  const rod = solid(g), rodR = rings(84, 0, 96, 12, 4, 1.3);
  rod.sil.classList.add("hi");
  const walls = Array.from({ length: M }, () => ({ el: solid(g), drawn: NaN }));
  const plat = solid(g), pr = rings(X0 - 4, Y0 - 4, X1 + 4, Y1 + 4, 6, 1.6);
  let last = NaN, lastPe = NaN;

  function draw() {
    const s = sp.x;
    if (s === last && pe === lastPe) return;
    last = s; lastPe = pe;
    const h = H0 * (1 - s), w0 = (H0 * (1 - pe)) / M;
    const w = h >= M * w0 ? w0 : h / M, gap = h >= M * w0 ? (h - M * w0) / (M - 1) : 0;
    const buck = 7 * Math.sin(Math.PI * clamp((s - ZI) / (pe - ZI), 0, 1));
    walls.forEach((wl, i) => {
      const dx = (i % 2 ? 1 : -1) * buck, z0 = i * (w + gap);
      const [r, inn] = rings(X0 + dx, Y0, X1 + dx, Y1, 5.5, 1.5);
      put(wl.el, prism(P, front, r, inn, z0, z0 + w));
    });
    put(plat, prism(P, front, pr[0], pr[1], h, h + PL));
    const rh = Math.max(1.2, (stress(s, pe) / 30) * RH);
    put(rod, prism(P, front, rodR[0], rodR[1], 0, rh));
  }
  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(); return m; });
  bag.add(B.unregister);

  // the pointer's height maps straight onto the strain, between where the platen top is at 0 and at the maximum
  const yTop = P(35, 23, H0 + PL)[1], yBot = P(35, 23, H0 * (1 - SMAX) + PL)[1];
  const zone = () => (sp.t <= ZI ? 1 : sp.t <= pe ? 2 : 3);
  let over = false;
  function setAt(y) { over = true; sp.t = clamp(((y - yTop) / (yBot - yTop)) * SMAX, 0, SMAX); read.textContent = `zone ${zone()}`; B.wake(); }
  bag.add(pointer(stage, {
    move: ([x, y]) => (x > 60 && x < 340 ? setAt(y) : leave()),
    leave,
  }));
  function leave() { if (!over) return; over = false; sp.t = S0; read.textContent = "rest"; B.wake(); }
  bag.add(() => svg.replaceChildren());
  draw();
  return { set: (v) => { pe = v / 100; B.wake(); draw(); }, destroy: bag.dispose };
}

hairline({
  name: "press",
  means: "A foam block under a platen: gaps close, the walls buckle, then they pack and the rod shoots up.",
  rules: [1, 3, 5, 8],
  range: [35, 45, 55],
  tour: [[200, 120], [200, 170], [200, 215], null],
  mount,
});
