/**
 * Tank: three glass tubes on a plinth, each a rubber at one sulfur level, each draining through its own spout as the
 * stress in a relaxation test falls: fast at first, then slowly, as t to the minus n. The clock loops ten minutes
 * in a few seconds, and the level springs back to the top at the start of each lap. Hovering a tube slows time so the
 * curve can be read, and picks it. At rest the 0.5 pph tube, the one that drains most, is bright. The slider is the
 * clock's rate.
 *
 * The pattern: dilate time. The world keeps moving; the pointer slows it. A spring on the rate, a hit test on the
 * tubes' rest centres.
 */
const {
  Cam, circ, clamp, facing, fit, prism, proj, rings, spring, stepS, mk, pointer, put, register, disposer, solid,
} = HL;

const NS = [0.0294, 0.0126, 0.011], XS = [0, 38, 76], R = 10.5, HT = 64, LAP = 9, S = 1.9, TMAX = 600;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let rate = value, act = -1, clock = 40;
  const slow = spring(1, { eps: 0.002 });

  const C = Cam(45, 0.5, S);
  fit(C, [[-18, -14, -5], [106, 24, -5], [106, -14, -5], [-18, 24, -5], [0, 0, HT + 4]], 200, 168);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const [pr, pi] = rings(-18, -14, 106, 24, 9, 2.2);
  put(solid(g), prism(P, front, pr, pi, -5, 0));
  const tubes = XS.map((x, i) => {
    const Pc = (px, py, pz) => P(px + x, py, pz);
    const glass = solid(g), liquid = solid(g), spout = solid(g);
    const [sr, si] = rings(R - 1, -2.4, R + 8, 2.4, 1.6, 0.6);
    put(spout, prism(Pc, front, sr, si, 4, 9));
    put(glass, prism(Pc, front, circ(R, 40), circ(R - 1.8, 40), 0, HT));
    return { i, x, Pc, glass, liquid, sp: spring(1, { eps: 0.002 }), drawn: NaN };
  });
  const level = (i, t) => clamp((Math.pow(Math.max(t, 1), -NS[i]) - 0.8) / 0.2, 0, 1);

  function drawTube(tb) {
    const h = 3 + (HT - 10) * tb.sp.x;
    if (h === tb.drawn) return;
    tb.drawn = h;
    put(tb.liquid, prism(tb.Pc, front, circ(R - 3.2, 36), circ(R - 4.6, 36), 1.4, h));
  }
  const B = register(stage, (dt) => {
    // ambient: the clock always runs, and the pointer eases it down
    slow.t = act < 0 ? 1 : 0.14;
    stepS(slow, dt);
    clock += dt * rate * slow.x * (TMAX / LAP);
    if (clock > TMAX + 40) clock = 1;
    tubes.forEach((tb) => { tb.sp.t = level(tb.i, Math.min(clock, TMAX)); stepS(tb.sp, dt); drawTube(tb); });
    return true;
  });
  bag.add(B.unregister);

  const cxs = XS.map((x) => P(x, 0, 0)[0]);
  const hit = ([px, py]) => {
    if (py < 30 || py > 290) return -1;
    let best = 0;
    cxs.forEach((c, i) => { if (Math.abs(px - c) < Math.abs(px - cxs[best])) best = i; });
    return Math.abs(px - cxs[best]) < R * S * 1.5 ? best : -1;
  };
  const NAME = ["0.5 pph", "1.5 pph", "2.5 pph"];
  function light(a) {
    const bright = a < 0 ? 0 : a;
    tubes.forEach((tb) => tb.glass.sil.classList.toggle("hi", tb.i === bright));
  }
  light(-1);
  function setActive(a) {
    if (a === act) return;
    act = a; light(a);
    read.textContent = a < 0 ? "rest" : NAME[a];
  }
  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { rate = v; }, destroy: bag.dispose };
}

hairline({
  name: "tank",
  means: "Three tubes drain as stress relaxes, fast then slow; the one you hover slows time so the curve can be read.",
  rules: [1, 7, 8],
  range: [0.5, 1, 2],
  tour: [[110, 190], [200, 170], [290, 190], null],
  mount,
});
