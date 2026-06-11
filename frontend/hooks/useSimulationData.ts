"use client";
import { useEffect, useRef } from "react";
import { api }                from "@/lib/api";
import { useSimulationStore } from "@/store/simulationStore";

const POLL_INTERVAL_MS   = 5_000;
const HISTORY_POLL_EVERY = 4;   // fetch history every 4th poll (every 20s)

export function useSimulationData(): void {
  const setLatest       = useSimulationStore((s) => s.setLatest);
  const setHistory      = useSimulationStore((s) => s.setHistory);
  const setIsRunning    = useSimulationStore((s) => s.setIsRunning);
  const setLastPolledAt = useSimulationStore((s) => s.setLastPolledAt);
  const setError        = useSimulationStore((s) => s.setError);

  const latestCycleRef  = useRef<number>(-1);
  const pollCountRef    = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        pollCountRef.current += 1;
        const fetchHistory = pollCountRef.current === 1 ||
                             pollCountRef.current % HISTORY_POLL_EVERY === 0;

        const requests: [
          ReturnType<typeof api.getLatest>,
          ReturnType<typeof api.getHealth>,
          ReturnType<typeof api.getHistory> | Promise<null>
        ] = [
          api.getLatest(),
          api.getHealth(),
          fetchHistory ? api.getHistory(20) : Promise.resolve(null),
        ];

        const [record, health, historyData] = await Promise.all(requests);
        if (cancelled) return;

        setLastPolledAt(Date.now());
        if (health) setIsRunning(health.isRunning);

        if (record && record.cycleNumber !== latestCycleRef.current) {
          latestCycleRef.current = record.cycleNumber;
          setLatest(record);
          setError(null);
        }

        if (historyData && Array.isArray(historyData)) {
          setHistory(historyData);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Poll failed");
      }
    };

    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [setLatest, setHistory, setIsRunning, setLastPolledAt, setError]);
}