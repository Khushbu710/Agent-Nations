// =============================================================================
// src/schemas/GovernorDecisionSchema.ts
// =============================================================================

import { z }                          from "zod";
import { ACTIONS, FALLBACK_ACTION }   from "../types/Action";
import type { NationPersonality }     from "../types/Nation";

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

export const GovernorDecisionSchema = z.object({
  chosenAction: z.enum(ACTIONS, {
    errorMap: () => ({ message: `chosenAction must be one of: ${ACTIONS.join(", ")}` }),
  }),
  selectedMinister: z.enum(["Economist", "Strategist"], {
    errorMap: () => ({ message: 'selectedMinister must be "Economist" or "Strategist".' }),
  }),
  reasoning: z
    .string()
    .min(20, "Reasoning must be at least 20 characters.")
    .max(700, "Reasoning must be at most 700 characters.")
    .trim(),
  rejectionReason: z
    .string()
    .min(10, "Rejection reason must be at least 10 characters.")
    .max(300, "Rejection reason must be at most 300 characters.")
    .trim(),
  targetNationName: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});

export const RefinedGovernorDecisionSchema = GovernorDecisionSchema.superRefine(
  (data, ctx) => {
    if (
      data.chosenAction === "LAUNCH_ESPIONAGE" &&
      (!data.targetNationName || data.targetNationName.trim() === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetNationName"],
        message: "targetNationName is required when chosenAction is LAUNCH_ESPIONAGE.",
      });
    }
  },
);

export type GovernorDecision = z.infer<typeof RefinedGovernorDecisionSchema>;

// -----------------------------------------------------------------------------
// Fallback factory
// -----------------------------------------------------------------------------

export function FALLBACK_DECISION(personality: NationPersonality): GovernorDecision {
  return {
    chosenAction:     FALLBACK_ACTION,
    selectedMinister: "Economist",
    reasoning:
      `[FALLBACK] The Governor of ${personality.name} could not produce a valid ` +
      `decision this cycle. Defaulting to ${FALLBACK_ACTION} to maintain stability.`,
    rejectionReason:  "Governor validation failed; proposals could not be evaluated.",
    targetNationName: null,
  };
}

// -----------------------------------------------------------------------------
// Parse helper — returns tuple with isFallback flag
// -----------------------------------------------------------------------------

export interface ParseGovernorResult {
  decision:   GovernorDecision;
  isFallback: boolean;
}

export function parseGovernorDecision(
  raw: string,
  personality: NationPersonality,
): ParseGovernorResult {
  let parsed: unknown;

  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (jsonErr) {
    console.warn(
      `[${personality.name}] [Governor] JSON parse failed — fallback. ` +
        `Error: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`,
    );
    return { decision: FALLBACK_DECISION(personality), isFallback: true };
  }

  const result = RefinedGovernorDecisionSchema.safeParse(parsed);
  if (!result.success) {
    console.warn(
      `[${personality.name}] [Governor] Schema validation failed — fallback. ` +
        `Errors: ${result.error.errors.map((e) => e.message).join("; ")}`,
    );
    return { decision: FALLBACK_DECISION(personality), isFallback: true };
  }

  return { decision: result.data, isFallback: false };
}