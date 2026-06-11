"use client";
// components/dashboard/RecentActivity.tsx

import { useSimulationStore } from "@/store/simulationStore";
import { DebateRow }          from "@/components/dashboard/DebateRow";

export function RecentActivity() {
  const latest = useSimulationStore((s) => s.latest);
  const error  = useSimulationStore((s) => s.error);

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400">
        Backend unreachable: {error}
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="rounded-xl border border-white/5 px-4 py-5 text-center text-xs"
           style={{ color: "rgba(255,255,255,0.25)" }}>
        No cycles completed yet. Trigger one to begin.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.3)" }}>
          Cycle {latest.cycleNumber} — Nation Decisions
        </span>
        {latest.advanceTxHash && (
          <a
            href={`https://sepolia.basescan.org/tx/${latest.advanceTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] transition-opacity hover:opacity-80"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            advanceCycle ↗
          </a>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {latest.nations.map((entry) => (
          <DebateRow
            key={entry.nationIndex}
            entry={entry}
            cycleNumber={latest.cycleNumber}
          />
        ))}
      </div>

      {/* Timestamp */}
      <p className="mt-3 text-right text-[10px]"
         style={{ color: "rgba(255,255,255,0.18)" }}>
        Completed {new Date(latest.completedAt).toLocaleString()}
      </p>
    </div>
  );
}