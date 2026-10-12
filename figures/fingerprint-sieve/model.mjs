// The truth behind the figure. The arithmetic is exact; the per-trait bit values are illustrative round
// numbers chosen to total 33 bits (2^33 is about 8.6 billion, more than the people on Earth). Real traits
// correlate, so real totals are lower: see the page text.
export const WORLD = 8e9;
export const WORLD_BITS = Math.log2(WORLD);

// bits: what the trait is worth when nothing hides it
// farbled: Brave-style noise is applied to it (consistent in one session, new next session)
// uniform: what is left of it under Tor-style "everyone looks alike" protection
export const TRAITS = [
  { id: "headers", name: "Request headers", short: "headers", bits: 7, farbled: false, uniform: 1,
    reads: "User-Agent, Accept-Language, and the region your IP address maps to",
    how: "Sent with the request itself, before any script runs." },
  { id: "screen", name: "Screen and window", short: "screen", bits: 5, farbled: false, uniform: 1,
    reads: "resolution, pixel ratio, colour depth, window size",
    how: "Display size, pixel ratio and window size." },
  { id: "locale", name: "Time zone and locale", short: "time zone", bits: 3, farbled: false, uniform: 0,
    reads: "Intl time zone, calendar, number format, language list",
    how: "A VPN moves your IP address, not your time zone." },
  { id: "hardware", name: "Hardware", short: "hardware", bits: 3, farbled: true, uniform: 0,
    reads: "logical core count, device memory (Chromium)",
    how: "Two numbers, no permission prompt." },
  { id: "canvas", name: "Canvas and fonts", short: "canvas", bits: 7, farbled: true, uniform: 0,
    reads: "pixels of a drawn test image, text metrics of installed fonts",
    how: "A hidden canvas is drawn and read back; edge pixels differ." },
  { id: "webgl", name: "WebGL and GPU", short: "WebGL", bits: 5, farbled: true, uniform: 0,
    reads: "GPU vendor and model, extension list, limits, a rendered triangle",
    how: "The GPU's name, its extensions and a rendered triangle." },
  { id: "audio", name: "Audio stack", short: "audio", bits: 3, farbled: true, uniform: 0,
    reads: "a short tone rendered offline through a compressor",
    how: "A tone rendered offline; tiny float differences." },
];

export const MODES = ["open", "farbled", "uniform"];
export const MODE_LABEL = { open: "No protection", farbled: "Farbled", uniform: "Uniform" };
export const MODE_NOTE = {
  open: "Every answer is true and stable, so every bit carries over.",
  farbled: "Noise per site and session: bits count now, but do not carry over.",
  uniform: "Everyone answers the same: the crowd barely narrows.",
};

export const bitsOf = (trait, mode) => (mode === "uniform" ? trait.uniform : trait.bits);
export const carriesOver = (trait, mode) => (mode === "farbled" ? !trait.farbled : true);
export const poolOf = (bits) => Math.max(1, WORLD / 2 ** bits);

// the reading after the first k sieves have measured the ball
export function reading(mode, k) {
  let bits = 0;
  let stable = 0;
  for (let i = 0; i < k && i < TRAITS.length; i++) {
    const trait = TRAITS[i];
    const b = bitsOf(trait, mode);
    bits += b;
    if (carriesOver(trait, mode)) stable += b;
  }
  return { bits, stable, pool: poolOf(bits), poolStable: poolOf(stable) };
}

// position on the log scale: 1 at the top (the whole crowd), 0 at the bottom (just you)
export const scaleOf = (bits) => Math.min(1, Math.max(0, 1 - bits / WORLD_BITS));

export function fmtCount(n) {
  if (n < 1.5) return "just you";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} billion`;
  if (n >= 1e7) return `${Math.round(n / 1e6)} million`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} million`;
  return Math.round(n).toLocaleString("en-US");
}

// lamp slots of one trait on the bench: always as many as its open value, counted from the left
export const lampsOf = (index) => TRAITS[index].bits;
