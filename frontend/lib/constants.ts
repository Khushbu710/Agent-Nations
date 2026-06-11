// lib/constants.ts
import type { Action } from "./types";

export const NATION_COLOUR: Record<string, string> = {
  "Tech Nation":     "#38bdf8",
  "Trade Nation":    "#fbbf24",
  "Military Nation": "#f87171",
};

export const NATION_DIM: Record<string, string> = {
  "Tech Nation":     "rgba(56,189,248,0.12)",
  "Trade Nation":    "rgba(251,191,36,0.12)",
  "Military Nation": "rgba(248,113,113,0.12)",
};

export const NATION_GLOW: Record<string, string> = {
  "Tech Nation":     "rgba(56,189,248,0.25)",
  "Trade Nation":    "rgba(251,191,36,0.25)",
  "Military Nation": "rgba(248,113,113,0.25)",
};

export const NATION_ICON: Record<string, string> = {
  "Tech Nation":     "⚡",
  "Trade Nation":    "⚖",
  "Military Nation": "⚔",
};

export const ACTION_STYLE: Record<Action, { bg: string; text: string; label: string; icon: string }> = {
  INVEST_IN_TECH:   { bg: "rgba(56,189,248,0.12)",  text: "#38bdf8", label: "INVEST IN TECH",   icon: "🔬" },
  BUILD_MILITARY:   { bg: "rgba(248,113,113,0.12)", text: "#f87171", label: "BUILD MILITARY",   icon: "🛡" },
  FORM_ALLIANCE:    { bg: "rgba(52,211,153,0.12)",  text: "#34d399", label: "FORM ALLIANCE",    icon: "🤝" },
  COLLECT_TRIBUTE:  { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24", label: "COLLECT TRIBUTE",  icon: "💰" },
  LAUNCH_ESPIONAGE: { bg: "rgba(167,139,250,0.12)", text: "#a78bfa", label: "LAUNCH ESPIONAGE", icon: "🕵" },
};

export const STAT_CONFIG = [
  { key: "techScore",      label: "Tech",      color: "#38bdf8", max: 200 },
  { key: "militaryScore",  label: "Military",  color: "#f87171", max: 200 },
  { key: "diplomacyScore", label: "Diplomacy", color: "#34d399", max: 200 },
] as const;

export type StatKey = (typeof STAT_CONFIG)[number]["key"];

export const BASESCAN_TX  = (h: string) => `https://sepolia.basescan.org/tx/${h}`;
export const BASESCAN_ADR = (a: string) => `https://sepolia.basescan.org/address/${a}`;
