// =============================================================================
// src/prompts/governorPrompt.ts
// =============================================================================

import type { NationPersonality, WorldState } from "../types/Nation";
import type { Proposal } from "../schemas/ProposalSchema";

export interface GovernorPromptMessages {
  system: string;
  user: string;
}

function statLine(n: { name: string; treasury: number; techScore: number; militaryScore: number; diplomacyScore: number }): string {
  return `${n.name}: t=${n.treasury} tech=${n.techScore} mil=${n.militaryScore} dip=${n.diplomacyScore}`;
}

function fmtProposal(role: "Economist" | "Strategist", p: Proposal): string {
  const target = p.targetNationName ? ` → ${p.targetNationName}` : "";
  return `${role}: ${p.action}${target} | "${p.reasoning}"`;
}

export function buildGovernorPrompt(
  personality: NationPersonality,
  world: WorldState,
  economistProposal: Proposal,
  strategistProposal: Proposal,
): GovernorPromptMessages {
  const self   = world.nations[personality.index]!;
  const rivals = world.nations.filter((_, i) => i !== personality.index);

  const system = `You are the Governor of ${personality.name} (cycle ${world.cycleNumber}).
${personality.governorDoctrine}
Pick one minister's proposal. selectedMinister must be "Economist" or "Strategist". chosenAction must match that minister's action exactly. If LAUNCH_ESPIONAGE, include targetNationName.
Output ONLY this JSON: {"chosenAction":"...","selectedMinister":"Economist|Strategist","reasoning":"<30-150 chars>","rejectionReason":"<15-80 chars>","targetNationName":"<name or null>"}`;

  const user = `YOU: ${statLine(self)}
RIVALS: ${rivals.map(n => statLine(n)).join(" | ")}
${fmtProposal("Economist", economistProposal)}
${fmtProposal("Strategist", strategistProposal)}
Select one proposal.`;

  return { system, user };
}