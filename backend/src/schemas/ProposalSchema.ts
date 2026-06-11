// =============================================================================
// src/schemas/ProposalSchema.ts
// =============================================================================

import { z }                                 from "zod";
import { ACTIONS, FALLBACK_ACTION }          from "../types/Action";
import type { MinisterRole, NationState }    from "../types/Nation";

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

export const ProposalSchema = z.object({
  action: z.enum(ACTIONS, {
    errorMap: () => ({ message: `Action must be one of: ${ACTIONS.join(", ")}` }),
  }),
  reasoning: z
    .string()
    .min(20, "Reasoning must be at least 20 characters.")
    .max(600, "Reasoning must be at most 600 characters.")
    .trim(),
  targetNationName: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});

export const RefinedProposalSchema = ProposalSchema.superRefine((data, ctx) => {
  if (
    data.action === "LAUNCH_ESPIONAGE" &&
    (!data.targetNationName || data.targetNationName.trim() === "")
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["targetNationName"],
      message: "targetNationName is required when action is LAUNCH_ESPIONAGE.",
    });
  }
});

export type Proposal = z.infer<typeof RefinedProposalSchema>;

// -----------------------------------------------------------------------------
// Fallback factory
// -----------------------------------------------------------------------------

export function FALLBACK_PROPOSAL(role: MinisterRole, nationName: string): Proposal {
  return {
    action: FALLBACK_ACTION,
    reasoning:
      `[FALLBACK] The ${role} of ${nationName} could not produce a valid proposal ` +
      `this cycle. Defaulting to ${FALLBACK_ACTION} to maintain treasury stability.`,
    targetNationName: null,
  };
}

// -----------------------------------------------------------------------------
// Parse helper — returns tuple so callers get a clean isFallback flag
// -----------------------------------------------------------------------------

export interface ParseProposalResult {
  proposal:   Proposal;
  isFallback: boolean;
}

export function parseProposal(
  raw: string,
  role: MinisterRole,
  nation: NationState,
): ParseProposalResult {
  let parsed: unknown;

  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (jsonErr) {
    console.warn(
      `[${nation.name}] [${role}] JSON parse failed — fallback. ` +
        `Error: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`,
    );
    return { proposal: FALLBACK_PROPOSAL(role, nation.name), isFallback: true };
  }

  const result = RefinedProposalSchema.safeParse(parsed);
  if (!result.success) {
    console.warn(
      `[${nation.name}] [${role}] Schema validation failed — fallback. ` +
        `Errors: ${result.error.errors.map((e) => e.message).join("; ")}`,
    );
    return { proposal: FALLBACK_PROPOSAL(role, nation.name), isFallback: true };
  }

  return { proposal: result.data, isFallback: false };
}