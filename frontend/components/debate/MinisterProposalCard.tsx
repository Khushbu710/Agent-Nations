"use client";
// MinisterProposalCard — shows one minister's proposal with full reasoning.
// States: "proposed" | "selected" | "rejected"

import { ActionBadge } from "@/components/ui/ActionBadge";
import { NATION_COLOUR } from "@/lib/constants";
import type { Proposal } from "@/lib/types";

interface Props {
  role:         "Economist" | "Strategist";
  proposal:     Proposal;
  state:        "proposed" | "selected" | "rejected";
  nationName:   string;
  isFallback?:  boolean;
  animDelay?:   number;   // ms, for staggered entrance
}

const ROLE_META = {
  Economist:  { icon: "💼", label: "ECONOMIST",  description: "Treasury & growth" },
  Strategist: { icon: "⚔",  label: "STRATEGIST", description: "Power & security"  },
};

export function MinisterProposalCard({ role, proposal, state, nationName, isFallback, animDelay = 0 }: Props) {
  const accent = NATION_COLOUR[nationName] ?? "#64748b";
  const meta   = ROLE_META[role];

  const isSelected = state === "selected";
  const isRejected = state === "rejected";

  return (
    <div
      className="relative rounded-xl border overflow-hidden transition-all duration-500 slide-in"
      style={{
        animationDelay:   `${animDelay}ms`,
        borderColor:      isSelected ? accent : isRejected ? "rgba(255,255,255,0.05)" : "var(--border)",
        background:       isSelected
          ? `linear-gradient(135deg, rgba(${hexToRgb(accent)},0.1) 0%, var(--surface) 100%)`
          : isRejected
          ? "rgba(10,22,40,0.4)"
          : "var(--surface)",
        opacity:          isRejected ? 0.55 : 1,
        boxShadow:        isSelected ? `0 0 20px rgba(${hexToRgb(accent)},0.15)` : "none",
        filter:           isRejected ? "grayscale(0.3)" : "none",
      }}
    >
      {/* Top accent bar when selected */}
      {isSelected && (
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
             style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">{meta.icon}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="mono text-[10px] font-bold tracking-widest"
                      style={{ color: "var(--text-secondary)" }}>
                  {meta.label}
                </span>
                {isFallback && (
                  <span className="mono text-[8px] px-1 py-0.5 rounded"
                        style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
                    FALLBACK
                  </span>
                )}
              </div>
              <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                {meta.description}
              </div>
            </div>
          </div>

          {/* Status chip */}
          {isSelected && (
            <span className="mono text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `rgba(${hexToRgb(accent)},0.2)`, color: accent }}>
              SELECTED
            </span>
          )}
        </div>

        {/* Proposed action */}
        <div className="mb-3">
          <ActionBadge action={proposal.action} size="sm" />
          {proposal.targetNationName && (
            <div className="mt-1.5 mono text-[10px]" style={{ color: "var(--text-muted)" }}>
              → targeting <span style={{ color: "var(--text-secondary)" }}>{proposal.targetNationName}</span>
            </div>
          )}
        </div>

        {/* Reasoning — full, untruncated */}
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          "{proposal.reasoning}"
        </p>
      </div>

      {/* OVERRULED stamp — rendered on top when rejected */}
      {isRejected && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className="mono font-black text-lg tracking-widest px-3 py-1 rounded border-2 stamp-in"
            style={{
              color:       "rgba(248,113,113,0.7)",
              borderColor: "rgba(248,113,113,0.5)",
              background:  "rgba(5,13,26,0.6)",
              transform:   "rotate(-12deg)",
            }}
          >
            OVERRULED
          </span>
        </div>
      )}
    </div>
  );
}

// Utility: convert #rrggbb to "r,g,b"
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}