// =============================================================================
// src/blockchain/NationStateReader.ts
// =============================================================================
// Converts the raw on-chain tuple returned by getAllStates() into the
// typed WorldState consumed by every agent in the AI layer.
//
// The Solidity `Nation` struct stores `lastAction` as a uint8 enum index.
// This module owns the mapping from uint8 → Action string and validates
// that every field coming off the wire is within expected bounds.
// =============================================================================

import { ACTIONS, FALLBACK_ACTION } from "../types/Action";
import type { Action }              from "../types/Action";
import type { NationState, WorldState } from "../types/Nation";

// -----------------------------------------------------------------------------
// Raw contract tuple type (as ethers v6 decodes it)
// -----------------------------------------------------------------------------

/**
 * The shape ethers v6 returns for a single Nation struct element.
 * All numeric fields arrive as bigint; the name field is a plain string.
 */
export interface RawNationTuple {
  name:           string;
  treasury:       bigint;
  techScore:      bigint;
  militaryScore:  bigint;
  diplomacyScore: bigint;
  lastAction:     bigint;
}

// -----------------------------------------------------------------------------
// Action index → string mapping
// Must stay in sync with the Solidity `Action` enum order:
//   0 = INVEST_IN_TECH
//   1 = BUILD_MILITARY
//   2 = FORM_ALLIANCE
//   3 = COLLECT_TRIBUTE
//   4 = LAUNCH_ESPIONAGE
// -----------------------------------------------------------------------------

const ACTION_INDEX_MAP: Record<number, Action> = {
  0: "INVEST_IN_TECH",
  1: "BUILD_MILITARY",
  2: "FORM_ALLIANCE",
  3: "COLLECT_TRIBUTE",
  4: "LAUNCH_ESPIONAGE",
};

/**
 * Converts a uint8 action index from the contract into the corresponding
 * Action string. Falls back to COLLECT_TRIBUTE on an unrecognised index
 * so a bad on-chain state never crashes the simulation loop.
 */
export function actionIndexToString(index: bigint | number): Action {
  const n = typeof index === "bigint" ? Number(index) : index;
  const action = ACTION_INDEX_MAP[n];
  if (!action) {
    console.warn(
      `[NationStateReader] Unknown action index ${n} — defaulting to ${FALLBACK_ACTION}`,
    );
    return FALLBACK_ACTION;
  }
  return action;
}

/**
 * Converts the Action string used by the AI layer back into the uint8 index
 * the contract's executeAction() function expects.
 */
export function actionStringToIndex(action: Action): number {
  const idx = ACTIONS.indexOf(action);
  if (idx === -1) {
    throw new Error(
      `[NationStateReader] Cannot convert unknown action "${action}" to contract index.`,
    );
  }
  return idx;
}

// -----------------------------------------------------------------------------
// Single-nation conversion
// -----------------------------------------------------------------------------

/**
 * Converts one raw contract tuple into a typed NationState.
 * Applies Number() to all bigint fields (scores fit uint16, treasury fits
 * a JS number safely — max uint256 would overflow but game values stay small).
 */
export function rawTupleToNationState(raw: RawNationTuple): NationState {
  return {
    name:           raw.name,
    treasury:       Number(raw.treasury),
    techScore:      Number(raw.techScore),
    militaryScore:  Number(raw.militaryScore),
    diplomacyScore: Number(raw.diplomacyScore),
    lastAction:     actionIndexToString(raw.lastAction),
  };
}

// -----------------------------------------------------------------------------
// Full world-state conversion
// -----------------------------------------------------------------------------

/**
 * Converts the three-element tuple array returned by getAllStates() plus the
 * current cycle number into a fully typed WorldState ready for agent consumption.
 *
 * @param rawNations   The array of Nation tuples from getAllStates().
 * @param cycleNumber  The bigint returned by getCycleNumber().
 * @returns            A typed WorldState.
 * @throws             If the contract returns fewer than 3 nations.
 */
export function buildWorldState(
  rawNations: RawNationTuple[],
  cycleNumber: bigint,
): WorldState {
  if (rawNations.length < 3) {
    throw new Error(
      `[NationStateReader] Expected 3 nations from getAllStates(), got ${rawNations.length}.`,
    );
  }

  // Safe: we just confirmed length >= 3
  const n0 = rawTupleToNationState(rawNations[0]!);
  const n1 = rawTupleToNationState(rawNations[1]!);
  const n2 = rawTupleToNationState(rawNations[2]!);

  return {
    cycleNumber: Number(cycleNumber),
    nations: [n0, n1, n2],
  };
}

/**
 * Resolves a target nation index from a name string returned by the Governor.
 * The Governor outputs the target nation's display name; this converts it to
 * the uint8 index executeAction() requires.
 *
 * Returns 255 (the no-target sentinel) when the name cannot be matched, which
 * is safe because the contract ignores targetIdx for non-espionage actions.
 *
 * @param targetName  Nation name string from GovernorDecision.targetNationName.
 * @param nations     The current WorldState nations array.
 * @param actingIdx   The index of the acting nation (cannot target itself).
 */
export function resolveTargetIndex(
  targetName: string | null | undefined,
  nations: WorldState["nations"],
  actingIdx: number,
): number {
  if (!targetName || targetName.trim() === "") return 255;

  const normalised = targetName.trim().toLowerCase();

  for (let i = 0; i < nations.length; i++) {
    const nation = nations[i]!;
    if (nation.name.toLowerCase().includes(normalised) || normalised.includes(nation.name.toLowerCase())) {
      if (i === actingIdx) {
        console.warn(
          `[NationStateReader] Governor targeted own nation "${nation.name}" — using 255.`,
        );
        return 255;
      }
      return i;
    }
  }

  console.warn(
    `[NationStateReader] Could not resolve target name "${targetName}" — using 255.`,
  );
  return 255;
}
