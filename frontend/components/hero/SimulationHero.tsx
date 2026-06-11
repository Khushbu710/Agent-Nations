"use client";
import { useState, useEffect }  from "react";
import { useSimulationStore }   from "@/store/simulationStore";
import { NationGlyph }          from "@/components/hero/NationGlyph";
import { LiveTicker }           from "@/components/hero/LiveTicker";
import { PulsingDot }           from "@/components/ui/PulsingDot";
import { api }                  from "@/lib/api";

function computeRank(nations: { treasury: number; techScore: number; militaryScore: number }[]): number[] {
  const scores = nations.map((n) => n.treasury + n.techScore * 2 + n.militaryScore);
  const sorted = [...scores].sort((a, b) => b - a);
  return scores.map((s) => sorted.indexOf(s) + 1);
}

export function SimulationHero() {
  const latest       = useSimulationStore((s) => s.latest);
  const isRunning    = useSimulationStore((s) => s.isRunning);
  const lastPolledAt = useSimulationStore((s) => s.lastPolledAt);
  const isTriggering = useSimulationStore((s) => s.isTriggering);
  const setIsTriggering = useSimulationStore((s) => s.setIsTriggering);
  const setError     = useSimulationStore((s) => s.setError);

  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [prevCycle, setPrevCycle]   = useState<number | null>(null);
  const [flashCount, setFlashCount] = useState(0);

  useEffect(() => {
    if (!lastPolledAt) return;
    const t = setInterval(() =>
      setSecondsAgo(Math.floor((Date.now() - lastPolledAt) / 1000)), 1_000);
    return () => clearInterval(t);
  }, [lastPolledAt]);

  useEffect(() => {
    const n = latest?.cycleNumber ?? null;
    if (n !== null && prevCycle !== null && n !== prevCycle) {
      setFlashCount((c) => c + 1);
    }
    setPrevCycle(n);
  }, [latest?.cycleNumber]);

  const handleTrigger = async () => {
    const key = process.env.NEXT_PUBLIC_ADMIN_API_KEY ?? "";
    if (!key) { setMsg("Set NEXT_PUBLIC_ADMIN_API_KEY"); setTimeout(() => setMsg(""), 4_000); return; }
    setIsTriggering(true); setMsg("");
    try {
      const r = await api.trigger(key);
      setMsg(r.accepted ? "✓ Cycle triggered — watching for results" : r.reason ?? "Not accepted");
    } catch (e) {
      const m = e instanceof Error ? e.message : "Failed";
      setError(m); setMsg(m);
    } finally {
      setIsTriggering(false); setTimeout(() => setMsg(""), 6_000);
    }
  };

  const nations = latest?.worldStatePre.nations;
  const ranks   = nations ? computeRank(nations) : [1, 2, 3];
  const cycleNum = latest?.cycleNumber ?? null;

  const isFlashing = flashCount > 0 && flashCount < 4;

  return (
    <div className="flex flex-col gap-0">
      {/* ── Main hero bar ──────────────────────────────────────────────────── */}
      <div
        className="rounded-t-2xl border border-b-0 px-6 py-5 transition-all duration-700"
        style={{
          borderColor: isFlashing ? "rgba(56,189,248,0.4)" : "var(--border)",
          background:  isFlashing
            ? "linear-gradient(180deg, rgba(56,189,248,0.07) 0%, var(--surface) 100%)"
            : "var(--surface)",
          boxShadow:   isFlashing ? "0 0 60px rgba(56,189,248,0.1)" : "none",
        }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          {/* Left — identity + cycle */}
          <div className="flex items-center gap-5">
            {/* Cycle counter */}
            <div className="shrink-0">
              <div className="flex items-baseline gap-2">
                <span
                  key={cycleNum}   /* key forces re-mount = subtle flash on change */
                  className="mono font-black tabular-nums"
                  style={{ fontSize: "clamp(2rem,5vw,3.25rem)", lineHeight: 1, color: "var(--text-primary)" }}
                >
                  #{cycleNum ?? "—"}
                </span>
                <span className="mono text-[10px] font-bold tracking-widest"
                      style={{ color: "var(--text-muted)" }}>
                  CYCLE
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <PulsingDot
                  active={isRunning}
                  color={isRunning ? "#fbbf24" : "#22c55e"}
                />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {isRunning
                    ? "Ministers deliberating…"
                    : secondsAgo !== null
                    ? `Updated ${secondsAgo}s ago`
                    : "Connecting to backend…"}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:block h-14 w-px"
                 style={{ background: "var(--border)" }} />

            {/* Nation glyphs */}
            <div className="flex flex-wrap gap-2">
              {nations
                ? nations.map((n, i) => (
                    <NationGlyph
                      key={n.name}
                      nation={n}
                      entry={latest?.nations.find((e) => e.nationIndex === i)}
                      rank={ranks[i] ?? 1}
                    />
                  ))
                : [0, 1, 2].map((i) => (
                    <div key={i}
                         className="h-28 w-28 rounded-xl animate-pulse"
                         style={{ background: "var(--surface-2)" }} />
                  ))}
            </div>
          </div>

          {/* Right — trigger */}
          <div className="flex flex-col items-start gap-1.5 lg:items-end shrink-0">
            <button
              onClick={handleTrigger}
              disabled={isRunning || isTriggering}
              className="group relative rounded-xl overflow-hidden transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                padding: "10px 28px",
                background: isRunning || isTriggering
                  ? "rgba(255,255,255,0.06)"
                  : "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)",
                boxShadow: isRunning || isTriggering
                  ? "none"
                  : "0 0 28px rgba(37,99,235,0.45), 0 6px 20px rgba(0,0,0,0.5)",
                border: "1px solid rgba(59,130,246,0.3)",
                color: "#fff",
                fontSize: "0.875rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <span style={{ fontSize: "1rem" }}>
                  {isTriggering ? "⏳" : isRunning ? "⚙" : "▶"}
                </span>
                <span>
                  {isTriggering ? "Triggering…" : isRunning ? "Running…" : "Run Cycle"}
                </span>
              </span>
              {!isRunning && !isTriggering && (
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)" }}
                />
              )}
            </button>
            {msg && (
              <span className="text-[11px] max-w-[220px] text-right"
                    style={{ color: "var(--text-muted)" }}>
                {msg}
              </span>
            )}
            <span className="mono text-[9px]" style={{ color: "var(--text-muted)" }}>
              {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
                ? `Contract ${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS.slice(0,6)}…${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS.slice(-4)}`
                : "Base Sepolia Testnet"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Live ticker ────────────────────────────────────────────────────── */}
      <div className="rounded-b-2xl overflow-hidden border border-t-0"
           style={{ borderColor: "var(--border)" }}>
        <LiveTicker />
      </div>
    </div>
  );
}