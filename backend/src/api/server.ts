// =============================================================================
// src/api/server.ts
// =============================================================================
// Express HTTP server exposing the five API routes the frontend needs.
//
// Routes:
//   GET  /api/health          Liveness check
//   GET  /api/snapshot        Live chain state via BlockchainClient.readWorldState()
//   GET  /api/latest          Most recent completed cycle from CycleStore
//   GET  /api/history         Last N completed cycles from CycleStore
//   POST /api/trigger         Manually fire one cycle (requires X-Api-Key header)
//
// The cycle loop runs on a configurable interval (CYCLE_INTERVAL_MS env var).
// `npm run cycle` still works independently — this server adds HTTP on top.
//
// CycleRunner is unchanged. This file only imports runCycle() and the store.
// =============================================================================

import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { runCycle }             from "../orchestrator/CycleRunner";
import { cycleStore }           from "./CycleStore";
import { getBlockchainClient }  from "../blockchain/BlockchainClient";

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const PORT             = parseInt(process.env["PORT"]             ?? "3001",  10);
const ADMIN_API_KEY    = process.env["ADMIN_API_KEY"]             ?? "";
const CYCLE_INTERVAL_MS = parseInt(process.env["CYCLE_INTERVAL_MS"] ?? "0", 10);
const FRONTEND_URL     = process.env["FRONTEND_URL"]              ?? "*";

if (!ADMIN_API_KEY) {
  console.warn(
    "[server] ADMIN_API_KEY is not set — /api/trigger is unprotected. " +
    "Set ADMIN_API_KEY in .env before deploying.",
  );
}

// -----------------------------------------------------------------------------
// Cycle mutex — prevents overlapping cycle runs triggered via HTTP
// -----------------------------------------------------------------------------

let cycleRunning = false;

async function safeTriggerCycle(): Promise<{ accepted: boolean; reason?: string }> {
  if (cycleRunning) {
    return { accepted: false, reason: "A cycle is already running." };
  }
  cycleRunning = true;
  // Fire and forget — the caller gets an immediate response; cycle result
  // appears in /api/latest when complete.
  runCycle()
    .catch((err: unknown) => {
      console.error(
        "[server] Cycle error:",
        err instanceof Error ? err.message : String(err),
      );
    })
    .finally(() => {
      cycleRunning = false;
    });
  return { accepted: true };
}

// -----------------------------------------------------------------------------
// App
// -----------------------------------------------------------------------------

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: FRONTEND_URL === "*" ? true : FRONTEND_URL,
    methods: ["GET", "POST"],
  }),
);

// Simple request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[server] ${req.method} ${req.path}`);
  next();
});

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------

/**
 * GET /api/health
 * Liveness check. Returns current cycle number and running status.
 */
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    ok:        true,
    cycle:     cycleStore.cycleNumber,
    isRunning: cycleStore.isRunning || cycleRunning,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/snapshot
 * Reads current world state directly from the contract via eth_call.
 * Always reflects the latest on-chain state, even between cycles.
 */
app.get("/api/snapshot", async (_req: Request, res: Response) => {
  try {
    const chain = getBlockchainClient();
    const world = await chain.readWorldState();
    res.json(world);
  } catch (err) {
    console.error("[server] /api/snapshot error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to read chain state.",
    });
  }
});

/**
 * GET /api/latest
 * Returns the most recent completed cycle result from the in-memory store.
 * Returns 204 No Content if no cycle has completed yet since server start.
 */
app.get("/api/latest", (req: Request, res: Response) => {
  const latest = cycleStore.latest;
  if (!latest) {
    res.status(204).end();
    return;
  }
  res.json(latest);
});

/**
 * GET /api/history?limit=10
 * Returns the last N completed cycles, newest first.
 * Max 20 (HISTORY_LIMIT in CycleStore).
 */
app.get("/api/history", (req: Request, res: Response) => {
  const raw   = req.query["limit"];
  const limit = typeof raw === "string" ? parseInt(raw, 10) : 10;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 20) : 10;
  res.json(cycleStore.getHistory(safeLimit));
});

/**
 * POST /api/trigger
 * Manually fires one simulation cycle.
 * Requires X-Api-Key header matching ADMIN_API_KEY env var.
 * Returns immediately with { accepted: true } — cycle runs in background.
 */
app.post("/api/trigger", async (req: Request, res: Response) => {
  // Auth check — skip if ADMIN_API_KEY not configured (dev mode)
  if (ADMIN_API_KEY) {
    const provided = req.headers["x-api-key"];
    if (provided !== ADMIN_API_KEY) {
      res.status(401).json({ error: "Invalid or missing X-Api-Key header." });
      return;
    }
  }

  const result = await safeTriggerCycle();
  if (!result.accepted) {
    res.status(409).json({ accepted: false, reason: result.reason });
    return;
  }
  res.json({ accepted: true, message: "Cycle triggered. Poll /api/latest for results." });
});

// -----------------------------------------------------------------------------
// Auto-cycle loop
// -----------------------------------------------------------------------------

function startAutoCycle(): void {
  if (CYCLE_INTERVAL_MS <= 0) {
    console.log("[server] Auto-cycle disabled (CYCLE_INTERVAL_MS=0). Use POST /api/trigger.");
    return;
  }

  console.log(`[server] Auto-cycle enabled: every ${CYCLE_INTERVAL_MS / 1000}s.`);

  const tick = async () => {
    if (!cycleRunning) {
      console.log("[server] Auto-cycle tick — triggering...");
      await safeTriggerCycle();
    } else {
      console.log("[server] Auto-cycle tick — skipped (cycle already running).");
    }
  };

  // First cycle fires after one interval (give server time to settle)
  setTimeout(() => {
    tick();
    setInterval(tick, CYCLE_INTERVAL_MS);
  }, CYCLE_INTERVAL_MS);
}

// -----------------------------------------------------------------------------
// Start
// -----------------------------------------------------------------------------

function validateEnv(): void {
  const required = ["GROQ_API_KEY", "BASE_SEPOLIA_RPC_URL", "PRIVATE_KEY", "CONTRACT_ADDRESS"];
  const missing  = required.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    console.error(
      `[server] Missing required environment variables:\n` +
      missing.map((k) => `  • ${k}`).join("\n"),
    );
    process.exit(1);
  }
}

validateEnv();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║         AGENT NATIONS API SERVER             ║
╠══════════════════════════════════════════════╣
║  Port:     ${String(PORT).padEnd(34)}║
║  Contract: ${(process.env["CONTRACT_ADDRESS"] ?? "not set").slice(0, 34).padEnd(34)}║
║  Network:  Base Sepolia (chain 84532)        ║
╚══════════════════════════════════════════════╝

Routes:
  GET  /api/health
  GET  /api/snapshot
  GET  /api/latest
  GET  /api/history?limit=N
  POST /api/trigger  (X-Api-Key required)
`);
  startAutoCycle();
});

export default app;