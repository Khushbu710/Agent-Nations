// =============================================================================
// src/prompts/strategistPrompt.ts
// =============================================================================

import type { NationPersonality, WorldState } from "../types/Nation";

export interface StrategistPromptMessages {
  system: string;
  user: string;
}

function statLine(n: { name: string; treasury: number; techScore: number; militaryScore: number; diplomacyScore: number; lastAction: string }, tag = ""): string {
  return `${n.name}${tag}: t=${n.treasury} tech=${n.techScore} mil=${n.militaryScore} dip=${n.diplomacyScore} last=${n.lastAction}`;
}

export function buildStrategistPrompt(
  personality: NationPersonality,
  world: WorldState,
): StrategistPromptMessages {
  const self   = world.nations[personality.index]!;
  const rivals = world.nations.filter((_, i) => i !== personality.index);

  // Inline threat deltas — replaces the verbose formatThreatAssessment block
  const threatLines = rivals.map(r => {
    const dm = r.militaryScore - self.militaryScore;
    const dt = r.techScore - self.techScore;
    return `${r.name}: Δmil=${dm > 0 ? "+" : ""}${dm} Δtech=${dt > 0 ? "+" : ""}${dt}`;
  }).join(" | ");

  const system = `You are the Strategist Minister of ${personality.name} (cycle ${world.cycleNumber}).
${personality.strategistDoctrine}
Actions: INVEST_IN_TECH(cost 100→+15tech) | BUILD_MILITARY(cost 100→+15mil) | FORM_ALLIANCE(free→+20dip) | COLLECT_TRIBUTE(free→+150t) | LAUNCH_ESPIONAGE(cost 50→+10tech, target -5tech, needs targetNationName)
Output ONLY this JSON: {"action":"...","reasoning":"<30-120 chars>","targetNationName":"<name or null>"}`;

  const user = `YOU: ${statLine(self)}
RIVALS: ${rivals.map(n => statLine(n)).join(" | ")}
THREATS: ${threatLines}
Choose one action. Justify briefly with threat deltas.`;

  return { system, user };
}