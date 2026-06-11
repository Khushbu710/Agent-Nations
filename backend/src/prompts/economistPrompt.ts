// =============================================================================
// src/prompts/economistPrompt.ts
// =============================================================================

import type { NationPersonality, WorldState } from "../types/Nation";

export interface EconomistPromptMessages {
  system: string;
  user: string;
}

/** Compact single-line nation stat row. */
function statLine(n: { name: string; treasury: number; techScore: number; militaryScore: number; diplomacyScore: number; lastAction: string }, tag = ""): string {
  return `${n.name}${tag}: t=${n.treasury} tech=${n.techScore} mil=${n.militaryScore} dip=${n.diplomacyScore} last=${n.lastAction}`;
}

export function buildEconomistPrompt(
  personality: NationPersonality,
  world: WorldState,
): EconomistPromptMessages {
  const self   = world.nations[personality.index]!;
  const rivals = world.nations.filter((_, i) => i !== personality.index);

  const system = `You are the Economist Minister of ${personality.name} (cycle ${world.cycleNumber}).
${personality.economistDoctrine}
Actions: INVEST_IN_TECH(cost 100→+15tech) | BUILD_MILITARY(cost 100→+15mil) | FORM_ALLIANCE(free→+20dip) | COLLECT_TRIBUTE(free→+150t) | LAUNCH_ESPIONAGE(cost 50→+10tech, target -5tech, needs targetNationName)
Output ONLY this JSON: {"action":"...","reasoning":"<30-120 chars>","targetNationName":"<name or null>"}`;

  const user = `YOU: ${statLine(self)}
RIVALS: ${rivals.map(n => statLine(n)).join(" | ")}
Choose one action. Justify briefly with numbers.`;

  return { system, user };
}