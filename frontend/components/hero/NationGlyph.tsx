"use client";
import { NATION_COLOUR, NATION_ICON, ACTION_STYLE } from "@/lib/constants";
import type { NationState, NationCycleEntry } from "@/lib/types";

interface Props {
  nation:  NationState;
  entry?:  NationCycleEntry;
  rank:    number;   // 1 = leading by combined score
}

function derivePosture(entry?: NationCycleEntry): { label: string; color: string } {
  if (!entry) return { label: "IDLE", color: "rgba(150,180,220,0.4)" };
  const action = entry.decision.chosenAction;
  if (action === "LAUNCH_ESPIONAGE" || action === "BUILD_MILITARY")
    return { label: "AGGRESSIVE", color: "#f87171" };
  if (action === "FORM_ALLIANCE")
    return { label: "DIPLOMATIC", color: "#34d399" };
  if (action === "INVEST_IN_TECH")
    return { label: "EXPANDING",  color: "#38bdf8" };
  return { label: "NEUTRAL", color: "rgba(150,180,220,0.5)" };
}

// Dominant stat per nation identity
const DOMINANT: Record<string, keyof NationState> = {
  "Tech Nation":     "techScore",
  "Trade Nation":    "treasury",
  "Military Nation": "militaryScore",
};

export function NationGlyph({ nation, entry, rank }: Props) {
  const accent  = NATION_COLOUR[nation.name] ?? "#64748b";
  const icon    = NATION_ICON[nation.name] ?? "◈";
  const posture = derivePosture(entry);
  const domKey  = DOMINANT[nation.name] ?? "treasury";
  const domVal  = nation[domKey] as number;
  const shortName = nation.name.replace(" Nation", "").toUpperCase();

  const r = parseInt(accent.slice(1,3),16);
  const g = parseInt(accent.slice(3,5),16);
  const b = parseInt(accent.slice(5,7),16);

  return (
    <div
      className="relative flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 min-w-[108px] transition-all duration-300 cursor-default"
      style={{
        background:  `linear-gradient(160deg, rgba(${r},${g},${b},0.14) 0%, rgba(${r},${g},${b},0.04) 100%)`,
        border:      `1px solid rgba(${r},${g},${b},0.3)`,
        boxShadow:   `0 0 20px rgba(${r},${g},${b},0.12)`,
      }}
    >
      {/* Rank badge */}
      {rank === 1 && (
        <span className="absolute -top-1.5 -right-1.5 text-[10px] mono font-black px-1.5 py-0.5 rounded-full"
              style={{ background: "#fbbf24", color: "#0a0e1a" }}>
          #1
        </span>
      )}

      {/* Icon */}
      <span className="text-2xl leading-none">{icon}</span>

      {/* Nation short name */}
      <span className="mono text-[10px] font-bold tracking-widest" style={{ color: accent }}>
        {shortName}
      </span>

      {/* Dominant stat value */}
      <span className="mono text-lg font-black tabular-nums leading-none"
            style={{ color: "var(--text-primary)" }}>
        {typeof domVal === "number" ? domVal.toLocaleString() : domVal}
      </span>
      <span className="mono text-[8px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {domKey === "treasury" ? "treasury" :
         domKey === "techScore" ? "tech" : "military"}
      </span>

      {/* Posture */}
      <span
        className="mono text-[8px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: `${posture.color}18`, color: posture.color, border: `1px solid ${posture.color}33` }}
      >
        {posture.label}
      </span>

      {/* Last action */}
      {entry && (
        <span className="text-[11px]">
          {ACTION_STYLE[entry.decision.chosenAction].icon}
        </span>
      )}
    </div>
  );
}