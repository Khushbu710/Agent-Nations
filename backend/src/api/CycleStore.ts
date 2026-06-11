// =============================================================================
// src/api/CycleStore.ts
// =============================================================================
// In-memory store that CycleRunner writes to and API routes read from.
//
// This is the only shared mutable state between the cycle orchestration layer
// and the HTTP layer. It is intentionally simple — no Supabase, no Redis.
// A ring buffer of the last 20 cycle results plus a live-state flag.
//
// CycleRunner imports { cycleStore } and calls its write methods after each
// cycle completes. The Express routes import the same singleton and read from it.
// =============================================================================

import type { WorldState, NationIndex } from "../types/Nation";
import type { Proposal }               from "../schemas/ProposalSchema";
import type { GovernorDecision }       from "../schemas/GovernorDecisionSchema";
import type { TxResult }               from "../blockchain/BlockchainClient";

// -----------------------------------------------------------------------------
// Shape of one completed cycle result (serialisable — safe to JSON.stringify)
// -----------------------------------------------------------------------------

export interface NationCycleEntry {
  nationIndex:        NationIndex;
  nationName:         string;
  economistProposal:  Proposal;
  strategistProposal: Proposal;
  decision:           GovernorDecision;
  economistFallback:  boolean;
  strategistFallback: boolean;
  governorFallback:   boolean;
  txHash:             string | null;
  txBlockNumber:      number | null;
  txError:            string | null;
}

export interface CycleRecord {
  cycleNumber:   number;
  completedAt:   string;           // ISO timestamp
  worldStatePre: WorldState;       // chain state before actions were applied
  nations:       NationCycleEntry[];
  advanceTxHash: string | null;
}

// -----------------------------------------------------------------------------
// Store class
// -----------------------------------------------------------------------------

const HISTORY_LIMIT = 20;

class CycleStoreImpl {
  private _isRunning  = false;
  private _latest:    CycleRecord | null = null;
  private _history:   CycleRecord[]     = [];

  // ---- Write methods (called by CycleRunner) --------------------------------

  setRunning(running: boolean): void {
    this._isRunning = running;
  }

  pushResult(record: CycleRecord): void {
    this._latest = record;
    this._history.unshift(record);               // newest first
    if (this._history.length > HISTORY_LIMIT) {
      this._history.length = HISTORY_LIMIT;
    }
  }

  // ---- Read methods (called by API routes) ----------------------------------

  get isRunning(): boolean {
    return this._isRunning;
  }

  get latest(): CycleRecord | null {
    return this._latest;
  }

  get cycleNumber(): number {
    return this._latest?.cycleNumber ?? 0;
  }

  /** Returns the last `limit` completed cycles, newest first. */
  getHistory(limit = 10): CycleRecord[] {
    return this._history.slice(0, Math.min(limit, HISTORY_LIMIT));
  }
}

// Singleton — both CycleRunner and server.ts import this reference.
export const cycleStore = new CycleStoreImpl();