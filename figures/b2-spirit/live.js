// Live behaviour for the B-2 figure. The build injects the data object and inlines the kit, the lathe module,
// model.mjs as MODEL and shared.mjs as SHARED, so everything below runs on the same numbers as the drawing.
const D = __DATA__;
const { P } = D;
const lib = { prismOf: G.prismOf, solidSvg, segment, lineSvg, frameAlong: G.frameAlong, solidOf: G.solidOf, lineOnTop };
const root = document.querySelector(".b2");
const stage = root.querySelector(".b2-stage");
const svg = stage.querySelector("svg");
const readout = root.querySelector("[data-readout]");
const about = root.querySelector("[data-about]");
const announce = root.querySelector("[data-announce]");
const buttons = [...root.querySelectorAll("[data-sys-btn]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const TOOTH = Object.fromEntries([...MODEL.TEETH, MODEL.BEAVER].map((tooth) => [tooth.id, tooth]));
const nodes = D.panels.map(({ id, tooth, side, half }) => ({ id, tooth: TOOTH[tooth], kind: tooth, side, half, el: svg.querySelector(`[data-panel="${id}"]`), deg: 0, shown: 0 }));
const stickEl = svg.querySelector("[data-stick]");
const needleEl = svg.querySelector("[data-needle]");
const items = [...svg.querySelectorAll(".it")];

// ── state ─────────────────────────────────────────────────────────────
const state = { roll: 0, pitch: 0, sRoll: 0, sPitch: 0, airbrake: false, touring: !still.matches, clock: 0, sys: "control", shownStick: [9, 9], shownBank: 99 };
let frame = 0;
let last = 0;
let visible = false;
let idleTimer = 0;
let clockTotal = 0;

// The idle tour: pitch up, pitch down, bank right, bank left, then a bit of both.
const KEYS = [
  [0, 0, 0],
  [1.6, 0, 0],
  [3.2, 0, 0.8],
  [5.6, 0, 0.8],
  [7.4, 0, -0.8],
  [9.4, 0, -0.8],
  [11.2, 0.85, 0],
  [13.4, 0.85, 0],
  [15.2, -0.85, 0],
  [17.2, -0.85, 0],
  [19.0, 0.5, 0.45],
  [21.4, 0.5, 0.45],
  [23.2, 0, 0],
  [24.4, 0, 0],
];
function tourAt(t) {
  const loop = KEYS[KEYS.length - 1][0];
  const time = t % loop;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= time) i++;
  const [t0, r0, p0] = KEYS[i];
  const [t1, r1, p1] = KEYS[i + 1];
  const s = smooth(t0, t1, time);
  return [r0 + (r1 - r0) * s, p0 + (p1 - p0) * s];
}

// ── the figure ────────────────────────────────────────────────────────
function targets(gust) {
  const yaw = clamp(state.sRoll * 0.85, -1, 1);
  const out = MODEL.surfaces({ roll: state.sRoll, pitch: state.sPitch, yaw, gust });
  const brake = state.airbrake ? MODEL.GAIN.rudderMax * 0.8 : 0;
  for (const node of nodes) {
    const side = node.side > 0 ? out.right : out.left;
    let want;
    if (node.kind === "glas") want = out.glas;
    else if (node.kind === "rudder") {
      const open = Math.max(side.rudder, brake);
      want = node.half === "up" ? -open : open;
    } else want = side[node.kind];
    node.want = want;
  }
}
const degOf = (id) => nodes.find((node) => node.id === id).deg;

function draw() {
  for (const node of nodes) {
    if (Math.abs(node.deg - node.shown) < 0.03) continue;
    node.shown = node.deg;
    node.el.innerHTML = SHARED.panelMarkup(lib, P, node.tooth, node.side, node.deg, node.half);
  }
  if (Math.abs(state.sRoll - state.shownStick[0]) > 0.002 || Math.abs(state.sPitch - state.shownStick[1]) > 0.002) {
    state.shownStick = [state.sRoll, state.sPitch];
    stickEl.innerHTML = SHARED.stickMarkup(lib, P, state.sRoll, state.sPitch);
  }
  const bank = state.sRoll * MODEL.BANK_MAX;
  if (Math.abs(bank - state.shownBank) > 0.05) {
    state.shownBank = bank;
    needleEl.setAttribute("d", SHARED.needlePath(lib, P, bank));
  }
  say();
}

function flightText() {
  const bank = state.sRoll * MODEL.BANK_MAX;
  const lift = -(degOf("L-e1") + degOf("R-e1")) / 2;
  const open = Math.max(degOf("L-rudder-down"), degOf("R-rudder-down"));
  const side = degOf("R-rudder-down") >= degOf("L-rudder-down") ? "R" : "L";
  const parts = [
    Math.abs(bank) < 0.5 ? "level" : `bank ${bank > 0 ? "R" : "L"}${Math.abs(bank).toFixed(0)}°`,
    Math.abs(lift) < 0.5 ? "elevons flat" : `elevons ${lift > 0 ? "up" : "down"} ${Math.abs(lift).toFixed(0)}°`,
    open < 0.5 ? "rudders shut" : state.airbrake && Math.abs(degOf("L-rudder-down") - degOf("R-rudder-down")) < 1 ? `airbrake ${open.toFixed(0)}°` : `split ${side}${open.toFixed(0)}°`,
  ];
  const rate = MODEL.turnRate(Math.abs(bank));
  if (Math.abs(bank) >= 0.5) parts.push(`turn ${rate.toFixed(1)}°/s`);
  return parts.join(" · ");
}
let said = "";
function say() {
  const text = state.sys === "engines" ? D.facts.engines : state.sys === "payload" ? D.facts.payload : state.sys === "frame" ? D.facts.frame : flightText();
  if (text !== said) {
    said = text;
    readout.textContent = text;
  }
}

// ── loop ──────────────────────────────────────────────────────────────
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  clockTotal += dt;
  if (state.touring) {
    state.clock += dt;
    [state.roll, state.pitch] = tourAt(state.clock);
  }
  const k = calm ? 1 : 1 - Math.exp(-dt / 0.16);
  state.sRoll += (state.roll - state.sRoll) * k;
  state.sPitch += (state.pitch - state.sPitch) * k;
  if (Math.abs(state.roll - state.sRoll) < 5e-4) state.sRoll = state.roll;
  if (Math.abs(state.pitch - state.sPitch) < 5e-4) state.sPitch = state.pitch;
  const gust = calm ? 0 : Math.sin(clockTotal * 2.3) * 0.6 + Math.sin(clockTotal * 5.1 + 1.3) * 0.4;
  targets(gust);
  let moving = false;
  for (const node of nodes) {
    const err = node.want - node.deg;
    if (calm) node.deg = node.want;
    else {
      // an actuator has a slew limit: the surface chases the command at no more than 70 degrees a second
      node.deg += clamp(err * (1 - Math.exp(-dt / 0.08)), -70 * dt, 70 * dt);
      if (Math.abs(node.want - node.deg) < 0.01) node.deg = node.want;
    }
    if (node.deg !== node.want) moving = true;
  }
  draw();
  const settled = !state.touring && !moving && state.sRoll === state.roll && state.sPitch === state.pitch && (calm || false);
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);

// ── hands ─────────────────────────────────────────────────────────────
function steer(roll, pitch) {
  state.touring = false;
  state.roll = clamp(roll, -1, 1);
  state.pitch = clamp(pitch, -1, 1);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    state.roll = 0;
    state.pitch = 0;
    state.airbrake = false;
    idleTimer = setTimeout(() => {
      state.touring = !still.matches;
      state.clock = 0;
      run();
    }, 1800);
    run();
  }, 3600);
  run();
}
const fromPointer = (event) => {
  const box = svg.getBoundingClientRect();
  const fx = (event.clientX - box.left) / box.width;
  const fy = (event.clientY - box.top) / box.height;
  steer((fx - 0.5) * 2.5, -(fy - 0.5) * 3.2);
};
stage.addEventListener("pointermove", fromPointer);
stage.addEventListener("pointerdown", fromPointer);
stage.addEventListener("pointerleave", () => state.touring || steer(state.roll, state.pitch));
stage.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 0.5 : 0.25;
  const base = state.touring ? [state.sRoll, state.sPitch] : [state.roll, state.pitch];
  let next = null;
  if (event.key === "ArrowRight") next = [base[0] + step, base[1]];
  else if (event.key === "ArrowLeft") next = [base[0] - step, base[1]];
  else if (event.key === "ArrowUp") next = [base[0], base[1] + step];
  else if (event.key === "ArrowDown") next = [base[0], base[1] - step];
  else if (event.key === "Home" || event.key === "Escape") next = [0, 0];
  else if (event.key.toLowerCase() === "b") {
    state.airbrake = !state.airbrake;
    next = base;
  } else if (/^[1-4]$/.test(event.key)) {
    select(D.systems[Number(event.key) - 1]);
    return;
  }
  if (!next) return;
  event.preventDefault();
  steer(next[0], next[1]);
});

function select(id) {
  state.sys = id;
  items.forEach((el) => (el.dataset.sys === id ? el.setAttribute("data-on", "") : el.removeAttribute("data-on")));
  stage.setAttribute("data-focus", "");
  buttons.forEach((button) => (button.dataset.sysBtn === id ? button.setAttribute("data-on", "") : button.removeAttribute("data-on")));
  about.textContent = D.about[id];
  announce.textContent = D.names[id];
  said = "";
  say();
}
buttons.forEach((button) => button.addEventListener("click", () => select(button.dataset.sysBtn)));

// the panels are rebuilt as innerHTML, so keep each one's highlight on its group, not on its paths
select("control");
announce.textContent = "";
if (still.matches) state.touring = false;
targets(0);
nodes.forEach((node) => (node.deg = node.want));
draw();
