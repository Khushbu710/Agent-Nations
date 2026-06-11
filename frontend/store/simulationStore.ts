"use client";
import { create } from "zustand";
import type { CycleRecord } from "@/lib/types";

interface SimulationState {
  latest:          CycleRecord | null;
  history:         CycleRecord[];          // newest-first, from /api/history
  viewingCycle:    CycleRecord | null;     // which cycle the debate arena shows
  isRunning:       boolean;
  lastPolledAt:    number | null;
  isTriggering:    boolean;
  error:           string | null;

  setLatest:       (record: CycleRecord)   => void;
  setHistory:      (records: CycleRecord[]) => void;
  setViewingCycle: (record: CycleRecord | null) => void;
  setIsRunning:    (v: boolean)            => void;
  setLastPolledAt: (ts: number)            => void;
  setIsTriggering: (v: boolean)            => void;
  setError:        (msg: string | null)    => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  latest:          null,
  history:         [],
  viewingCycle:    null,
  isRunning:       false,
  lastPolledAt:    null,
  isTriggering:    false,
  error:           null,

  setLatest:       (record)  => set({ latest: record, viewingCycle: record, error: null }),
  setHistory:      (records) => set({ history: records }),
  setViewingCycle: (record)  => set({ viewingCycle: record }),
  setIsRunning:    (v)       => set({ isRunning: v }),
  setLastPolledAt: (ts)      => set({ lastPolledAt: ts }),
  setIsTriggering: (v)       => set({ isTriggering: v }),
  setError:        (msg)     => set({ error: msg }),
}));