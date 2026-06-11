"use client";
import { useSimulationData }    from "@/hooks/useSimulationData";
import { SimulationHero }       from "@/components/hero/SimulationHero";
import { DebateArena }          from "@/components/debate/DebateArena";
import { NationGrid }           from "@/components/dashboard/NationGrid";
import { Leaderboard }          from "@/components/stats/Leaderboard";
import { SimulationTimeline }   from "@/components/stats/SimulationTimeline";
import type { WorldState }      from "@/lib/types";

export function DashboardShell({ initial }: { initial?: WorldState | null }) {
  useSimulationData();

  return (
    <div className="flex flex-col gap-8">

      {/* ── Hero: cycle counter + nation glyphs + trigger ── */}
      <SimulationHero />

      {/* ── Centerpiece: AI Debate ── */}
      <DebateArena />

      {/* ── Nation stats + Leaderboard ── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <NationGrid initial={initial} />
        </div>
        <div>
          <Leaderboard />
        </div>
      </div>

      {/* ── History timeline ── */}
      <SimulationTimeline />

    </div>
  );
}