"use client";
// GovernorVerdictCard — the dominant card showing the governor's final decision.

import { ActionBadge } from "@/components/ui/ActionBadge";
import { NATION_COLOUR, BASESCAN_TX } from "@/lib/constants";
import type { GovernorDecision } from "@/lib/types";

interface Props {
  decision:     GovernorDecision;
  nationName:   string;
  txHash:       string | null;
  txBlock:      number | null;
  txError:      string | null;
  isFallback?:  boolean;
  animDelay?:   number;
}

export function GovernorVerdictCard({
  decision, nationName, txHash, txBlock, txError, isFallback, animDelay = 0
}: Props) {
  const accent = NATION_COLOUR[nationName] ?? "#64748b";
  const r = parseInt(accent.slice(1,3),16);
  const g = parseInt(accent.slice(3,5),16);
  const b = parseInt(accent.slice(5,7),16);
  const rgb = `${r},${g},${b}`;

  const losingMinister = decision.selectedMinister === "Economist" ? "Strategist" : "Economist";

  return (
    <div
      className="relative rounded-xl border overflow-hidden slide-in"
      style={{
        animationDelay: `${animDelay}ms`,
        borderColor:    accent,
        background:     `linear-gradient(160deg, rgba(${rgb},0.14) 0%, rgba(${rgb},0.04) 50%, var(--surface) 100%)`,
        boxShadow:      `0 0 32px rgba(${rgb},0.2), inset 0 1px 0 rgba(${rgb},0.3)`,
      }}
    >
      {/* Glow bar */}
      <div className="absolute top-0 left-0 right-0 h-px"
           style={{ background: `linear-gradient(90deg, transparent 0%, ${accent} 50%, transparent 100%)` }} />

      <div className="p-5">
        {/* Governor label */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">👑</span>
            <div>
              <div className="mono text-[10px] font-bold tracking-widest"
                   style={{ color: accent }}>
                GOVERNOR&apos;S DECREE
              </div>
              <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                Followed {decision.selectedMinister}&apos;s counsel
              </div>
            </div>
          </div>
          {isFallback && (
            <span className="mono text-[8px] px-2 py-0.5 rounded"
                  style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
              FALLBACK
            </span>
          )}
        </div>

        {/* Chosen action — headline */}
        <div className="mb-4">
          <ActionBadge action={decision.chosenAction} size="lg" />
          {decision.targetNationName && (
            <div className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              Target: <span style={{ color: accent, fontWeight: 600 }}>{decision.targetNationName}</span>
            </div>
          )}
        </div>

        {/* Reasoning — the AI's voice */}
        <div className="mb-4 rounded-lg p-3"
             style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="mono text-[9px] mb-1.5 uppercase tracking-widest"
               style={{ color: "var(--text-muted)" }}>
            Reasoning
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {decision.reasoning}
          </p>
        </div>

        {/* Rejection section */}
        <div className="rounded-lg p-3 mb-4"
             style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.1)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs">✗</span>
            <span className="mono text-[9px] uppercase tracking-widest"
                  style={{ color: "rgba(248,113,113,0.7)" }}>
              {losingMinister} overruled
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "rgba(248,113,113,0.6)" }}>
            {decision.rejectionReason}
          </p>
        </div>

        {/* On-chain proof */}
        {txHash && (
          <a
            href={BASESCAN_TX(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 group transition-all duration-200"
            style={{
              background:   "rgba(52,211,153,0.08)",
              border:       "1px solid rgba(52,211,153,0.18)",
            }}
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="mono text-[9px] font-bold uppercase tracking-widest"
                   style={{ color: "#34d399" }}>
                ✓ confirmed on base sepolia
                {txBlock && <span className="ml-1.5 opacity-60">block #{txBlock.toLocaleString()}</span>}
              </div>
              <div className="mono text-[10px] truncate mt-0.5 group-hover:opacity-80 transition-opacity"
                   style={{ color: "rgba(52,211,153,0.5)" }}>
                {txHash}
              </div>
            </div>
            <span style={{ color: "rgba(52,211,153,0.5)" }} className="text-xs group-hover:translate-x-0.5 transition-transform">
              ↗
            </span>
          </a>
        )}

        {txError && !txHash && (
          <div className="rounded-lg px-3 py-2 mono text-[10px]"
               style={{ background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
            ✗ Transaction failed: {txError.slice(0, 80)}
          </div>
        )}

        {!txHash && !txError && (
          <div className="rounded-lg px-3 py-2 mono text-[10px]"
               style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            ○ Awaiting confirmation…
          </div>
        )}
      </div>
    </div>
  );
}