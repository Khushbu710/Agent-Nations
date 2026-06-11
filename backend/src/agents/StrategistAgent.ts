// =============================================================================
// src/agents/StrategistAgent.ts
// =============================================================================

import { buildStrategistPrompt }              from "../prompts/strategistPrompt";
import { parseProposal, FALLBACK_PROPOSAL }   from "../schemas/ProposalSchema";
import { getGrokClient }                      from "../services/GrokClient";
import type { NationPersonality, WorldState } from "../types/Nation";
import type { Proposal }                      from "../schemas/ProposalSchema";

export interface StrategistResult {
  proposal:    Proposal;
  rawResponse: string;
  isFallback:  boolean;
  latencyMs:   number;
}

export class StrategistAgent {
  private readonly personality: NationPersonality;

  constructor(personality: NationPersonality) {
    this.personality = personality;
  }

  async propose(world: WorldState): Promise<StrategistResult> {
    const label  = `${this.personality.name}/Strategist`;
    const client = getGrokClient();

    console.log(`[${label}] Deliberating...`);

    const { system, user } = buildStrategistPrompt(this.personality, world);

    let rawResponse = "";
    let latencyMs   = 0;

    try {
      const response = await client.complete({ system, user, label });
      rawResponse    = response.content;
      latencyMs      = response.latencyMs;
    } catch (apiErr) {
      console.error(
        `[${label}] API call failed — using fallback. ` +
          `Error: ${apiErr instanceof Error ? apiErr.message : String(apiErr)}`,
      );
      const nation = world.nations[this.personality.index]!;
      return {
        proposal:    FALLBACK_PROPOSAL("Strategist", nation.name),
        rawResponse: "",
        isFallback:  true,
        latencyMs:   0,
      };
    }

    const nation     = world.nations[this.personality.index]!;
    const { proposal, isFallback } = parseProposal(rawResponse, "Strategist", nation);

    if (!isFallback) {
      console.log(
        `[${label}] Proposed: ${proposal.action}` +
          (proposal.targetNationName ? ` → ${proposal.targetNationName}` : ""),
      );
    }

    return { proposal, rawResponse, isFallback, latencyMs };
  }
}