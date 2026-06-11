// lib/types.ts
// Mirrors backend types. Kept in sync manually — no runtime import from backend.

// ── Actions ──────────────────────────────────────────────────────────────────

export const ACTIONS = [
  "INVEST_IN_TECH",
  "BUILD_MILITARY",
  "FORM_ALLIANCE",
  "COLLECT_TRIBUTE",
  "LAUNCH_ESPIONAGE",
] as const;

export type Action = (typeof ACTIONS)[number];

// ── Nation state (mirrors Solidity struct) ────────────────────────────────────

export interface NationState {
  name:           string;
  treasury:       number;
  techScore:      number;
  militaryScore:  number;
  diplomacyScore: number;
  lastAction:     Action;
}

export interface WorldState {
  cycleNumber: number;
  nations:     [NationState, NationState, NationState];
}

// ── AI layer types (mirrors backend schemas) ──────────────────────────────────

export interface Proposal {
  action:           Action;
  reasoning:        string;
  targetNationName: string | null;
}

export interface GovernorDecision {
  chosenAction:      Action;
  selectedMinister:  "Economist" | "Strategist";
  reasoning:         string;
  rejectionReason:   string;
  targetNationName:  string | null;
}

// ── API response shapes (mirrors CycleStore) ──────────────────────────────────

export interface NationCycleEntry {
  nationIndex:        0 | 1 | 2;
  nationName:         string;
  economistProposal:  Proposal;
  strategistProposal: Proposal;
  decision:           GovernorDecision;
  economistFallback:  boolean;
  strategistFallback: boolean;
  governorFallback:   boolean;
  txHash:             string | null;
  txBlockNumber:      number | null;
  txError:            string | null;
}

export interface CycleRecord {
  cycleNumber:   number;
  completedAt:   string;
  worldStatePre: WorldState;
  nations:       NationCycleEntry[];
  advanceTxHash: string | null;
}

export interface HealthResponse {
  ok:        boolean;
  cycle:     number;
  isRunning: boolean;
  timestamp: string;
}