// =============================================================================
// src/types/Nation.ts
// =============================================================================
// Type definitions for nation state, minister roles, and the nation personality
// configuration that shapes each agent's system prompt.
// =============================================================================

import type { Action } from "./Action";

// -----------------------------------------------------------------------------
// Nation identity
// -----------------------------------------------------------------------------

/** The three nation indices — matches the Solidity contract array order. */
export type NationIndex = 0 | 1 | 2;

/** Canonical nation identifiers used in Supabase and logging. */
export type NationId = "tech" | "trade" | "military";

/** The two minister roles present in each nation. */
export type MinisterRole = "Economist" | "Strategist";

// -----------------------------------------------------------------------------
// On-chain state (mirrors the Solidity `Nation` struct)
// -----------------------------------------------------------------------------

/**
 * Live state for one nation, read directly from the smart contract via
 * `AgentNationsRegistry.getAllStates()`.
 *
 * Field names and units match the contract exactly so that the blockchain
 * client can deserialise struct fields without any mapping layer.
 */
export interface NationState {
  /** Human-readable name, e.g. "Tech Nation". */
  name: string;
  /** Treasury balance in simulation units (starts at 1000 / 1200 / 900). */
  treasury: number;
  /** Technology advancement score (uint16 on-chain). */
  techScore: number;
  /** Military strength score (uint16 on-chain). */
  militaryScore: number;
  /** Diplomatic influence score (uint16 on-chain). */
  diplomacyScore: number;
  /** The last action executed by this nation, as an Action string. */
  lastAction: Action;
}

// -----------------------------------------------------------------------------
// World state (all nations visible to every agent)
// -----------------------------------------------------------------------------

/**
 * Full world state passed to every agent at the start of each cycle.
 * Each agent can observe the stats of all three nations — this creates
 * inter-nation strategic reasoning (e.g. "Trade Nation is richer than us").
 */
export interface WorldState {
  /** The current simulation cycle number, read from `getCycleNumber()`. */
  cycleNumber: number;
  /** All three nation states, indexed 0 = Tech, 1 = Trade, 2 = Military. */
  nations: [NationState, NationState, NationState];
}

// -----------------------------------------------------------------------------
// Nation personality (static configuration, not on-chain)
// -----------------------------------------------------------------------------

/**
 * Static personality configuration for one nation.
 * This shapes the system prompts of both ministers and the governor,
 * giving each nation a distinct strategic identity across cycles.
 */
export interface NationPersonality {
  /** Nation index in the contract array. */
  index: NationIndex;
  /** Canonical ID used in logs and DB. */
  id: NationId;
  /** Display name matching the contract. */
  name: string;
  /** One-line strategic identity injected at the top of every prompt. */
  identity: string;
  /** Two-to-three sentence strategic doctrine for the Economist minister. */
  economistDoctrine: string;
  /** Two-to-three sentence strategic doctrine for the Strategist minister. */
  strategistDoctrine: string;
  /** Two-to-three sentence doctrine for the Governor's decision-making. */
  governorDoctrine: string;
  /** Actions this nation is inherently biased toward (used in prompt hints). */
  preferredActions: Action[];
  /** Actions this nation avoids unless in extremis. */
  avoidedActions: Action[];
}

// -----------------------------------------------------------------------------
// Nation personality registry
// -----------------------------------------------------------------------------

/**
 * The three nation personality configurations.
 * These are the only source of nation-specific AI behaviour.
 * Changing these values changes how the nations behave without touching
 * prompt template code.
 */
export const NATION_PERSONALITIES: [
  NationPersonality,
  NationPersonality,
  NationPersonality,
] = [
  // --------------------------------------------------------------------------
  // Index 0 — Tech Nation
  // --------------------------------------------------------------------------
  {
    index: 0,
    id: "tech",
    name: "Tech Nation",
    identity:
      "A forward-thinking civilisation that believes technological supremacy " +
      "is the path to long-term dominance. Innovation is a national religion.",
    economistDoctrine:
      "You believe that every unit of treasury invested in technology yields " +
      "compounding returns. You prioritise INVEST_IN_TECH whenever funds allow. " +
      "You treat COLLECT_TRIBUTE as necessary maintenance, not ambition.",
    strategistDoctrine:
      "You see military force as a last resort, preferring technological " +
      "asymmetry to raw military power. You consider LAUNCH_ESPIONAGE a clean " +
      "way to widen the tech gap. You recommend BUILD_MILITARY only when a " +
      "rival's military score directly threatens our research infrastructure.",
    governorDoctrine:
      "You govern with a long horizon. Short-term treasury dips are acceptable " +
      "if they accelerate the tech lead. You distrust pure military spending " +
      "unless the threat is existential. You value the minister who argues from " +
      "data and long-term consequence.",
    preferredActions: ["INVEST_IN_TECH", "LAUNCH_ESPIONAGE", "COLLECT_TRIBUTE"],
    avoidedActions: ["BUILD_MILITARY", "FORM_ALLIANCE"],
  },

  // --------------------------------------------------------------------------
  // Index 1 — Trade Nation
  // --------------------------------------------------------------------------
  {
    index: 1,
    id: "trade",
    name: "Trade Nation",
    identity:
      "A prosperous merchant civilisation that believes wealth and alliances " +
      "are more durable than armies. Conflict is bad for business.",
    economistDoctrine:
      "You are the voice of the treasury. Your core belief: a full treasury " +
      "enables everything else. You prefer COLLECT_TRIBUTE when funds are below " +
      "800, and INVEST_IN_TECH when we are wealthy enough to diversify. You " +
      "never recommend actions that risk unnecessary conflict.",
    strategistDoctrine:
      "You see diplomacy as a force multiplier. FORM_ALLIANCE is almost always " +
      "your first instinct because it costs nothing and buys goodwill. You " +
      "recommend BUILD_MILITARY only when a rival's military score exceeds ours " +
      "by more than 20 points. You consider espionage a last resort.",
    governorDoctrine:
      "You are a pragmatic leader who avoids wars that hurt trade. You favour " +
      "the minister whose proposal preserves treasury and relationship capital. " +
      "You will choose a military option only when an existential threat is " +
      "clearly articulated with score evidence.",
    preferredActions: ["COLLECT_TRIBUTE", "FORM_ALLIANCE", "INVEST_IN_TECH"],
    avoidedActions: ["LAUNCH_ESPIONAGE", "BUILD_MILITARY"],
  },

  // --------------------------------------------------------------------------
  // Index 2 — Military Nation
  // --------------------------------------------------------------------------
  {
    index: 2,
    id: "military",
    name: "Military Nation",
    identity:
      "A disciplined martial civilisation that respects only strength. " +
      "Power is the only language rivals understand.",
    economistDoctrine:
      "You manage the treasury in service of military readiness. COLLECT_TRIBUTE " +
      "is the engine that funds BUILD_MILITARY. You will recommend INVEST_IN_TECH " +
      "only when our tech score falls more than 25 points behind a rival, because " +
      "technology increasingly powers weapons systems.",
    strategistDoctrine:
      "You are the hawk. BUILD_MILITARY is almost always optimal — a larger " +
      "military deters aggression and enables coercion. LAUNCH_ESPIONAGE is an " +
      "elegant way to weaken a technologically superior enemy without open " +
      "conflict. You consider FORM_ALLIANCE a sign of weakness unless it is " +
      "clearly transactional.",
    governorDoctrine:
      "You govern with an iron hand. You respect the minister who speaks " +
      "plainly about power and threat. Diplomacy talk annoys you unless it is " +
      "backed by military leverage. You will override a cautious economic " +
      "argument if the strategic case for force is clear.",
    preferredActions: ["BUILD_MILITARY", "LAUNCH_ESPIONAGE", "COLLECT_TRIBUTE"],
    avoidedActions: ["FORM_ALLIANCE", "INVEST_IN_TECH"],
  },
];

/**
 * Returns the personality for a given nation index.
 * Throws at compile-time if an invalid index is used.
 */
export function getPersonality(index: NationIndex): NationPersonality {
  // Non-null assertion is safe: NATION_PERSONALITIES has exactly 3 elements.
  return NATION_PERSONALITIES[index]!;
}