// =============================================================================
// src/agents/GovernorAgent.ts
// =============================================================================

import { buildGovernorPrompt }                       from "../prompts/governorPrompt";
import { parseGovernorDecision, FALLBACK_DECISION }  from "../schemas/GovernorDecisionSchema";
import { getGrokClient }                             from "../services/GrokClient";
import type { NationPersonality, WorldState }        from "../types/Nation";
import type { Proposal }                             from "../schemas/ProposalSchema";
import type { GovernorDecision }                     from "../schemas/GovernorDecisionSchema";

export interface GovernorResult {
  decision:    GovernorDecision;
  rawResponse: string;
  isFallback:  boolean;
  latencyMs:   number;
}

export class GovernorAgent {
  private readonly personality: NationPersonality;

  constructor(personality: NationPersonality) {
    this.personality = personality;
  }

  async decide(
    world: WorldState,
    economistProposal: Proposal,
    strategistProposal: Proposal,
  ): Promise<GovernorResult> {
    const label  = `${this.personality.name}/Governor`;
    const client = getGrokClient();

    console.log(`[${label}] Evaluating proposals...`);

    const { system, user } = buildGovernorPrompt(
      this.personality,
      world,
      economistProposal,
      strategistProposal,
    );

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
      return {
        decision:    FALLBACK_DECISION(this.personality),
        rawResponse: "",
        isFallback:  true,
        latencyMs:   0,
      };
    }

    const { decision, isFallback } = parseGovernorDecision(rawResponse, this.personality);

    if (!isFallback) {
      console.log(
        `[${label}] Selected ${decision.selectedMinister}: ${decision.chosenAction}` +
          (decision.targetNationName ? ` → ${decision.targetNationName}` : ""),
      );
    }

    return { decision, rawResponse, isFallback, latencyMs };
  }
}