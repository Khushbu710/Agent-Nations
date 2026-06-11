"use client";
import { StatBar }   from "@/components/ui/StatBar";
import { ActionBadge } from "@/components/ui/ActionBadge";
import { NATION_COLOUR, STAT_CONFIG } from "@/lib/constants";
import type { NationState, NationCycleEntry } from "@/lib/types";

interface Props {
  nation:     NationState;
  entry?:     NationCycleEntry;
  isRunning?: boolean;
}

export function NationCard({ nation, entry, isRunning }: Props) {
  const accent = NATION_COLOUR[nation.name] ?? "#64748b";
  const r = parseInt(accent.slice(1,3),16);
  const g = parseInt(accent.slice(3,5),16);
  const b = parseInt(accent.slice(5,7),16);

  return (
    <div
      className="rounded-xl border p-4 transition-all duration-500"
      style={{
        borderColor: isRunning ? accent : "var(--border)",
        background:  `linear-gradient(160deg, rgba(${r},${g},${b},0.08) 0%, var(--surface) 100%)`,
        boxShadow:   isRunning ? `0 0 24px rgba(${r},${g},${b},0.18)` : "none",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-bold text-sm" style={{ color: accent }}>{nation.name}</div>
          {entry && (
            <div className="mono text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {entry.decision.selectedMinister} minister prevailed
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="mono text-xl font-black tabular-nums" style={{ color: "var(--text-primary)" }}>
            {nation.treasury.toLocaleString()}
          </div>
          <div className="mono text-[9px]" style={{ color: "var(--text-muted)" }}>TREASURY</div>
        </div>
      </div>

      {/* Stat bars */}
      <div className="flex flex-col gap-1.5 mb-3">
        {STAT_CONFIG.map((s) => (
          <StatBar key={s.key} label={s.label} value={nation[s.key]} max={s.max} color={s.color} />
        ))}
      </div>

      {/* Last action */}
      <div className="flex items-center justify-between pt-2.5"
           style={{ borderTop: "1px solid var(--border)" }}>
        <span className="mono text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Last action
        </span>
        <ActionBadge action={nation.lastAction} size="xs" />
      </div>
    </div>
  );
}
