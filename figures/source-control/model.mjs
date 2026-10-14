// Model.mjs: the numbers from the Anthropic "Redesigning source control" post.
// Every derived value on the page comes from here so the pictures and readouts cannot disagree.

export const ARTICLE = {
  title: "Redesigning source control at Anthropic",
  url: "https://www.anthropic.com/engineering/redesigning-source-control",
  author: "Nick G. and the source control team",
};

// merge rate, merges per day (read from chart)
export const MERGES = [
  { month: "Jan", v: 600 },
  { month: "Feb", v: 720 },
  { month: "Mar", v: 900 },
  { month: "Apr", v: 1150 },
  { month: "May", v: 2500 },
  { month: "Jun", v: 5600 },
  { month: "Jul", v: 11000 },
  { month: "Aug", v: 19500 },
  { month: "Sep", v: 31200 },
];
export const MERGE_MAY = 2500;
export const MERGE_SEP = 30000;
export const MERGE_FACTOR = MERGE_SEP / MERGE_MAY;

// monorepo scale
export const HISTORY_GB = 100; // main-branch history
export const WORKCOPY_GB = 25; // compressed working copy
export const CHECKOUTS_DAY = 25e6;
export const NAIVE_PB_DAY = 600;
export const MIRRORS = "several hundred";

// engineers
export const TEAM = 7;
export const MONTHS = 5;
export const HUMAN_FACTOR = 10; // merge rate growth factor inside that window

// scion cache
export const CACHE_HIT = 0.99; // per tier
export const FOOTPRINT_FACTOR = 200; // smaller than git mirrors
export const CI_SPEEDUP = 100; // two orders of magnitude
export const CI_CPU_WIN = 0.25;

// mythos rewrite
export const MYTHOS_MEM = 20; // times less memory
export const MYTHOS_SPEED = 4; // times faster

// tiers
export const TIERS = ["client (scn)", "daemon (per node)", "cache (regional)", "server (auth)"];

export const fmt = (n) => {
  if (n >= 1e15) return (n / 1e15).toFixed(1) + " PB";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(Math.round(n));
};
export const fmtPb = (n) => (n >= 1e12 ? (n / 1e12).toFixed(1) + " PB" : fmt(n));
export const pctB = (n) => (n * 100).toFixed(0) + "%";
export const fmtGB = (n) => n + " GB";