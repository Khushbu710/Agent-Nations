// =============================================================================
// src/runCycle.ts
// =============================================================================
// Entry point for `npm run cycle`.
// Loads .env, validates required variables are present, then executes
// exactly one simulation cycle via CycleRunner.
// =============================================================================

import "dotenv/config";
import { runCycle } from "./orchestrator/CycleRunner";

// Validate required env vars before touching any module that needs them.
const REQUIRED = [
  "GROQ_API_KEY",
  "BASE_SEPOLIA_RPC_URL",
  "PRIVATE_KEY",
  "CONTRACT_ADDRESS",
];

const missing = REQUIRED.filter((k) => !process.env[k]?.trim());
if (missing.length > 0) {
  console.error(
    `\n[runCycle] Missing required environment variables:\n` +
      missing.map((k) => `  • ${k}`).join("\n") +
      `\n\nCopy .env.example to .env and fill in all values.\n`,
  );
  process.exit(1);
}

runCycle().catch((err: unknown) => {
  console.error(
    "\n\x1b[31m[FATAL]\x1b[0m Cycle crashed:",
    err instanceof Error ? err.message : String(err),
  );
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});