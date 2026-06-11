"use client";
interface Props { label: string; value: number; max?: number; color: string; delta?: number; }
export function StatBar({ label, value, max = 200, color, delta }: Props) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 shrink-0 text-right mono text-[10px]"
            style={{ color: "var(--text-muted)" }}>{label}</span>
      <div className="relative h-1 flex-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
             style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}44` }} />
      </div>
      <div className="flex items-center gap-1 w-14 justify-end">
        <span className="mono text-[11px] tabular-nums" style={{ color: "var(--text-secondary)" }}>{value}</span>
        {delta !== undefined && delta !== 0 && (
          <span className="mono text-[9px] font-bold tabular-nums"
                style={{ color: delta > 0 ? "#34d399" : "#f87171" }}>
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
    </div>
  );
}
