// =============================================================================
// src/orchestrator/CycleRunner.ts
// =============================================================================
// Orchestrates a single complete simulation cycle:
//
//   1. Pre-flight: verify signer balance and contract connectivity.
//   2. Read world state from chain (getAllStates + getCycleNumber).
//   3. For each of 3 nations in parallel: run Economist + Strategist ministers.
//   4. For each of 3 nations in parallel: run Governor to select one action.
//   5. Submit executeAction() for each nation — SEQUENTIAL (nonce safety).
//   6. Submit advanceCycle().
//   7. Print full debate log with tx hashes.
//
// No Express. No Supabase. No mock data. One real cycle, then exit.
// =============================================================================

import "dotenv/config";

import { EconomistAgent }           from "../agents/EconomistAgent";
import { StrategistAgent }          from "../agents/StrategistAgent";
import { GovernorAgent }            from "../agents/GovernorAgent";
import { getBlockchainClient }      from "../blockchain/BlockchainClient";
import { NATION_PERSONALITIES }     from "../types/Nation";
import type { WorldState, NationIndex } from "../types/Nation";
import type { Proposal }            from "../schemas/ProposalSchema";
import type { GovernorDecision }    from "../schemas/GovernorDecisionSchema";
import type { TxResult }            from "../blockchain/BlockchainClient";
import { ethers }                   from "ethers";
import { cycleStore } from "../api/CycleStore";
import type { NationCycleEntry, CycleRecord } from "../api/CycleStore";

// -----------------------------------------------------------------------------
// ANSI colour helpers
// -----------------------------------------------------------------------------

const R = "\x1b[0m";
const B = "\x1b[1m";
const D = "\x1b[2m";
const COL: Record<string, string> = {
  "Tech Nation":     "\x1b[36m",
  "Trade Nation":    "\x1b[33m",
  "Military Nation": "\x1b[31m",
  Economist:         "\x1b[32m",
  Strategist:        "\x1b[35m",
  Governor:          "\x1b[34m",
  separator:         "\x1b[90m",
  green:             "\x1b[32m",
  yellow:            "\x1b[33m",
  red:               "\x1b[31m",
};

const hr   = (ch = "─", w = 70) => console.log(`${COL["separator"]}${ch.repeat(w)}${R}`);
const hdr  = (t: string)        => { hr("═"); console.log(`${B}  ${t}${R}`); hr("═"); };
const subhr = (t: string)       => { hr(); console.log(`${B}  ${t}${R}`); hr(); };
const c    = (key: string, s: string) => `${COL[key] ?? ""}${s}${R}`;

// -----------------------------------------------------------------------------
// Per-nation result type
// -----------------------------------------------------------------------------

interface NationCycleResult {
  nationIndex:        NationIndex;
  nationName:         string;
  economistProposal:  Proposal;
  strategistProposal: Proposal;
  decision:           GovernorDecision;
  economistFallback:  boolean;
  strategistFallback: boolean;
  governorFallback:   boolean;
  txResult:           TxResult | null;
  txError:            string   | null;
}

// -----------------------------------------------------------------------------
// Single-nation deliberation
// -----------------------------------------------------------------------------

async function deliberateNation(
  index: NationIndex,
  world: WorldState,
): Promise<Omit<NationCycleResult, "txResult" | "txError">> {
  const personality = NATION_PERSONALITIES[index];
  const name        = personality.name;

  subhr(`${name.toUpperCase()} — DELIBERATION`);

  const economist  = new EconomistAgent(personality);
  const strategist = new StrategistAgent(personality);
  const governor   = new GovernorAgent(personality);

  // Ministers run in parallel
  console.log(`  ${D}Ministers deliberating in parallel...${R}\n`);
  const [eResult, sResult] = await Promise.all([
    economist.propose(world),
    strategist.propose(world),
  ]);

  // Print minister proposals
  for (const [role, result] of [
    ["Economist",  eResult]  as const,
    ["Strategist", sResult]  as const,
  ]) {
    const fallbackTag = result.isFallback ? ` ${c("red", "[FALLBACK]")}` : "";
    console.log(
      `  ${c(name, name)} › ${c(role, role + " Minister")}${fallbackTag} ${D}(${result.latencyMs}ms)${R}`,
    );
    console.log(
      `  ${B}Action:${R}    ${c(role, result.proposal.action)}` +
      (result.proposal.targetNationName ? ` ${D}→ ${result.proposal.targetNationName}${R}` : ""),
    );
    console.log(`  ${B}Reasoning:${R} ${result.proposal.reasoning}`);
    console.log();
  }

  // Governor runs after both ministers
  console.log(`  ${D}Governor evaluating proposals...${R}\n`);
  const gResult = await governor.decide(world, eResult.proposal, sResult.proposal);

  const govFallbackTag = gResult.isFallback ? ` ${c("red", "[FALLBACK]")}` : "";
  const winnerCol      = gResult.decision.selectedMinister === "Economist" ? "Economist" : "Strategist";
  console.log(
    `  ${c(name, name)} › ${c("Governor", "Governor")}${govFallbackTag} ${D}(${gResult.latencyMs}ms)${R}`,
  );
  console.log(
    `  ${B}Chose:${R}     ${c(winnerCol, gResult.decision.selectedMinister + " Minister")} ` +
    `› ${B}${gResult.decision.chosenAction}${R}` +
    (gResult.decision.targetNationName ? ` ${D}→ ${gResult.decision.targetNationName}${R}` : ""),
  );
  console.log(`  ${B}Reasoning:${R} ${gResult.decision.reasoning}`);
  console.log(`  ${B}Rejected:${R}  ${D}${gResult.decision.rejectionReason}${R}`);
  console.log();

  return {
    nationIndex:        index,
    nationName:         name,
    economistProposal:  eResult.proposal,
    strategistProposal: sResult.proposal,
    decision:           gResult.decision,
    economistFallback:  eResult.isFallback,
    strategistFallback: sResult.isFallback,
    governorFallback:   gResult.isFallback,
  };
}

// -----------------------------------------------------------------------------
// Main cycle function
// -----------------------------------------------------------------------------

export async function runCycle(): Promise<void> {
  hdr("AGENT NATIONS — SINGLE CYCLE EXECUTION");

  cycleStore.setRunning(true);
  const chain = getBlockchainClient();

  // ---- Pre-flight -----------------------------------------------------------
  subhr("PRE-FLIGHT CHECKS");

  const balance = await chain.getSignerBalance();
  const balEth  = ethers.formatEther(balance);
  const signerAddr = chain.getSignerAddress();

  console.log(`  Signer:      ${signerAddr}`);
  console.log(`  Balance:     ${balEth} ETH`);
  console.log(`  Contract:    ${process.env["CONTRACT_ADDRESS"] ?? "not set"}`);
  console.log(`  Network:     Base Sepolia (chain 84532)`);
  console.log();

  if (balance === 0n) {
    throw new Error(
      "Signer wallet has zero ETH. " +
      "Fund it at https://faucet.quicknode.com/base/sepolia before running a cycle.",
    );
  }

  if (balance < ethers.parseEther("0.001")) {
    console.warn(
      `  ${c("yellow", "⚠  Low balance (< 0.001 ETH). Cycle may fail if gas costs are high.")}`,
    );
  } else {
    console.log(`  ${c("green", "✓  Balance sufficient for cycle execution.")}`);
  }
  console.log();

  // ---- Read world state -----------------------------------------------------
  subhr("READING WORLD STATE FROM CHAIN");

  const world = await chain.readWorldState();

  console.log(`  Cycle:  ${B}#${world.cycleNumber}${R}`);
  console.log();
  console.log(
    `  ${"Nation".padEnd(18)} ${"Treasury".padStart(8)}  ` +
    `${"Tech".padStart(4)}  ${"Mil".padStart(4)}  ${"Dip".padStart(4)}  Last Action`,
  );
  hr("-");
  for (const n of world.nations) {
    console.log(
      `  ${c(n.name, n.name.padEnd(18))} ` +
      `${String(n.treasury).padStart(8)}  ` +
      `${String(n.techScore).padStart(4)}  ` +
      `${String(n.militaryScore).padStart(4)}  ` +
      `${String(n.diplomacyScore).padStart(4)}  ` +
      `${D}${n.lastAction}${R}`,
    );
  }
  console.log();

  // ---- AI Deliberation — all 3 nations in parallel -------------------------
  subhr("AI DELIBERATION PHASE");
  console.log(`  ${D}Running all three nations simultaneously...${R}\n`);

  const deliberations = await Promise.all([
    deliberateNation(0, world),
    deliberateNation(1, world),
    deliberateNation(2, world),
  ]);

  // ---- On-chain execution — SEQUENTIAL (nonce safety) ---------------------
  subhr("ON-CHAIN EXECUTION PHASE");
  console.log(
    `  ${D}Submitting transactions sequentially (nonce-safe)...${R}\n`,
  );

  const results: NationCycleResult[] = [];

  // Fire all three executeAction calls into the BlockchainClient's serial queue,
  // then await them together. The queue guarantees sequential nonce ordering
  // while this code can still progress without blocking between submissions.
  const txPromises = deliberations.map((d) =>
    chain
      .executeAction(
        d.nationIndex,
        d.decision.chosenAction,
        d.decision.targetNationName,
        world,
      )
      .then((txResult): NationCycleResult => ({ ...d, txResult, txError: null }))
      .catch((err: unknown): NationCycleResult => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ${c("red", `✗ ${d.nationName} tx failed:`)} ${msg}`);
        return { ...d, txResult: null, txError: msg };
      }),
  );

  const txSettled = await Promise.all(txPromises);
  results.push(...txSettled);

  // ---- advanceCycle --------------------------------------------------------
  let advanceTx: TxResult | null = null;
  try {
    advanceTx = await chain.advanceCycle();
  } catch (err) {
    console.error(
      `  ${c("red", "✗ advanceCycle() failed:")} ` +
      (err instanceof Error ? err.message : String(err)),
    );
  }

  // ---- Final summary -------------------------------------------------------
  hdr(`CYCLE ${world.cycleNumber} — RESULTS SUMMARY`);

  console.log(
    `  ${"Nation".padEnd(18)} ${"Minister".padEnd(12)} ${"Action".padEnd(20)} ${"Tx Hash".padEnd(20)} Target`,
  );
  hr("-");

  for (const r of results) {
    const winCol  = r.decision.selectedMinister === "Economist" ? "Economist" : "Strategist";
    const txStr   = r.txResult ? r.txResult.hash.slice(0, 12) + "…" : c("red", "FAILED");
    const target  = r.decision.targetNationName ?? "—";
    console.log(
      `  ${c(r.nationName, r.nationName.padEnd(18))} ` +
      `${c(winCol, r.decision.selectedMinister.padEnd(12))} ` +
      `${B}${r.decision.chosenAction.padEnd(20)}${R} ` +
      `${D}${txStr.padEnd(20)}${R} ` +
      `${D}${target}${R}`,
    );
  }

  hr("-");

  if (advanceTx) {
    console.log(
      `\n  ${c("green", "✓ Cycle advanced")} → ` +
      `block ${advanceTx.blockNumber}  tx: ${D}${advanceTx.hash}${R}`,
    );
  } else {
    console.log(`\n  ${c("red", "✗ advanceCycle failed — cycle number not incremented on-chain.")}`);
  }

  // ---- Block explorer links ------------------------------------------------
  console.log(`\n  ${B}Base Sepolia explorer links:${R}`);
  for (const r of results) {
    if (r.txResult) {
      console.log(
        `  ${c(r.nationName, r.nationName.padEnd(18))} ` +
        `https://sepolia.basescan.org/tx/${r.txResult.hash}`,
      );
    }
  }
  if (advanceTx) {
    console.log(
      `  ${"advanceCycle".padEnd(18)} ` +
      `https://sepolia.basescan.org/tx/${advanceTx.hash}`,
    );
  }

  // ---- Fallback audit ------------------------------------------------------
  const fallbacks = results.flatMap((r) => {
    const f: string[] = [];
    if (r.economistFallback)  f.push(`${r.nationName}/Economist`);
    if (r.strategistFallback) f.push(`${r.nationName}/Strategist`);
    if (r.governorFallback)   f.push(`${r.nationName}/Governor`);
    return f;
  });

  const txFailed = results.filter(r => r.txResult === null).length;

  console.log();
  hr("═");
  if (fallbacks.length === 0 && txFailed === 0) {
    console.log(
      `  ${c("green", "✓ Cycle complete.")} ` +
      `All 9 agents returned real AI decisions. All 4 transactions confirmed.`,
    );
  } else {
    if (fallbacks.length > 0) {
      console.log(`  ${c("yellow", "⚠  Fallback agents:")} ${fallbacks.join(", ")}`);
    }
    if (txFailed > 0) {
      console.log(`  ${c("red", `✗ ${txFailed} transaction(s) failed.`)} See errors above.`);
    }
  }

  // ---- Persist result in CycleStore (read by API routes) ------------------
  const storeEntries: NationCycleEntry[] = results.map((r) => ({
    nationIndex:        r.nationIndex,
    nationName:         r.nationName,
    economistProposal:  r.economistProposal,
    strategistProposal: r.strategistProposal,
    decision:           r.decision,
    economistFallback:  r.economistFallback,
    strategistFallback: r.strategistFallback,
    governorFallback:   r.governorFallback,
    txHash:             r.txResult?.hash        ?? null,
    txBlockNumber:      r.txResult?.blockNumber ?? null,
    txError:            r.txError,
  }));

  const record: CycleRecord = {
    cycleNumber:   world.cycleNumber,
    completedAt:   new Date().toISOString(),
    worldStatePre: world,
    nations:       storeEntries,
    advanceTxHash: advanceTx?.hash ?? null,
  };

  cycleStore.pushResult(record);
  cycleStore.setRunning(false);

  hr("═");
  console.log();
}