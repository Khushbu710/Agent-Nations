"use client";
// NationDebateColumn — one nation's full deliberation: 2 minister cards + governor card.

import { MinisterProposalCard } from "@/components/debate/MinisterProposalCard";
import { GovernorVerdictCard }  from "@/components/debate/GovernorVerdictCard";
import { NATION_COLOUR, NATION_ICON } from "@/lib/constants";
import type { NationCycleEntry } from "@/lib/types";

interface Props {
  entry:       NationCycleEntry;
  columnIndex: number;   // 0,1,2 — used to stagger column entrance
}

export function NationDebateColumn({ entry, columnIndex }: Props) {
  const accent = NATION_COLOUR[entry.nationName] ?? "#64748b";
  const icon   = NATION_ICON[entry.nationName]   ?? "◈";
  const colDelay = columnIndex * 80;

  // Determine which minister was selected/rejected
  const econState = entry.decision.selectedMinister === "Economist" ? "selected" : "rejected";
  const stratState = entry.decision.selectedMinister === "Strategist" ? "selected" : "rejected";

  return (
    <div
      className="flex flex-col gap-3 fade-up"
      style={{ animationDelay: `${colDelay}ms` }}
    >
      {/* Nation header */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 border"
        style={{
          borderColor: `${accent}44`,
          background:  `rgba(${hexToRgb(accent)},0.08)`,
        }}
      >
        <span className="text-base">{icon}</span>
        <div>
          <div className="text-sm font-bold" style={{ color: accent }}>
            {entry.nationName}
          </div>
          <div className="mono text-[9px]" style={{ color: "var(--text-muted)" }}>
            CYCLE DEBATE
          </div>
        </div>
      </div>

      {/* Connector line */}
      <div className="mx-auto w-px h-3 rounded-full"
           style={{ background: `${accent}33` }} />

      {/* Economist proposal */}
      <MinisterProposalCard
        role="Economist"
        proposal={entry.economistProposal}
        state={econState}
        nationName={entry.nationName}
        isFallback={entry.economistFallback}
        animDelay={colDelay + 100}
      />

      {/* Connector */}
      <div className="mx-auto w-px h-3" style={{ background: `${accent}22` }} />

      {/* Strategist proposal */}
      <MinisterProposalCard
        role="Strategist"
        proposal={entry.strategistProposal}
        state={stratState}
        nationName={entry.nationName}
        isFallback={entry.strategistFallback}
        animDelay={colDelay + 200}
      />

      {/* Connector — thicker, brighter before governor */}
      <div className="mx-auto flex flex-col items-center gap-0.5">
        <div className="w-px h-2" style={{ background: `${accent}44` }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent, opacity: 0.6 }} />
        <div className="w-px h-2" style={{ background: `${accent}44` }} />
      </div>

      {/* Governor verdict */}
      <GovernorVerdictCard
        decision={entry.decision}
        nationName={entry.nationName}
        txHash={entry.txHash}
        txBlock={entry.txBlockNumber}
        txError={entry.txError}
        isFallback={entry.governorFallback}
        animDelay={colDelay + 320}
      />
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}