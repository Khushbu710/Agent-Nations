"use client";
import { useSimulationStore } from "@/store/simulationStore";
import { NATION_COLOUR, NATION_ICON } from "@/lib/constants";
import type { NationState } from "@/lib/types";

type Axis = { key: keyof NationState; label: string; color: string };

const AXES: Axis[] = [
  { key: "techScore",      label: "Tech",     color: "#38bdf8" },
  { key: "treasury",       label: "Treasury", color: "#fbbf24" },
  { key: "militaryScore",  label: "Military", color: "#f87171" },
  { key: "diplomacyScore", label: "Diplomacy",color: "#34d399" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard() {
  const latest = useSimulationStore((s) => s.latest);
  const nations = latest?.worldStatePre.nations;

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="mono text-[10px] uppercase tracking-widest mb-4"
           style={{ color: "var(--text-muted)" }}>
        Leaderboard
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {AXES.map((axis) => {
          const ranked = nations
            ? [...nations]
                .sort((a, b) => (b[axis.key] as number) - (a[axis.key] as number))
                .map((n, rank) => ({ n, rank }))
            : [];

          return (
            <div key={axis.key} className="flex flex-col gap-2">
              {/* Axis header */}
              <div className="flex items-center gap-1.5 pb-1.5"
                   style={{ borderBottom: `1px solid ${axis.color}22` }}>
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: axis.color }} />
                <span className="mono text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: axis.color }}>
                  {axis.label}
                </span>
              </div>

              {/* Ranked nations */}
              {ranked.length === 0
                ? [0,1,2].map((i) => (
                    <div key={i} className="h-7 animate-pulse rounded"
                         style={{ background: "var(--surface-2)" }} />
                  ))
                : ranked.map(({ n, rank }) => {
                    const accent = NATION_COLOUR[n.name] ?? "#64748b";
                    const isFirst = rank === 0;
                    return (
                      <div
                        key={n.name}
                        className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
                        style={{
                          background: isFirst ? `rgba(${hexRgb(accent)},0.1)` : "transparent",
                          border: isFirst ? `1px solid ${accent}22` : "1px solid transparent",
                        }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs leading-none">{MEDALS[rank]}</span>
                          <span className="text-xs" style={{ color: accent }}>{NATION_ICON[n.name]}</span>
                          <span className="mono text-[10px] truncate"
                                style={{ color: isFirst ? "var(--text-primary)" : "var(--text-secondary)" }}>
                            {n.name.replace(" Nation", "")}
                          </span>
                        </div>
                        <span className="mono text-[11px] font-bold tabular-nums shrink-0"
                              style={{ color: isFirst ? axis.color : "var(--text-muted)" }}>
                          {(n[axis.key] as number).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function hexRgb(h: string) {
  return `${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)}`;
}