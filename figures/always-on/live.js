// Live behaviour for the always-on desk. The build injects the data object and inlines the kit, the
// lathe module, model.mjs as MODEL and shared.mjs as SHARED, so the page runs on the same numbers as
// the drawing. A day plays a queue of signals through the machine; the three switches take the day
// from the raw setting down the ladder the repo reports: $15.48, $2.50, $0.31, $0.22 a day.
const D = __DATA__;
const { P } = D;
const LIB = { G, iso, cylinder, dotsSvg, solidSvg, ringOf, extrude };
const root = document.querySelector(".ao-stage");
const svg = root.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const announceEl = document.querySelector("[data-announce]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (t) => t * t * (3 - 2 * t);
const follow = (a, b, dt, tau) => a + (b - a) * (1 - Math.exp(-dt / tau));

const tokenEl = svg.querySelector("[data-tokens]");
const dollyEl = svg.querySelector("[data-dolly]");
const gateEl = svg.querySelector("[data-gate]");
const strikerEl = svg.querySelector("[data-striker]");
const indexEl = svg.querySelector("[data-index]");
const needleEl = svg.querySelector("[data-needle]");
const pennantEl = svg.querySelector("[data-pennant]");
const headEls = [...svg.querySelectorAll("[data-head]")];
const switchEls = [...svg.querySelectorAll("[data-switch]")];
const fittingsEls = [...svg.querySelectorAll("[data-fittings]")];
const slotEls = [...svg.querySelectorAll("[data-slot]")];
const spareEls = [...svg.querySelectorAll("[data-spare]")];
const REST = [D.padX, D.dollyY, D.tokenRest];
const SPOT = iso(REST, P);
const delta = (p) => {
  const s = iso(p, P);
  return [s[0] - SPOT[0], s[1] - SPOT[1]];
};
const move = (el, p) => {
  const [dx, dy] = delta(p);
  el.setAttribute("transform", `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
};
const moveX = (el, dx) => {
  const d = delta([REST[0] + dx, REST[1], REST[2]]);
  const o = delta(REST);
  el.setAttribute("transform", `translate(${(d[0] - o[0]).toFixed(2)} ${(d[1] - o[1]).toFixed(2)})`);
};
const drop = (el, dz) => el.setAttribute("transform", SHARED.plungeTransform(LIB, P, dz));

// the four days of the tour: the raw setting, then one fix thrown per day
const SCENARIOS = MODEL.SCENARIOS;
const LADDER = D.ladder;
const EVENTS = MODEL.daySchedule();
const DAYS = [0, 1, 2, 3];

// one flying signal: a small pool of pucks, reused as the day flows
const POOL = 10;
const pucks = Array.from({ length: POOL }, () => {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "g");
  el.innerHTML = SHARED.tokenMarkup(LIB, P, "wake");
  el.style.opacity = "0";
  tokenEl.parentNode.insertBefore(el, tokenEl);
  return { el, busy: false, want: "wake", kind: "wake", path: "wake", at: 0, speed: 1, sink: 0, tier: 1, held: 0 };
});

function samplePath(points, t) {
  // piecewise position and placeholder depth along a polyline
  const lens = [0];
  for (let i = 1; i < points.length; i++) lens.push(lens[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1], points[i][2] - points[i - 1][2]));
  const total = lens[lens.length - 1];
  let x = clamp(t, 0, 1) * total;
  let i = 1;
  while (i < points.length - 1 && lens[i] < x) i++;
  const span = lens[i] - lens[i - 1] || 1;
  const f = clamp((x - lens[i - 1]) / span, 0, 1);
  const a = points[i - 1];
  const b = points[i];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// ── state ─────────────────────────────────────────────────────────────
const state = {
  sw: { gate: false, tier: false, slim: false },
  phase: 0,
  touring: !still.matches,
  day: 0,
  clock: 0,
  queue: 0,
  cost: 0,
  dayCost: 0,
  fired: 0,
  served: 0,
  shownNeedle: -1,
  shownIndex: -1,
  shownGate: -1,
  shownAngle: [0, 0, 0],
  shownDolly: null,
  shownDrop: [0, 0, 0],
  shownSlots: 0,
  shownSpares: [0, 0],
  shownPennant: false,
  shownStriker: 0,
  strike: 0,
  said: "",
};
const plan = () => MODEL.scenario(state.sw);
const perWake = () => {
  const rows = {};
  for (const r of MODEL.scenario(state.sw).rows) rows[r.kind] = r.wakes ? r.cost / r.wakes : 0;
  return rows;
};
state.rate = perWake();

// ── day clock ─────────────────────────────────────────────────────────
function dayDuration() {
  const wakes = LADDER[state.phase].wakes;
  return clamp(6 + wakes * 0.22, 9, 34);
}
function fire() {
  const ev = EVENTS[state.fired % EVENTS.length];
  const passing = state.sw.gate ? MODEL.gatePasses(ev.kind, ev.index) : true;
  const tier = state.sw.tier ? (ev.kind === "message" ? 1 : 0) : 2;
  const free = pucks.find((p) => !p.busy);
  state.fired += 1;
  if (!free) return;
  const seat = pucks.indexOf(free);
  free.busy = true;
  free.kind = passing ? "wake" : "quiet";
  free.tier = tier;
  free.at = 0;
  free.held = 0;
  free.sink = 0;
  free.path = passing ? "wake" : "quiet";
  free.printed = false;
  free.el.innerHTML = SHARED.tokenMarkup(LIB, P, passing ? "wake" : "quiet", SHARED.TOKEN_PATH.spawn);
  free.el.style.opacity = "1";
  free.seat = seat;
  return free;
}
function chargeFor(kind) {
  const row = MODEL.scenario(state.sw).rows.find((r) => r.kind === kind);
  return row && row.wakes ? row.cost / row.wakes : 0;
}

// ── hands ─────────────────────────────────────────────────────────────
function setSwitch(i, on, quiet) {
  const key = ["gate", "tier", "slim"][i];
  state.sw[key] = on;
  state.rate = perWake();
  state.touring = false;
  clearTimeout(state.idle);
  state.idle = setTimeout(() => start(), 9000);
  if (!quiet) {
    announceEl.textContent = `${["the wake gate", "tier routing", "the slimmed tool list"][i]} ${on ? "on" : "off"}. ${LADDER.find((l) => l.key === keyOf())?.label ?? ""}`.trim();
  }
  jumpCost();
}
function keyOf() {
  if (!state.sw.gate) return "raw";
  if (!state.sw.tier) return "gate";
  if (!state.sw.slim) return "tier";
  return "slim";
}
const labelOf = { raw: "raw day", gate: "wake gate", tier: "tier routing", slim: "slim tools" };
function jumpCost() {
  // a manual flip shows the day's bill at once: the needle and index sweep to the new total
  const row = LADDER.find((l) => l.key === keyOf());
  state.needle = clamp(row.day / D.cap, 0, 1);
  state.index = clamp(row.day / LADDER[0].day, 0, 1);
  run();
}
function start() {
  state.touring = true;
  state.phase = 0;
  state.day = 0;
  state.clock = 0;
  state.fired = 0;
  state.served = 0;
  state.cost = 0;
  state.sw = { gate: false, tier: false, slim: false };
  state.rate = perWake();
  state.needle = 0;
  state.index = 0;
  run();
}
document.addEventListener("keydown", (event) => {
  if (/^[1-3]$/.test(event.key)) setSwitch(Number(event.key) - 1, !state.sw[["gate", "tier", "slim"][Number(event.key) - 1]]);
  else if (event.key.toLowerCase() === "r") start();
});
root.addEventListener("click", (event) => {
  const sw = event.target.closest("[data-switch]");
  if (sw) setSwitch(Number(sw.dataset.switch), !state.sw[["gate", "tier", "slim"][Number(sw.dataset.switch)]]);
  else if (event.target.closest("[data-pennant]")) setSwitch(2, !state.sw.slim);
});

// ── frame ─────────────────────────────────────────────────────────────
let frame = 0;
let last = 0;
let visible = true;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 24) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (state.touring) {
    state.clock += dt;
    const dur = dayDuration();
    const want = (state.clock / dur) * EVENTS.length;
    while (state.fired < want && state.fired < EVENTS.length) {
      const p = fire();
      if (p) p.charge = chargeFor(EVENTS[state.fired - 1].kind);
      else state.fired -= 1;
      if (!p) break;
    }
    state.queue = pucks.filter((p) => p.busy).length;
    if (state.fired >= EVENTS.length && !state.queue) {
      state.day += 1;
      if (state.phase < DAYS.length - 1) {
        state.phase += 1;
        const sw = SCENARIOS[state.phase];
        state.sw = { gate: sw.gate, tier: sw.tier, slim: sw.slim };
        state.rate = perWake();
        announceEl.textContent = `day ${state.phase + 1}: ${labelOf[keyOf()]} — $${LADDER[state.phase].day.toFixed(2)} a day`;
      } else {
        state.touring = false;
        state.idle = setTimeout(() => start(), 14000);
      }
      state.clock = 0;
      state.fired = 0;
      state.dayCost = 0;
      state.cost = 0;
      state.slots = 0;
    }
  }
  // the pucks: fall to the gate, then either out to the pad or away to the quiet bin
  for (const p of pucks) {
    if (!p.busy) {
      if (p.el.style.opacity !== "0") p.el.style.opacity = "0";
      continue;
    }
    const speed = p.path === "wake" ? 0.52 : 0.62;
    p.at += dt * speed * (calm ? 8 : 1);
    const points = p.path === "wake" ? SHARED.TOKEN_PATH.wake : SHARED.TOKEN_PATH.quiet;
    if (p.at >= 1) {
      if (p.path === "quiet") {
        move(p.el, points[points.length - 1]);
        p.sink += dt;
        if (p.sink > (calm ? 0.1 : 0.6)) {
          p.busy = false;
          p.el.style.opacity = "0";
        }
      } else {
        // wait on the dolly: the machine takes the call
        const target = D.stations[p.tier];
        p.held += dt;
        const ride = clamp((p.held - 0.25) / 0.4, 0, 1);
        const x = D.padX + (target - D.padX) * ease(ride);
        const pos = [x, D.dollyY, D.tokenRest];
        move(p.el, pos);
        const plunge = clamp((p.held - 0.85) / 0.75, 0, 1);
        if (plunge > 0.55 && !p.printed) {
          p.printed = true;
          state.served += 1;
          state.cost += p.charge || 0;
          state.strike = 1;
          state.slots = Math.min(D.slots, state.slots === undefined ? 1 : state.slots + 1);
        }
        if (p.held > 2.15) {
          const away = clamp((p.held - 2.15) / 0.5, 0, 1);
          move(p.el, [x, D.dollyY, D.tokenRest - 3 * away]);
          p.el.style.opacity = String(1 - away);
          if (away >= 1) {
            p.busy = false;
            p.printed = false;
            p.el.style.opacity = "0";
          }
        }
      }
      continue;
    }
    move(p.el, samplePath(points, p.at));
  }
  // the gate: swings open whenever a signal is passing, else shut
  const passing = pucks.some((p) => p.busy && p.path === "wake");
  const wantGate = passing ? 1 : 0;
  state.gate = state.gate === undefined ? wantGate : follow(state.gate, wantGate, dt, calm ? 0.01 : 0.1);
  if (Math.abs(state.gate - state.shownGate) > 0.02) {
    state.shownGate = state.gate;
    gateEl.innerHTML = SHARED.paddleMarkup(LIB, P, state.gate);
  }
  // the dolly and the working head
  const working = pucks.find((p) => p.busy && p.path === "wake" && p.at >= 1);
  const wantX = working ? D.stations[working.tier] - D.padX : 0;
  state.dollyX = state.dollyX === undefined ? wantX : follow(state.dollyX, wantX, dt, calm ? 0.01 : 0.14);
  if (Math.abs(state.dollyX - (state.shownDolly ?? 1e9)) > 0.05) {
    state.shownDolly = state.dollyX;
    moveX(dollyEl, state.dollyX);
  }
  for (let i = 0; i < 3; i++) {
    const busy = Boolean(working && working.tier === i && working.held > 0.75 && working.held < 2.2);
    const wantDrop = busy ? (i === 0 ? 34 : i === 1 ? 27 : 20) : 0;
    state.drop = state.drop || [0, 0, 0];
    state.drop[i] = follow(state.drop[i], wantDrop, dt, calm ? 0.01 : 0.12);
    if (Math.abs(state.drop[i] - state.shownDrop[i]) > 0.05) {
      state.shownDrop[i] = state.drop[i];
      drop(headEls[i], state.drop[i]);
    }
    if (busy !== headEls[i].hasAttribute("data-busy")) {
      if (busy) headEls[i].setAttribute("data-busy", "");
      else headEls[i].removeAttribute("data-busy");
    }
  }
  // the tape: one line revealed per finished call
  const slots = Math.min(state.slots ?? 0, D.slots);
  if (slots !== state.shownSlots) {
    state.shownSlots = slots;
    slotEls.slice(0, slots).forEach((el) => el.setAttribute("data-on", ""));
    slotEls.slice(slots).forEach((el) => el.removeAttribute("data-on"));
  }
  // the guard: needle against the cap, index on the scale, pennant when the day crosses the cap
  const combo = LADDER.find((l) => l.key === keyOf());
  const live = state.touring ? Math.max(state.cost, 0) : null;
  const spend = live === null ? combo.day : live;
  const wantNeedle = clamp(spend / D.cap, 0, 1);
  const wantIndex = clamp(spend / LADDER[0].day, 0, 1);
  state.needle = state.needle === undefined ? wantNeedle : follow(state.needle, wantNeedle, dt, calm ? 0.01 : 0.4);
  state.index = state.index === undefined ? wantIndex : follow(state.index, wantIndex, dt, calm ? 0.01 : 0.4);
  if (Math.abs(state.needle - state.shownNeedle) > 0.004) {
    state.shownNeedle = state.needle;
    needleEl.setAttribute("d", SHARED.needleD(LIB, P, state.needle));
  }
  if (Math.abs(state.index - state.shownIndex) > 0.004) {
    state.shownIndex = state.index;
    indexEl.setAttribute("transform", SHARED.indexOffset(LIB, P, state.index));
  }
  const trip = spend >= D.cap;
  if (trip !== state.shownPennant) {
    state.shownPennant = trip;
    if (trip) pennantEl.setAttribute("data-trip", "");
    else pennantEl.removeAttribute("data-trip");
  }
  // the striker taps the bell on every finished call
  state.strike = state.strike === undefined ? 0 : state.strike;
  const wanted = state.strike > 0 ? -1.7 : 0;
  state.strike = Math.max(0, state.strike - dt * (calm ? 20 : 3.4));
  state.shownStriker = follow(state.shownStriker, wanted, dt, 0.06);
  strikerEl.setAttribute("transform", `translate(${state.shownStriker.toFixed(2)} 0)`);
  // the switches on the front panel
  ["gate", "tier", "slim"].forEach((key, i) => {
    const want = state.sw[key] ? D.angleOn : D.angleOff;
    state.angle = state.angle || [0, 0, 0];
    state.angle[i] = follow(state.angle[i], want, dt, calm ? 0.01 : 0.09);
    if (Math.abs(state.angle[i] - state.shownAngle[i]) > 0.4) {
      state.shownAngle[i] = state.angle[i];
      switchEls[i].innerHTML = SHARED.switchMarkup(LIB, P, SHARED.SWITCH_X[i], state.angle[i]);
      fittingsEls[i].innerHTML = SHARED.switchFittings(LIB, P, SHARED.SWITCH_X[i], state.sw[key]);
    }
  });
  // the spares slide off the rack when the tool list is slimmed
  for (const [k, el] of spareEls.entries()) {
    const want = state.sw.slim ? SHARED.SPARE_SHIFT : 0;
    state.spare = state.spare || [0, 0];
    state.spare[k] = follow(state.spare[k], want, dt, calm ? 0.01 : 0.12);
    if (Math.abs(state.spare[k] - state.shownSpares[k]) > 0.3) {
      state.shownSpares[k] = state.spare[k];
      moveX(el, state.spare[k]);
    }
  }
  say(spend);
  frame = visible && (!calm || state.force) ? requestAnimationFrame(tick) : 0;
  state.force = false;
}
function say(spend) {
  const row = LADDER.find((l) => l.key === keyOf());
  const monthly = row.month;
  const text = `${state.touring ? `day ${state.phase + 1}/4 · ` : ""}${labelOf[keyOf()]} · $${spend.toFixed(2)} today · $${monthly < 10 ? monthly.toFixed(1) : Math.round(monthly)}/mo · ${row.wakes} wakes`;
  if (text !== state.said) {
    state.said = text;
    readout.textContent = text;
  }
}
function run() {
  state.force = true;
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "140px 0px" }).observe(root);

// ── start ─────────────────────────────────────────────────────────────
if (still.matches) {
  state.touring = false;
  state.phase = 3;
  state.sw = { gate: true, tier: true, slim: true };
  state.slots = 12;
  state.needle = LADDER[3].day / D.cap;
  state.index = LADDER[3].day / LADDER[0].day;
  state.force = true;
  run();
} else {
  tokenEl.style.display = "none"; // the static example puck gives way to the flying ones
  start();
}
