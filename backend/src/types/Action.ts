// =============================================================================
// src/types/Action.ts
// =============================================================================
// Canonical enum and related helpers for the five on-chain actions available
// to each nation per simulation cycle.
//
// These values MUST stay in sync with the Solidity `Action` enum in
// AgentNationsRegistry.sol. The integer indices are not used here — only the
// string names, which are passed as function-calling arguments and stored in
// Supabase. The contract ABI maps string → uint8 at the boundary layer.
// =============================================================================

/** The five actions a nation may execute per simulation cycle. */
export const ACTIONS = [
  "INVEST_IN_TECH",
  "BUILD_MILITARY",
  "FORM_ALLIANCE",
  "COLLECT_TRIBUTE",
  "LAUNCH_ESPIONAGE",
] as const;

/** Union type of all valid action strings. */
export type Action = (typeof ACTIONS)[number];

/**
 * Human-readable description of each action's effect.
 * Used in prompts so the LLM understands what each action does
 * without needing to infer it from the name alone.
 */
export const ACTION_DESCRIPTIONS: Record<Action, string> = {
  INVEST_IN_TECH:
    "Spend 100 treasury. Gain +15 tech score. Best when tech lead is a priority.",
  BUILD_MILITARY:
    "Spend 100 treasury. Gain +15 military score. Best when security is threatened.",
  FORM_ALLIANCE:
    "No cost. Gain +20 diplomacy score. Best when soft power and relationships matter.",
  COLLECT_TRIBUTE:
    "No cost. Gain +150 treasury. Best when funds are low or no urgent action exists.",
  LAUNCH_ESPIONAGE:
    "Spend 50 treasury. Gain +10 own tech score. Target nation loses -5 tech score. " +
    "Requires nominating a target nation. Best when a rival's tech lead must be disrupted.",
};

/**
 * Returns true if the given string is a valid Action.
 * Used as a Zod refinement and as a runtime guard at the blockchain boundary.
 */
export function isValidAction(value: unknown): value is Action {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value);
}

/** The safe fallback action used when an LLM response fails validation. */
export const FALLBACK_ACTION: Action = "COLLECT_TRIBUTE";