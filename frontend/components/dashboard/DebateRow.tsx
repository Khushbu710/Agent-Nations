"use client";
// components/dashboard/DebateRow.tsx

import { ActionBadge } from "@/components/ui/ActionBadge";
import { NATION_COLOUR, BASESCAN_TX } from "@/lib/constants";
import type { NationCycleEntry }      from "@/lib/types";

interface Props {
  entry:       NationCycleEntry;
  cycleNumber: number;
}

export function DebateRow({ entry, cycleNumber }: Props) {
  const accent = NATION_COLOUR[entry.nationName] ?? "#64748b";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2.5"
         style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
      {/* Cycle + nation */}
      <span className="font-mono text-[11px] tabular-nums"
            style={{ color: "rgba(255,255,255,0.3)", minWidth: "3ch" }}>
        #{cycleNumber}
      </span>
      <span className="text-xs font-medium" style={{ color: accent }}>
        {entry.nationName}
      </span>

      {/* Winning minister */}
      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
        {entry.decision.selectedMinister}
      </span>

      {/* Action */}
      <ActionBadge action={entry.decision.chosenAction} size="sm" />

      {/* Fallback warning */}
      {(entry.economistFallback || entry.strategistFallback || entry.governorFallback) && (
        <span className="text-[10px] text-amber-400">⚠ fallback</span>
      )}

      {/* Tx link */}
      {entry.txHash && (
        <a
          href={BASESCAN_TX(entry.txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto font-mono text-[10px] transition-opacity hover:opacity-80"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          {entry.txHash.slice(0, 8)}… ↗
        </a>
      )}
    </div>
  );
}