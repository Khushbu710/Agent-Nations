// =============================================================================
// src/testAgents.ts
// =============================================================================
// End-to-end test harness for the Agent Nations AI layer.
//
// Runs one full simulation cycle across all three nations using the exact
// starting stats from the deployed AgentNationsRegistry contract:
//   [0] Tech Nation     treasury=1000  tech=70  mil=40  dip=50
//   [1] Trade Nation    treasury=1200  tech=50  mil=40  dip=60
//   [2] Military Nation treasury=900   tech=40  mil=70  dip=40
//
// For each nation the harness:
//   1. Runs the Economist Minister  → validated Proposal
//   2. Runs the Strategist Minister → validated Proposal
//   3. Runs the Governor            → validated GovernorDecision
//   4. Prints the full debate to stdout
//   5. Prints the selected action
//
// Usage:
//   npm run test-agents
// =============================================================================

import "dotenv/config";

import { EconomistAgent }    from "./agents/EconomistAgent";
import { StrategistAgent }   from "./agents/StrategistAgent";
import { GovernorAgent }     from "./agents/GovernorAgent";
import { NATION_PERSONALITIES } from "./types/Nation";
import type { WorldState }   from "./types/Nation";
import type { Proposal }     from "./schemas/ProposalSchema";
import type { GovernorDecision } from "./schemas/GovernorDecisionSchema";

// -----------------------------------------------------------------------------
// World state — mirrors deployed contract initial values
// -----------------------------------------------------------------------------

const INITIAL_WORLD_STATE: WorldState = {
  cycleNumber: 0,
  nations: [
    {
      name:           "Tech Nation",
      treasury:       1000,
      techScore:      70,
      militaryScore:  40,
      diplomacyScore: 50,
      lastAction:     "COLLECT_TRIBUTE",
    },
    {
      name:           "Trade Nation",
      treasury:       1200,
      techScore:      50,
      militaryScore:  40,
      diplomacyScore: 60,
      lastAction:     "COLLECT_TRIBUTE",
    },
    {
      name:           "Military Nation",
      treasury:       900,
      techScore:      40,
      militaryScore:  70,
      diplomacyScore: 40,
      lastAction:     "COLLECT_TRIBUTE",
    },
  ],
};

// -----------------------------------------------------------------------------
// Output formatting helpers
// -----------------------------------------------------------------------------

const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";

const COLOURS: Record<string, string> = {
  "Tech Nation":     "\x1b[36m",   // cyan
  "Trade Nation":    "\x1b[33m",   // yellow
  "Military Nation": "\x1b[31m",   // red
  "Economist":       "\x1b[32m",   // green
  "Strategist":      "\x1b[35m",   // magenta
  "Governor":        "\x1b[34m",   // blue
  separator:         "\x1b[90m",   // grey
};

function c(colour: string, text: string): string {
  return `${colour}${text}${RESET}`;
}

function separator(char = "─", width = 70): void {
  console.log(c(COLOURS["separator"]!, char.repeat(width)));
}

function header(text: string): void {
  separator("═");
  console.log(`${BOLD}  ${text}${RESET}`);
  separator("═");
}

function subheader(text: string): void {
  separator();
  console.log(`${BOLD}  ${text}${RESET}`);
  separator();
}

function printProposal(
  role: "Economist" | "Strategist",
  nationName: string,
  proposal: Proposal,
  isFallback: boolean,
  latencyMs: number,
): void {
  const roleColour   = COLOURS[role]!;
  const nationColour = COLOURS[nationName]!;
  const fallbackTag  = isFallback ? c("\x1b[41m", " FALLBACK ") + " " : "";

  console.log(
    `  ${c(nationColour, nationName)} › ${c(roleColour, role + " Minister")} ` +
      `${fallbackTag}${DIM}(${latencyMs}ms)${RESET}`,
  );
  console.log(
    `  ${BOLD}Action:${RESET}    ${c(roleColour, proposal.action)}` +
      (proposal.targetNationName
        ? ` ${DIM}→ ${proposal.targetNationName}${RESET}`
        : ""),
  );
  console.log(`  ${BOLD}Reasoning:${RESET} ${proposal.reasoning}`);
  console.log();
}

function printDecision(
  nationName: string,
  decision: GovernorDecision,
  isFallback: boolean,
  latencyMs: number,
): void {
  const nationColour  = COLOURS[nationName]!;
  const govColour     = COLOURS["Governor"]!;
  const winnerColour  =
    decision.selectedMinister === "Economist"
      ? COLOURS["Economist"]!
      : COLOURS["Strategist"]!;
  const fallbackTag   = isFallback ? c("\x1b[41m", " FALLBACK ") + " " : "";

  console.log(
    `  ${c(nationColour, nationName)} › ${c(govColour, "Governor")} ` +
      `${fallbackTag}${DIM}(${latencyMs}ms)${RESET}`,
  );
  console.log(
    `  ${BOLD}Chose:${RESET}     ${c(winnerColour, decision.selectedMinister + " Minister")} ` +
      `› ${BOLD}${decision.chosenAction}${RESET}` +
      (decision.targetNationName
        ? ` ${DIM}→ ${decision.targetNationName}${RESET}`
        : ""),
  );
  console.log(`  ${BOLD}Reasoning:${RESET} ${decision.reasoning}`);
  console.log(
    `  ${BOLD}Rejected:${RESET}  ${DIM}${decision.rejectionReason}${RESET}`,
  );
  console.log();
}

function printSummaryTable(
  results: NationCycleResult[],
): void {
  header("CYCLE 0 — FINAL ACTIONS SUMMARY");
  console.log(
    `  ${"Nation".padEnd(18)} ${"Minister".padEnd(12)} ${"Action".padEnd(20)} Target`,
  );
  separator("-");
  for (const r of results) {
    const nationColour  = COLOURS[r.nationName]!;
    const winnerColour  =
      r.decision.selectedMinister === "Economist"
        ? COLOURS["Economist"]!
        : COLOURS["Strategist"]!;
    const target = r.decision.targetNationName ?? "—";
    console.log(
      `  ${c(nationColour, r.nationName.padEnd(18))} ` +
        `${c(winnerColour, r.decision.selectedMinister.padEnd(12))} ` +
        `${BOLD}${r.decision.chosenAction.padEnd(20)}${RESET} ${DIM}${target}${RESET}`,
    );
  }
  separator("═");
}

// -----------------------------------------------------------------------------
// Per-nation result type
// -----------------------------------------------------------------------------

interface NationCycleResult {
  nationName:          string;
  economistProposal:   Proposal;
  strategistProposal:  Proposal;
  decision:            GovernorDecision;
  economistFallback:   boolean;
  strategistFallback:  boolean;
  governorFallback:    boolean;
  economistLatency:    number;
  strategistLatency:   number;
  governorLatency:     number;
  totalLatency:        number;
}

// -----------------------------------------------------------------------------
// Single-nation deliberation
// -----------------------------------------------------------------------------

async function runNationCycle(
  personalityIndex: 0 | 1 | 2,
  world: WorldState,
): Promise<NationCycleResult> {
  const personality = NATION_PERSONALITIES[personalityIndex];
  const nationName  = personality.name;
  const t0          = Date.now();

  subheader(`${nationName.toUpperCase()} — DELIBERATION`);

  // Instantiate agents
  const economist  = new EconomistAgent(personality);
  const strategist = new StrategistAgent(personality);
  const governor   = new GovernorAgent(personality);

  // Step 1 & 2 — Ministers propose in parallel
  console.log(
    `  ${DIM}Running Economist and Strategist in parallel...${RESET}\n`,
  );

  const [eResult, sResult] = await Promise.all([
    economist.propose(world),
    strategist.propose(world),
  ]);

  printProposal(
    "Economist",
    nationName,
    eResult.proposal,
    eResult.isFallback,
    eResult.latencyMs,
  );

  printProposal(
    "Strategist",
    nationName,
    sResult.proposal,
    sResult.isFallback,
    sResult.latencyMs,
  );

  // Step 3 — Governor decides
  console.log(`  ${DIM}Governor evaluating proposals...${RESET}\n`);

  const gResult = await governor.decide(
    world,
    eResult.proposal,
    sResult.proposal,
  );

  printDecision(
    nationName,
    gResult.decision,
    gResult.isFallback,
    gResult.latencyMs,
  );

  const totalLatency = Date.now() - t0;

  return {
    nationName,
    economistProposal:  eResult.proposal,
    strategistProposal: sResult.proposal,
    decision:           gResult.decision,
    economistFallback:  eResult.isFallback,
    strategistFallback: sResult.isFallback,
    governorFallback:   gResult.isFallback,
    economistLatency:   eResult.latencyMs,
    strategistLatency:  sResult.latencyMs,
    governorLatency:    gResult.latencyMs,
    totalLatency,
  };
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  header("AGENT NATIONS — CYCLE 0 SIMULATION TEST");

  console.log(`  ${DIM}World state loaded from deployed contract initial values.${RESET}`);
  console.log(`  ${DIM}Three nations. Two ministers each. One governor each.${RESET}`);
  console.log(`  ${DIM}Model: ${process.env["GROK_MODEL"] ?? "grok-3-mini"}${RESET}\n`);

  // Print world state snapshot
  subheader("INITIAL WORLD STATE");
  for (const n of INITIAL_WORLD_STATE.nations) {
    const col = COLOURS[n.name]!;
    console.log(
      `  ${c(col, n.name.padEnd(18))}` +
        ` treasury=${String(n.treasury).padStart(5)}` +
        `  tech=${String(n.techScore).padStart(3)}` +
        `  mil=${String(n.militaryScore).padStart(3)}` +
        `  dip=${String(n.diplomacyScore).padStart(3)}`,
    );
  }
  console.log();

  // Run all three nations — sequentially so output is readable
  const results: NationCycleResult[] = [];

  for (const idx of [0, 1, 2] as const) {
    const result = await runNationCycle(idx, INITIAL_WORLD_STATE);
    results.push(result);
  }

  // Summary table
  printSummaryTable(results);

  // Timing report
  console.log(`\n  ${BOLD}TIMING REPORT${RESET}`);
  separator("-");
  let grandTotal = 0;
  for (const r of results) {
    grandTotal += r.totalLatency;
    console.log(
      `  ${c(COLOURS[r.nationName]!, r.nationName.padEnd(18))}` +
        `  economist=${r.economistLatency}ms` +
        `  strategist=${r.strategistLatency}ms` +
        `  governor=${r.governorLatency}ms` +
        `  ${DIM}total=${r.totalLatency}ms${RESET}`,
    );
  }
  console.log(
    `  ${"GRAND TOTAL".padEnd(18)}  ${DIM}${grandTotal}ms (${(grandTotal / 1000).toFixed(1)}s)${RESET}`,
  );
  separator("═");

  // Fallback audit
  const fallbacks = results.flatMap((r) => {
    const f: string[] = [];
    if (r.economistFallback)  f.push(`${r.nationName}/Economist`);
    if (r.strategistFallback) f.push(`${r.nationName}/Strategist`);
    if (r.governorFallback)   f.push(`${r.nationName}/Governor`);
    return f;
  });

  if (fallbacks.length > 0) {
    console.log(
      `\n  ${c("\x1b[33m", "⚠  FALLBACKS USED:")} ${fallbacks.join(", ")}`,
    );
    console.log(
      `  ${DIM}These agents returned COLLECT_TRIBUTE due to API or validation errors.${RESET}\n`,
    );
  } else {
    console.log(
      `\n  ${c("\x1b[32m", "✓  All 9 agents produced valid AI decisions. No fallbacks used.")}\n`,
    );
  }
}

main().catch((err: unknown) => {
  console.error(
    "\n\x1b[31m[FATAL]\x1b[0m testAgents crashed:",
    err instanceof Error ? err.message : String(err),
  );
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});