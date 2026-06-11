"use client";
import { useSimulationStore } from "@/store/simulationStore";
import { ACTION_STYLE, NATION_COLOUR, BASESCAN_TX } from "@/lib/constants";
import type { CycleRecord } from "@/lib/types";

// Pick a representative colour for a cycle based on the most "dramatic" action
function cycleAccent(record: CycleRecord): string {
  const actions = record.nations.map((n) => n.decision.chosenAction);
  if (actions.includes("LAUNCH_ESPIONAGE")) return "#a78bfa";
  if (actions.includes("BUILD_MILITARY"))   return "#f87171";
  if (actions.includes("FORM_ALLIANCE"))    return "#34d399";
  if (actions.includes("INVEST_IN_TECH"))   return "#38bdf8";
  return "#fbbf24";
}

function CycleNode({ record, isActive, onClick }: {
  record:   CycleRecord;
  isActive: boolean;
  onClick:  () => void;
}) {
  const accent = cycleAccent(record);
  const time   = new Date(record.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group shrink-0 transition-all duration-200"
    >
      {/* Node circle */}
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200"
        style={{
          background:  isActive ? accent : `rgba(${hexRgb(accent)},0.15)`,
          border:      `2px solid ${isActive ? accent : `${accent}44`}`,
          boxShadow:   isActive ? `0 0 16px ${accent}55` : "none",
          color:       isActive ? "#000" : accent,
        }}
      >
        <span className="mono text-[10px] font-black">
          {record.cycleNumber}
        </span>
      </div>

      {/* Time label */}
      <span className="mono text-[9px] group-hover:opacity-80 transition-opacity"
            style={{ color: isActive ? "var(--text-secondary)" : "var(--text-muted)" }}>
        {time}
      </span>

      {/* Action icons for this cycle */}
      <div className="flex gap-0.5">
        {record.nations.map((n) => (
          <span key={n.nationIndex} className="text-[9px]">
            {ACTION_STYLE[n.decision.chosenAction].icon}
          </span>
        ))}
      </div>
    </button>
  );
}

function CycleDetailPanel({ record }: { record: CycleRecord }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "rgba(0,0,0,0.2)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="mono text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}>
          Cycle #{record.cycleNumber} · {new Date(record.completedAt).toLocaleString()}
        </span>
        {record.advanceTxHash && (
          <a
            href={BASESCAN_TX(record.advanceTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="mono text-[9px] hover:opacity-80 transition-opacity"
            style={{ color: "rgba(52,211,153,0.5)" }}
          >
            advanceCycle ↗
          </a>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {record.nations.map((entry) => {
          const accent    = NATION_COLOUR[entry.nationName] ?? "#64748b";
          const actionSty = ACTION_STYLE[entry.decision.chosenAction];
          const target    = entry.decision.targetNationName
            ? ` → ${entry.decision.targetNationName}` : "";

          return (
            <div
              key={entry.nationIndex}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5"
              style={{ background: `rgba(${hexRgb(accent)},0.06)`, border: `1px solid ${accent}18` }}
            >
              {/* Nation + minister */}
              <div className="shrink-0 min-w-[100px]">
                <div className="text-xs font-bold" style={{ color: accent }}>
                  {entry.nationName}
                </div>
                <div className="mono text-[9px]" style={{ color: "var(--text-muted)" }}>
                  {entry.decision.selectedMinister} minister
                </div>
              </div>

              {/* Action */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="text-xs">{actionSty.icon}</span>
                  <span className="mono text-[10px] font-bold"
                        style={{ color: actionSty.text }}>
                    {actionSty.label}
                  </span>
                  {target && (
                    <span className="mono text-[9px]"
                          style={{ color: "var(--text-muted)" }}>
                      {target}
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-snug line-clamp-2"
                   style={{ color: "var(--text-secondary)" }}>
                  {entry.decision.reasoning}
                </p>
              </div>

              {/* Tx */}
              {entry.txHash && (
                <a
                  href={BASESCAN_TX(entry.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 mono text-[9px] hover:opacity-80 transition-opacity"
                  style={{ color: "rgba(52,211,153,0.5)" }}
                >
                  ✓ ↗
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SimulationTimeline() {
  const history      = useSimulationStore((s) => s.history);
  const latest       = useSimulationStore((s) => s.latest);
  const viewingCycle = useSimulationStore((s) => s.viewingCycle);
  const setViewing   = useSimulationStore((s) => s.setViewingCycle);

  // Merge latest into history for display (latest might not be in history yet)
  const displayHistory = history.length > 0 ? history : latest ? [latest] : [];
  // oldest→newest for the timeline scroll
  const timelineOrder  = [...displayHistory].reverse();

  if (displayHistory.length === 0) return null;

  return (
    <div
      className="rounded-xl border"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-0">
        <span className="mono text-[10px] uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}>
          Cycle Timeline
        </span>
        <span className="mono text-[9px]" style={{ color: "var(--text-muted)" }}>
          {displayHistory.length} cycles recorded
        </span>
      </div>

      {/* Timeline scroll */}
      <div className="px-4 pt-4 pb-3 overflow-x-auto">
        <div className="relative flex items-start gap-6 min-w-max pb-1">
          {/* Connecting line */}
          <div
            className="absolute top-4 left-4 right-4 h-px"
            style={{ background: "var(--border)" }}
          />
          {timelineOrder.map((record) => (
            <CycleNode
              key={record.cycleNumber}
              record={record}
              isActive={viewingCycle?.cycleNumber === record.cycleNumber}
              onClick={() => setViewing(
                viewingCycle?.cycleNumber === record.cycleNumber ? null : record
              )}
            />
          ))}
        </div>
      </div>

      {/* Cycle detail panel — shows on node click */}
      {viewingCycle && (
        <div className="px-4 pb-4">
          <CycleDetailPanel record={viewingCycle} />
        </div>
      )}
    </div>
  );
}

function hexRgb(h: string) {
  return `${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)}`;
}