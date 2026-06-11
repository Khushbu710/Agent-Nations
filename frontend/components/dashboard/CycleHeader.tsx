"use client";
import { useState, useEffect }  from "react";
import { useSimulationStore }   from "@/store/simulationStore";
import { PulsingDot }           from "@/components/ui/PulsingDot";
import { api }                  from "@/lib/api";
import { NATION_COLOUR, NATION_ICON } from "@/lib/constants";

export function CycleHeader() {
  const latest       = useSimulationStore((s) => s.latest);
  const isRunning    = useSimulationStore((s) => s.isRunning);
  const lastPolledAt = useSimulationStore((s) => s.lastPolledAt);
  const isTriggering = useSimulationStore((s) => s.isTriggering);
  const setIsTriggering = useSimulationStore((s) => s.setIsTriggering);
  const setError     = useSimulationStore((s) => s.setError);

  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [prevCycle, setPrevCycle] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);

  // "X s ago" ticker
  useEffect(() => {
    if (!lastPolledAt) return;
    const t = setInterval(() => setSecondsAgo(Math.floor((Date.now() - lastPolledAt) / 1000)), 1_000);
    return () => clearInterval(t);
  }, [lastPolledAt]);

  // Flash on new cycle
  useEffect(() => {
    const n = latest?.cycleNumber ?? null;
    if (n !== null && prevCycle !== null && n !== prevCycle) {
      setFlash(true);
      setTimeout(() => setFlash(false), 1_500);
    }
    setPrevCycle(n);
  }, [latest?.cycleNumber]);

  const handleTrigger = async () => {
    const key = process.env.NEXT_PUBLIC_ADMIN_API_KEY ?? "";
    if (!key) { setMsg("Set NEXT_PUBLIC_ADMIN_API_KEY"); setTimeout(() => setMsg(""), 4_000); return; }
    setIsTriggering(true); setMsg("");
    try {
      const r = await api.trigger(key);
      setMsg(r.accepted ? "✓ Cycle triggered" : r.reason ?? "Not accepted");
    } catch (e) {
      const m = e instanceof Error ? e.message : "Failed"; setError(m); setMsg(m);
    } finally {
      setIsTriggering(false); setTimeout(() => setMsg(""), 5_000);
    }
  };

  const cycleNum = latest?.cycleNumber ?? "—";
  const nations  = latest?.worldStatePre.nations;

  return (
    <header
      className="rounded-xl border px-6 py-5 transition-all duration-700"
      style={{
        borderColor: flash ? "rgba(56,189,248,0.5)" : "var(--border)",
        background:  flash ? "rgba(56,189,248,0.06)" : "var(--surface)",
        boxShadow:   flash ? "0 0 40px rgba(56,189,248,0.12)" : "none",
      }}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left — cycle number */}
        <div className="flex items-center gap-5">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="mono font-black tabular-nums"
                    style={{ fontSize: "3rem", lineHeight: 1, color: "var(--text-primary)" }}>
                #{cycleNum}
              </span>
              <span className="mono text-xs font-bold tracking-widest"
                    style={{ color: "var(--text-muted)" }}>
                CYCLE
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <PulsingDot active={isRunning} color={isRunning ? "#fbbf24" : "#22c55e"} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {isRunning ? "Deliberating on-chain…" :
                 secondsAgo !== null ? `Updated ${secondsAgo}s ago` : "Connecting…"}
              </span>
            </div>
          </div>

          {/* Nation glyphs */}
          {nations && (
            <div className="hidden sm:flex items-center gap-2">
              {nations.map((n) => {
                const accent = NATION_COLOUR[n.name] ?? "#64748b";
                return (
                  <div key={n.name}
                       className="rounded-lg px-3 py-2 border text-center"
                       style={{ borderColor: `${accent}33`, background: `rgba(${hexRgb(accent)},0.07)` }}>
                    <div className="text-base">{NATION_ICON[n.name]}</div>
                    <div className="mono text-[9px] mt-0.5" style={{ color: accent }}>
                      {n.name.replace(" Nation","").toUpperCase()}
                    </div>
                    <div className="mono text-[10px] font-bold tabular-nums mt-0.5"
                         style={{ color: "var(--text-secondary)" }}>
                      t={n.treasury}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — trigger button */}
        <div className="flex flex-col items-start gap-1 sm:items-end shrink-0">
          <button
            onClick={handleTrigger}
            disabled={isRunning || isTriggering}
            className="group relative rounded-xl px-6 py-3 text-sm font-bold tracking-wide transition-all duration-200 overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background:  isRunning || isTriggering
                ? "rgba(255,255,255,0.05)"
                : "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
              color:       "#fff",
              boxShadow:   isRunning || isTriggering
                ? "none"
                : "0 0 20px rgba(37,99,235,0.4), 0 4px 12px rgba(0,0,0,0.4)",
            }}
          >
            <span className="relative z-10 flex items-center gap-2">
              <span>{isTriggering ? "⏳" : isRunning ? "⚙" : "▶"}</span>
              <span>{isTriggering ? "Triggering…" : isRunning ? "Running…" : "Run Cycle"}</span>
            </span>
            {/* Button shine effect */}
            {!isRunning && !isTriggering && (
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%)" }} />
            )}
          </button>
          {msg && (
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{msg}</span>
          )}
        </div>
      </div>
    </header>
  );
}

function hexRgb(h: string) {
  return `${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)}`;
}
