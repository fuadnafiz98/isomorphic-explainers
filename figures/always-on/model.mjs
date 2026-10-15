// The numbers behind the figure. Every dial, caption and read-out on the page reads from here,
// so the picture and the arithmetic cannot disagree.

// One day of signals arriving at an always-on agent, by kind. The counts are the shape the
// field reports describe: a heartbeat poll every 15 minutes, mail and webhooks on the side.
export const EVENT_KINDS = [
  { kind: "message", label: "message", count: 12, cls: "conversation" },
  { kind: "cron", label: "cron", count: 8, cls: "background" },
  { kind: "webhook", label: "webhook", count: 8, cls: "background" },
  { kind: "heartbeat", label: "heartbeat", count: 96, cls: "background" },
];
export const TOTAL_EVENTS = EVENT_KINDS.reduce((s, e) => s + e.count, 0);

// With the wake gate on, a deterministic script decides which of those are worth a model call.
// Heartbeats pass 2 of 96 (the watch found something); webhooks 2 of 8; crons 4 of 8 are real jobs;
// messages from a person always wake it.
export const GATE_PASS = { message: 12, cron: 4, webhook: 2, heartbeat: 2 };

// Blended dollars per million tokens by tier (input + output + cache, illustrative), and the
// tokens one request carries with a fat tool registry versus a slimmed one.
export const RATE = { frontier: 2.6, mid: 0.5, cheap: 0.05 };
export const TOKENS = { full: 48000, slim: 34000 };

// runaway-guard: the defaults the skill ships with, and the Claude Code session cap it installs.
export const CAP_USD = 10;
export const WARN_FRAC = 0.8;
export const TRIP = { loopRepeats: 3, failureStreak: 5 };

// tokens per request measured in the field (OpenClaw vs Hermes, OpenRouter telemetry, 2026-08)
export const FIELD_TOKENS = { openclaw: 48000, hermes: 62000 };
// the billing scare: unoptimized monitoring ≈ $0.50/hour ≈ $360/month; under $5–10 after three fixes
export const FIELD_BILL = { unoptimizedPerHour: 0.5, unoptimizedPerMonth: 360, fixedPerMonth: [5, 10] };

// A scenario: which of the three fixes are on.
export function scenario(sw) {
  const tok = sw.slim ? TOKENS.slim : TOKENS.full;
  const rows = [];
  let day = 0;
  for (const e of EVENT_KINDS) {
    const wakes = sw.gate ? GATE_PASS[e.kind] : e.count;
    const tier = sw.tier ? (e.cls === "background" ? "cheap" : "mid") : "frontier";
    const rate = RATE[tier];
    const cost = (wakes * tok * rate) / 1e6;
    day += cost;
    rows.push({ kind: e.kind, label: e.label, cls: e.cls, wakes, tier, rate, tok, cost });
  }
  return { rows, tok, day, month: day * 30, wakes: rows.reduce((s, r) => s + r.wakes, 0), settings: sw };
}

export const SCENARIOS = [
  { key: "raw", gate: false, tier: false, slim: false },
  { key: "gate", gate: true, tier: false, slim: false },
  { key: "tier", gate: true, tier: true, slim: false },
  { key: "slim", gate: true, tier: true, slim: true },
];
export const LADDER = SCENARIOS.map((sw) => ({ ...scenario(sw), key: sw.key }));

// The day's arrival schedule: deterministic, sorted, spread over 0..1 of the run.
export function daySchedule() {
  const events = [];
  for (const e of EVENT_KINDS) {
    for (let i = 0; i < e.count; i++) {
      const at = (i + 0.5) / e.count;
      events.push({ kind: e.kind, index: i, t: at });
    }
  }
  // interleave by a fixed shuffle of the sort key so kinds mix deterministically
  events.sort((a, b) => (a.t + ((a.index * 2654435761) % 997) / 4000) - (b.t + ((b.index * 2654435761) % 997) / 4000));
  events.forEach((e, i) => { e.seq = i; e.t = (i + 0.5) / events.length; });
  return events;
}

// Does the gate let this event through (deterministic per kind and index)?
export function gatePasses(kind, index) {
  switch (kind) {
    case "message": return true;
    case "heartbeat": return index === 23 || index === 71;
    case "webhook": return index === 2 || index === 6;
    case "cron": return index % 2 === 0;
    default: return false;
  }
}

export const fix = (v, n = 2) => v.toFixed(n);
export const money = (v) => "$" + (v >= 100 ? v.toFixed(0) : v.toFixed(2));
export const fmtMoney = (v) => (v >= 100 ? "$" + Math.round(v).toLocaleString("en-US") : "$" + v.toFixed(2));
export const fmtK = (v) => (v / 1000).toFixed(v >= 100000 ? 0 : 0) + "k";
