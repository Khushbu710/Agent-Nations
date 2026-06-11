// =============================================================================
// src/agents/EconomistAgent.ts
// =============================================================================

import { buildEconomistPrompt }               from "../prompts/economistPrompt";
import { parseProposal, FALLBACK_PROPOSAL }   from "../schemas/ProposalSchema";
import { getGrokClient }                      from "../services/GrokClient";
import type { NationPersonality, WorldState } from "../types/Nation";
import type { Proposal }                      from "../schemas/ProposalSchema";

export interface EconomistResult {
  proposal:    Proposal;
  rawResponse: string;
  isFallback:  boolean;
  latencyMs:   number;
}

export class EconomistAgent {
  private readonly personality: NationPersonality;

  constructor(personality: NationPersonality) {
    this.personality = personality;
  }

  async propose(world: WorldState): Promise<EconomistResult> {
    const label  = `${this.personality.name}/Economist`;
    const client = getGrokClient();

    console.log(`[${label}] Deliberating...`);

    const { system, user } = buildEconomistPrompt(this.personality, world);

    let rawResponse = "";
    let latencyMs   = 0;

    try {
      const response  = await client.complete({ system, user, label });
      rawResponse     = response.content;
      latencyMs       = response.latencyMs;
    } catch (apiErr) {
      console.error(
        `[${label}] API call failed — using fallback. ` +
          `Error: ${apiErr instanceof Error ? apiErr.message : String(apiErr)}`,
      );
      const nation = world.nations[this.personality.index]!;
      return {
        proposal:    FALLBACK_PROPOSAL("Economist", nation.name),
        rawResponse: "",
        isFallback:  true,
        latencyMs:   0,
      };
    }

    const nation     = world.nations[this.personality.index]!;
    const { proposal, isFallback } = parseProposal(rawResponse, "Economist", nation);

    if (!isFallback) {
      console.log(
        `[${label}] Proposed: ${proposal.action}` +
          (proposal.targetNationName ? ` → ${proposal.targetNationName}` : ""),
      );
    }

    return { proposal, rawResponse, isFallback, latencyMs };
  }
}