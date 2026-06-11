"use client";
import { useSimulationStore } from "@/store/simulationStore";
import { Sparkline }          from "@/components/ui/Sparkline";
import { ActionBadge }        from "@/components/ui/ActionBadge";
import { NATION_COLOUR, NATION_ICON, STAT_CONFIG } from "@/lib/constants";
import type { NationState, NationCycleEntry, CycleRecord } from "@/lib/types";

interface Props {
  nation:  NationState;
  entry?:  NationCycleEntry;
  isRunning?: boolean;
}

// Extract last N values of a stat from history
function getSparklineData(
  history: CycleRecord[],
  nationName: string,
  key: keyof NationState,
  limit = 6,
): number[] {
  const slice = history.slice(0, limit).reverse();
  return slice
    .map((r) => {
      const n = r.worldStatePre.nations.find((n) => n.name === nationName);
      return n ? (n[key] as number) : null;
    })
    .filter((v): v is number => v !== null);
}

function derivePosture(entry?: NationCycleEntry): { label: string; color: string } {
  if (!entry) return { label: "IDLE", color: "rgba(150,180,220,0.35)" };
  const a = entry.decision.chosenAction;
  if (a === "LAUNCH_ESPIONAGE" || a === "BUILD_MILITARY")
    return { label: "AGGRESSIVE", color: "#f87171" };
  if (a === "FORM_ALLIANCE")
    return { label: "DIPLOMATIC", color: "#34d399" };
  if (a === "INVEST_IN_TECH")
    return { label: "EXPANDING",  color: "#38bdf8" };
  return { label: "NEUTRAL", color: "rgba(150,180,220,0.4)" };
}

export function NationStatCard({ nation, entry, isRunning }: Props) {
  const history = useSimulationStore((s) => s.history);
  const accent  = NATION_COLOUR[nation.name] ?? "#64748b";
  const icon    = NATION_ICON[nation.name] ?? "◈";
  const posture = derivePosture(entry);

  const r = parseInt(accent.slice(1,3),16);
  const g = parseInt(accent.slice(3,5),16);
  const b = parseInt(accent.slice(5,7),16);
  const rgb = `${r},${g},${b}`;

  return (
    <div
      className="rounded-xl border p-4 transition-all duration-500"
      style={{
        borderColor: isRunning ? accent : "var(--border)",
        background:  `linear-gradient(160deg, rgba(${rgb},0.09) 0%, var(--surface) 100%)`,
        boxShadow:   isRunning ? `0 0 24px rgba(${rgb},0.2)` : "none",
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div>
            <div className="font-bold text-sm" style={{ color: accent }}>{nation.name}</div>
            <span
              className="mono text-[8px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: `${posture.color}18`, color: posture.color }}
            >
              {posture.label}
            </span>
          </div>
        </div>
        {/* Treasury — big number */}
        <div className="text-right">
          <div className="mono text-2xl font-black tabular-nums leading-none"
               style={{ color: "var(--text-primary)" }}>
            {nation.treasury.toLocaleString()}
          </div>
          <div className="mono text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            TREASURY
          </div>
          {/* Treasury sparkline */}
          {history.length > 1 && (
            <div className="flex justify-end mt-1">
              <Sparkline
                values={getSparklineData(history, nation.name, "treasury")}
                color="#fbbf24"
                width={56}
                height={16}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Score rows with sparklines ── */}
      <div className="flex flex-col gap-2 py-3"
           style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        {STAT_CONFIG.map((s) => {
          const val      = nation[s.key];
          const sparkData = getSparklineData(history, nation.name, s.key);
          const delta    = sparkData.length >= 2
            ? sparkData[sparkData.length - 1]! - sparkData[sparkData.length - 2]!
            : 0;
          const pct = Math.min(100, Math.round((val / s.max) * 100));

          return (
            <div key={s.key} className="flex items-center gap-2">
              {/* Label */}
              <span className="mono text-[9px] w-14 shrink-0 text-right"
                    style={{ color: "var(--text-muted)" }}>
                {s.label.toUpperCase()}
              </span>

              {/* Bar */}
              <div className="flex-1 h-1 rounded-full"
                   style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                     style={{
                       width: `${pct}%`,
                       background: s.color,
                       boxShadow: `0 0 6px ${s.color}44`,
                     }} />
              </div>

              {/* Value + delta */}
              <div className="flex items-center gap-1 w-16 justify-end shrink-0">
                <span className="mono text-[11px] tabular-nums"
                      style={{ color: "var(--text-secondary)" }}>
                  {val}
                </span>
                {delta !== 0 && (
                  <span className="mono text-[9px] font-bold tabular-nums"
                        style={{ color: delta > 0 ? "#34d399" : "#f87171" }}>
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                )}
              </div>

              {/* Sparkline */}
              {sparkData.length > 1 && (
                <Sparkline values={sparkData} color={s.color} width={40} height={14} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between mt-3">
        <div>
          <div className="mono text-[8px] mb-1" style={{ color: "var(--text-muted)" }}>
            LAST ACTION
          </div>
          <ActionBadge action={nation.lastAction} size="xs" />
        </div>
        {entry && (
          <div className="text-right">
            <div className="mono text-[8px] mb-1" style={{ color: "var(--text-muted)" }}>
              MINISTER
            </div>
            <span className="mono text-[10px] font-bold"
                  style={{ color: accent }}>
              {entry.decision.selectedMinister}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}