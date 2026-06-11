"use client";
import { useSimulationStore }    from "@/store/simulationStore";
import { NationDebateColumn }    from "@/components/debate/NationDebateColumn";
import { PulsingDot }            from "@/components/ui/PulsingDot";
import type { CycleRecord }      from "@/lib/types";

export function DebateArena() {
  const latest       = useSimulationStore((s) => s.latest);
  const viewingCycle = useSimulationStore((s) => s.viewingCycle);
  const isRunning    = useSimulationStore((s) => s.isRunning);
  const setViewing   = useSimulationStore((s) => s.setViewingCycle);

  // Which cycle to render: timeline selection > latest
  const displaying = viewingCycle ?? latest;
  const isLive     = displaying?.cycleNumber === latest?.cycleNumber;
  const isHistoric = displaying !== null && !isLive;

  // ── Running ────────────────────────────────────────────────────────────────
  if (isRunning && !displaying) {
    return (
      <section>
        <ArenaHeader cycleNumber={null} isRunning />
        <SkeletonGrid />
      </section>
    );
  }

  // ── No data ────────────────────────────────────────────────────────────────
  if (!displaying) {
    return (
      <section>
        <ArenaHeader cycleNumber={null} isRunning={false} />
        <EmptyState />
      </section>
    );
  }

  // ── Full debate ────────────────────────────────────────────────────────────
  const sorted = [...displaying.nations].sort((a, b) => a.nationIndex - b.nationIndex);

  return (
    <section>
      <ArenaHeader
        cycleNumber={displaying.cycleNumber}
        isRunning={isRunning && isLive}
        completedAt={displaying.completedAt}
        isHistoric={isHistoric}
        onDismissHistoric={isHistoric ? () => setViewing(latest) : undefined}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        {sorted.map((entry, i) => (
          <NationDebateColumn key={entry.nationName} entry={entry} columnIndex={i} />
        ))}
      </div>
    </section>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ArenaHeader({
  cycleNumber, isRunning, completedAt, isHistoric, onDismissHistoric
}: {
  cycleNumber:        number | null;
  isRunning:          boolean;
  completedAt?:       string;
  isHistoric?:        boolean;
  onDismissHistoric?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest"
            style={{ color: "var(--text-secondary)" }}>
          AI Debate
        </h2>
        {cycleNumber !== null && (
          <span className="mono text-xs px-2 py-0.5 rounded"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
            cycle #{cycleNumber}
          </span>
        )}
        {isRunning && (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "#fbbf24" }}>
            <PulsingDot active color="#fbbf24" />
            Ministers deliberating…
          </span>
        )}
        {isHistoric && (
          <span className="mono text-[10px] px-2 py-0.5 rounded"
                style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>
            HISTORY REPLAY
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {completedAt && (
          <span className="mono text-[10px]" style={{ color: "var(--text-muted)" }}>
            {new Date(completedAt).toLocaleTimeString()}
          </span>
        )}
        {onDismissHistoric && (
          <button
            onClick={onDismissHistoric}
            className="mono text-[10px] px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
            style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
          >
            ← back to latest
          </button>
        )}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
      {[0,1,2].map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="h-10 rounded-lg animate-pulse" style={{ background: "var(--surface-2)" }} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={5} tall />
        </div>
      ))}
    </div>
  );
}

function SkeletonCard({ lines, tall }: { lines: number; tall?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${tall ? "min-h-56" : "min-h-32"} animate-pulse`}
         style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="flex gap-2 mb-3">
        <div className="h-4 w-4 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="h-4 w-24 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
      <div className="h-6 w-32 rounded mb-3" style={{ background: "rgba(255,255,255,0.06)" }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-2.5 rounded mb-2"
             style={{ background: "rgba(255,255,255,0.04)", width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border flex flex-col items-center justify-center py-20 mt-5"
         style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="text-4xl mb-4 opacity-20">⚡</div>
      <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
        No cycles completed yet
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Trigger a cycle to watch the nations deliberate
      </p>
    </div>
  );
}