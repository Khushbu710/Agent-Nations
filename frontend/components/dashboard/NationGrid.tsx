"use client";
import { useSimulationStore } from "@/store/simulationStore";
import { NationStatCard }     from "@/components/stats/NationStatCard";
import type { WorldState }    from "@/lib/types";

export function NationGrid({ initial }: { initial?: WorldState | null }) {
  const latest    = useSimulationStore((s) => s.latest);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const world     = latest?.worldStatePre ?? initial;

  if (!world) return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[0,1,2].map((i) => (
        <div key={i} className="h-52 animate-pulse rounded-xl"
             style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
      ))}
    </div>
  );

  return (
    <div>
      <div className="mono text-[10px] uppercase tracking-widest mb-3"
           style={{ color: "var(--text-muted)" }}>
        Nation Status
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {world.nations.map((nation, i) => (
          <NationStatCard
            key={nation.name}
            nation={nation}
            entry={latest?.nations.find((e) => e.nationIndex === i)}
            isRunning={isRunning}
          />
        ))}
      </div>
    </div>
  );
}