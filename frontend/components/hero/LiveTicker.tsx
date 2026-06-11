"use client";
import { useSimulationStore } from "@/store/simulationStore";
import { ACTION_STYLE, NATION_COLOUR } from "@/lib/constants";
import type { CycleRecord } from "@/lib/types";

function cycleToEvents(record: CycleRecord): string[] {
  return record.nations.map((n) => {
    const style  = ACTION_STYLE[n.decision.chosenAction];
    const target = n.decision.targetNationName ? ` on ${n.decision.targetNationName}` : "";
    const ago    = Math.round((Date.now() - new Date(record.completedAt).getTime()) / 60000);
    return `${style.icon} ${n.nationName} — ${style.label}${target} · cycle #${record.cycleNumber} · ${ago}m ago`;
  });
}

export function LiveTicker() {
  const history = useSimulationStore((s) => s.history);
  const latest  = useSimulationStore((s) => s.latest);

  const source = history.length > 0 ? history.slice(0, 5) : latest ? [latest] : [];
  if (source.length === 0) return null;

  const events = source.flatMap(cycleToEvents);
  // Duplicate for seamless infinite scroll
  const items  = [...events, ...events];

  return (
    <div
      className="overflow-hidden"
      style={{
        borderTop:    "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        background:   "rgba(0,0,0,0.2)",
        padding:      "6px 0",
      }}
    >
      <div className="ticker-scroll flex gap-12 whitespace-nowrap" style={{ width: "max-content" }}>
        {items.map((event, i) => (
          <span key={i} className="mono text-[11px]" style={{ color: "var(--text-muted)" }}>
            {event}
          </span>
        ))}
      </div>
    </div>
  );
}