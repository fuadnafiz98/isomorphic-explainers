// Live behaviour for the fingerprint sieve. The build injects the data object and inlines the kit, the lathe
// module and model.mjs as MODEL, so the ball, dial, scale and lamps all run on the numbers the drawing was made from.
const D = __DATA__;
const { P, N } = D;
const root = document.querySelector(".fp");
const stage = root.querySelector(".fp-stage");
const svg = stage.querySelector("svg");
const readout = root.querySelector("[data-readout]");
const announce = root.querySelector("[data-announce]");
const stepTitle = root.querySelector("[data-step-title]");
const stepText = root.querySelector("[data-step-text]");
const stepStats = root.querySelector("[data-step-stats]");
const modeNote = root.querySelector("[data-mode-note]");
const modeButtons = [...root.querySelectorAll("[data-mode-btn]")];
const stationButtons = [...root.querySelectorAll("[data-st-btn]")];
const ballEl = svg.querySelector('[data-part="ball"]');
const sliderEl = svg.querySelector('[data-part="slider"]');
const needleEl = svg.querySelector('[data-part="needle"]');
const pointerEl = svg.querySelector('[data-part="pointer"]');
const lampEls = [...svg.querySelectorAll("[data-lamps]")];
const items = [...svg.querySelectorAll(".it[data-st]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const DWELL = 1.7; // seconds the ball rests on a sieve in the tour
const TRAVEL = 1.15; // seconds between sieves
const HOLD = 3.4; // rest on the last sieve before the loop restarts
const CYCLE = N * (DWELL + TRAVEL) + HOLD;
const SPEED = 1 / TRAVEL;

const state = {
  mode: "open",
  f: 0, // where the ball is: 0 = on the tray, j = on sieve j, fractions in between
  target: 0,
  bits: 0, // bits shown on the dial, eased toward the model
  theta: D.knob.detent[0],
  touring: !still.matches,
  clock: 0,
  shownKey: "",
};
let frame = 0;
let last = 0;
let visible = false;
let idleTimer = 0;
let lastReached = -1;

// ── the ball ──────────────────────────────────────────────────────────
function ballAt(f) {
  const j = Math.min(N, Math.floor(f + 1e-9));
  const u = j >= N ? 0 : f - j;
  const x0 = D.xs[j];
  const z0 = D.zs[j] + D.ball;
  if (u <= 1e-6) return { x: x0, z: z0, a: 1 };
  const ramp = D.ramps[j];
  if (u < 0.2) {
    const s = u / 0.2;
    return { x: x0, z: z0 - 4.5 * smooth(0, 1, s), a: 1 - smooth(0.1, 1, s) };
  }
  if (u < 0.34) return { x: ramp.xs, z: ramp.zs + D.ball, a: 0 };
  const v = (u - 0.34) / 0.66;
  const t = v * v * (3 - 2 * v);
  const x = ramp.xs + (D.xs[j + 1] - ramp.xs) * t;
  const top = x <= ramp.xe ? ramp.zs + ((ramp.ze - ramp.zs) * (x - ramp.xs)) / (ramp.xe - ramp.xs) : ramp.ze;
  return { x, z: top + D.ball, a: smooth(ramp.xs + 1, ramp.xs + 6, x) };
}

// ── the tour ──────────────────────────────────────────────────────────
function tourF(clock) {
  const c = clock % CYCLE;
  const per = DWELL + TRAVEL;
  const s = Math.floor(c / per);
  if (s >= N) return N;
  const tau = c - s * per;
  return tau < DWELL ? s : s + (tau - DWELL) / TRAVEL;
}
const tourClockOf = (f) => Math.round(f) * (DWELL + TRAVEL);

// ── drawing ───────────────────────────────────────────────────────────
const needleD = (frac) => {
  const angle = D.dial.from + D.dial.span * frac;
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return lineOnTop([D.dial.x - sx * 3.2, D.dial.y - sy * 3.2], [D.dial.x + sx * (D.dial.r - 4), D.dial.y + sy * (D.dial.r - 4)], D.dial.top + 0.2, P);
};
const pointerD = (theta) => {
  const sx = Math.sin(theta);
  const sy = -Math.cos(theta);
  return lineOnTop([D.knob.x + sx * 1.6, D.knob.y + sy * 1.6], [D.knob.x + sx * 6, D.knob.y + sy * 6], 7.2, P);
};

function drawLamps(reached) {
  lampEls.forEach((el, i) => {
    const trait = D.traits[i];
    const counted = MODEL.bitsOf(trait, state.mode);
    const carries = MODEL.carriesOver(trait, state.mode);
    const done = i < reached;
    const filled = [];
    const waiting = [];
    const rings = [];
    D.lamps[i].forEach(([x, y], s) => {
      const point = iso([x, y, D.lampZ], P);
      if (s >= counted) rings.push(ring(x, y, 1.45, D.lampZ, P, 12));
      else if (!done) waiting.push(point);
      else if (carries) filled.push(point);
      else rings.push(ring(x, y, 1.45, D.lampZ, P, 12));
    });
    el.innerHTML = dotsSvg(waiting, { size: 0.5, tone: "mid" }) + dotsSvg(filled, { size: 1.0, tone: "hi" }) + (rings.length ? lineSvg(rings.join(""), { tone: "mid" }) : "");
  });
}

function describe(reached) {
  const r = MODEL.reading(state.mode, reached);
  const trait = reached > 0 ? D.traits[reached - 1] : null;
  const line = `${reached}/${N} · ${r.bits} bits · ${MODEL.fmtCount(r.pool)}${r.pool > 1.5 ? " like you" : ""}`;
  const carry = state.mode === "farbled" && r.stable < r.bits ? ` · ${r.stable} carry over` : "";
  const readoutText = line + carry;
  if (readout.textContent !== readoutText) readout.textContent = readoutText;
  if (trait) {
    stepTitle.textContent = `${reached}. ${trait.name}`;
    stepText.textContent = trait.how;
    const got = MODEL.bitsOf(trait, state.mode);
    stepStats.textContent = `reads ${trait.reads} · this sieve: ${got ? "+" + got : "0"} bit${got === 1 ? "" : "s"} · the crowd is now ${MODEL.fmtCount(r.pool)}`;
  } else {
    stepTitle.textContent = "The crowd";
    stepText.textContent = "About eight billion browsers, all candidates for being the one on the tray. Nothing has been measured yet.";
    stepStats.textContent = "33 bits is enough to single out one of 8.6 billion";
  }
  return { r, trait };
}

function draw() {
  const near = Math.round(state.f);
  const reached = Math.min(N, Math.floor(state.f + 1e-6));
  const b = ballAt(state.f);
  ballEl.setAttribute("transform", translateAlong(P, [b.x, 0, b.z]));
  ballEl.setAttribute("opacity", b.a.toFixed(2));
  const key = `${state.mode}|${reached}`;
  if (key !== state.shownKey) {
    state.shownKey = key;
    drawLamps(reached);
    const { trait } = describe(reached);
    if (reached !== lastReached) {
      lastReached = reached;
      announce.textContent = trait ? `${reached} of ${N}: ${trait.name}` : "The crowd";
    }
    stationButtons.forEach((button, i) => (i + 1 === reached ? button.setAttribute("data-on", "") : button.removeAttribute("data-on")));
  }
  const goal = MODEL.reading(state.mode, reached).bits;
  state.bits = state.bits + (goal - state.bits) * (still.matches ? 1 : 0.14);
  if (Math.abs(goal - state.bits) < 0.01) state.bits = goal;
  needleEl.setAttribute("d", needleD(state.bits / MODEL.WORLD_BITS));
  const shown = MODEL.scaleOf(state.bits);
  sliderEl.setAttribute("transform", translateAlong(P, [0, 0, (D.slider.z1 - D.slider.z0) * shown]));
  const want = D.knob.detent[D.modes.list.indexOf(state.mode)];
  state.theta = still.matches ? want : state.theta + (want - state.theta) * 0.22;
  if (Math.abs(want - state.theta) < 0.002) state.theta = want;
  pointerEl.setAttribute("d", pointerD(state.theta));
  items.forEach((el) => (Number(el.dataset.st) === near ? el.setAttribute("data-on", "") : el.removeAttribute("data-on")));
}

// ── loop ──────────────────────────────────────────────────────────────
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (state.touring) {
    state.clock += dt;
    const f = tourF(state.clock);
    state.f = f;
    state.target = Math.round(f);
  } else {
    const gap = state.target - state.f;
    if (calm) state.f = state.target;
    else state.f += Math.sign(gap) * Math.min(Math.abs(gap), SPEED * dt * (Math.abs(gap) > 1 ? 2.2 : 1));
  }
  draw();
  const settled = !state.touring && state.f === state.target && Math.abs(MODEL.reading(state.mode, Math.floor(state.f + 1e-6)).bits - state.bits) < 0.01 && Math.abs(D.knob.detent[D.modes.list.indexOf(state.mode)] - state.theta) < 0.002;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
function steer(j, { hold = true } = {}) {
  state.touring = false;
  state.target = clamp(Math.round(j), 0, N);
  clearTimeout(idleTimer);
  if (hold && !still.matches) {
    idleTimer = setTimeout(() => {
      state.touring = true;
      state.clock = tourClockOf(state.f);
      run();
    }, 5200);
  }
  if (still.matches) state.f = state.target;
  draw();
  run();
}
function setMode(mode) {
  if (!D.modes.list.includes(mode)) return;
  state.mode = mode;
  state.shownKey = "";
  modeButtons.forEach((button) => (button.dataset.modeBtn === mode ? button.setAttribute("data-on", "") : button.removeAttribute("data-on")));
  modeNote.textContent = D.modes.note[mode];
  announce.textContent = `${D.modes.label[mode]} protection`;
  draw();
  run();
}

// ── input ─────────────────────────────────────────────────────────────
const stationX = D.xs.map((x, j) => iso([x, 0, D.zs[j]], P)[0] / D.width);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = (event.clientX - box.left) / box.width;
  let best = 0;
  stationX.forEach((x, j) => {
    if (Math.abs(x - share) < Math.abs(stationX[best] - share)) best = j;
  });
  steer(best);
});
stage.addEventListener("pointerleave", () => steer(state.target));
stage.addEventListener("keydown", (event) => {
  const key = event.key;
  if (key === "m" || key === "M") {
    setMode(D.modes.list[(D.modes.list.indexOf(state.mode) + 1) % D.modes.list.length]);
    return event.preventDefault();
  }
  if (key === " ") {
    event.preventDefault();
    if (state.touring) steer(state.target, { hold: false });
    else {
      state.touring = !still.matches;
      state.clock = tourClockOf(state.f);
      run();
    }
    return;
  }
  let to = null;
  const here = Math.round(state.target);
  if (key === "ArrowRight" || key === "ArrowDown") to = here + 1;
  if (key === "ArrowLeft" || key === "ArrowUp") to = here - 1;
  if (key === "Home") to = 0;
  if (key === "End") to = N;
  if (/^[1-7]$/.test(key)) to = Number(key);
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.modeBtn)));
stationButtons.forEach((button) => button.addEventListener("click", () => steer(Number(button.dataset.stBtn))));
svg.querySelector("[data-selector]")?.addEventListener("click", (event) => {
  event.stopPropagation();
  setMode(D.modes.list[(D.modes.list.indexOf(state.mode) + 1) % D.modes.list.length]);
});
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);

setMode("open");
if (still.matches) {
  state.f = 0;
  state.target = 0;
}
draw();
visible = true;
run();
