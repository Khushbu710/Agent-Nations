// =============================================================================
// src/blockchain/BlockchainClient.ts
// =============================================================================
// Typed ethers v6 wrapper around AgentNationsRegistry on Base Sepolia.
//
// Responsibilities:
//   - Hold a single provider + signer pair (lazy-initialised).
//   - Read all nation state and cycle number via view calls (no gas).
//   - Submit executeAction() and advanceCycle() transactions with
//     sequential nonce management to prevent collisions.
//   - Wait for one confirmation before returning receipts.
//   - Surface clean typed errors so the CycleRunner can react.
// =============================================================================

import { ethers }            from "ethers";
import ABI                   from "./abi/AgentNationsRegistry.json";
import { buildWorldState }   from "./NationStateReader";
import type { RawNationTuple } from "./NationStateReader";
import type { Action }       from "../types/Action";
import type { WorldState }   from "../types/Nation";
import { actionStringToIndex, resolveTargetIndex } from "./NationStateReader";

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val || val.trim() === "") {
    throw new Error(
      `[BlockchainClient] Missing required environment variable: ${key}`,
    );
  }
  return val.trim();
}

// -----------------------------------------------------------------------------
// Transaction result
// -----------------------------------------------------------------------------

export interface TxResult {
  /** Transaction hash. */
  hash: string;
  /** Block number the transaction was included in. */
  blockNumber: number;
  /** Gas used by this transaction. */
  gasUsed: bigint;
  /** Wall-clock ms from submission to one confirmation. */
  latencyMs: number;
}

// -----------------------------------------------------------------------------
// BlockchainClient
// -----------------------------------------------------------------------------

export class BlockchainClient {
  private provider:  ethers.JsonRpcProvider | null = null;
  private signer:    ethers.Wallet            | null = null;
  private contract:  ethers.Contract          | null = null;

  // Serialise all write transactions through a promise chain so nonces
  // are always sequential — no racing executeAction() calls.
  private txQueue: Promise<void> = Promise.resolve();

  // ---- Initialisation -------------------------------------------------------

  /**
   * Lazily initialises the provider, signer, and contract instance.
   * Safe to call multiple times — only runs once.
   */
  private init(): void {
    if (this.contract) return;

    const rpcUrl          = requireEnv("BASE_SEPOLIA_RPC_URL");
    const privateKey      = requireEnv("PRIVATE_KEY");
    const contractAddress = requireEnv("CONTRACT_ADDRESS");

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer   = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(contractAddress, ABI, this.signer);

    console.log(
      `[BlockchainClient] Initialised.\n` +
      `  RPC:      ${rpcUrl}\n` +
      `  Signer:   ${this.signer.address}\n` +
      `  Contract: ${contractAddress}`,
    );
  }

  private getContract(): ethers.Contract {
    this.init();
    return this.contract!;
  }

  // ---- Read functions (view — no gas) ---------------------------------------

  /**
   * Reads all three nation states and the current cycle number from the
   * contract in two parallel eth_call requests, then assembles a WorldState.
   */
  async readWorldState(): Promise<WorldState> {
    const contract = this.getContract();

    console.log("[BlockchainClient] Reading world state from chain...");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = contract as any;
    const [rawNations, cycleNumber] = await Promise.all([
      c.getAllStates()   as Promise<RawNationTuple[]>,
      c.getCycleNumber() as Promise<bigint>,
    ]);

    const world = buildWorldState(rawNations, cycleNumber);

    console.log(
      `[BlockchainClient] Chain read OK — cycle ${world.cycleNumber}, ` +
      world.nations.map(n => `${n.name}(t=${n.treasury})`).join(", "),
    );

    return world;
  }

  // ---- Write functions (transactions) ---------------------------------------

  /**
   * Submits an executeAction() transaction for one nation.
   * Queued so concurrent calls for different nations are serialised
   * and nonces never collide.
   *
   * @param nationIdx  Contract array index of the acting nation (0–2).
   * @param action     Action string selected by the Governor.
   * @param targetName Optional target nation name (for LAUNCH_ESPIONAGE).
   * @param world      Current WorldState — used to resolve the target index.
   * @returns          TxResult with hash, block, gasUsed, and latency.
   */
  executeAction(
    nationIdx: 0 | 1 | 2,
    action: Action,
    targetName: string | null | undefined,
    world: WorldState,
  ): Promise<TxResult> {
    // Append to the serial queue and return the promise for this specific tx.
    let resolve!: (r: TxResult) => void;
    let reject!:  (e: unknown)  => void;
    const outer = new Promise<TxResult>((res, rej) => {
      resolve = res;
      reject  = rej;
    });

    this.txQueue = this.txQueue.then(async () => {
      try {
        const result = await this._submitExecuteAction(
          nationIdx, action, targetName, world,
        );
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });

    return outer;
  }

  private async _submitExecuteAction(
    nationIdx: 0 | 1 | 2,
    action: Action,
    targetName: string | null | undefined,
    world: WorldState,
  ): Promise<TxResult> {
    const contract   = this.getContract();
    const actionIdx  = actionStringToIndex(action);
    const targetIdx  = action === "LAUNCH_ESPIONAGE"
      ? resolveTargetIndex(targetName, world.nations, nationIdx)
      : 255;

    const nation = world.nations[nationIdx]!;
    console.log(
      `[BlockchainClient] Submitting executeAction(` +
      `nationIdx=${nationIdx}, action=${action}(${actionIdx}), ` +
      `targetIdx=${targetIdx}) for ${nation.name}...`,
    );

    const start = Date.now();

    const tx: ethers.TransactionResponse = await (
      contract.executeAction as (
        nationIdx: number,
        action: number,
        targetIdx: number,
      ) => Promise<ethers.TransactionResponse>
    )(nationIdx, actionIdx, targetIdx);

    console.log(`[BlockchainClient] ${nation.name} tx submitted: ${tx.hash}`);

    const receipt = await tx.wait(1);
    if (!receipt) {
      throw new Error(
        `[BlockchainClient] No receipt for tx ${tx.hash} (${nation.name}).`,
      );
    }

    const latencyMs = Date.now() - start;
    console.log(
      `[BlockchainClient] ${nation.name} tx confirmed in block ` +
      `${receipt.blockNumber} (${latencyMs}ms, gas=${receipt.gasUsed})`,
    );

    return {
      hash:        receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed:     receipt.gasUsed,
      latencyMs,
    };
  }

  /**
   * Submits advanceCycle() after all three nations have executed their actions.
   * Also serialised through the tx queue.
   */
  advanceCycle(): Promise<TxResult> {
    let resolve!: (r: TxResult) => void;
    let reject!:  (e: unknown)  => void;
    const outer = new Promise<TxResult>((res, rej) => {
      resolve = res;
      reject  = rej;
    });

    this.txQueue = this.txQueue.then(async () => {
      try {
        const result = await this._submitAdvanceCycle();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });

    return outer;
  }

  private async _submitAdvanceCycle(): Promise<TxResult> {
    const contract = this.getContract();

    console.log("[BlockchainClient] Submitting advanceCycle()...");

    const start = Date.now();

    const tx: ethers.TransactionResponse = await (
      contract.advanceCycle as () => Promise<ethers.TransactionResponse>
    )();

    console.log(`[BlockchainClient] advanceCycle tx submitted: ${tx.hash}`);

    const receipt = await tx.wait(1);
    if (!receipt) {
      throw new Error(`[BlockchainClient] No receipt for advanceCycle tx ${tx.hash}.`);
    }

    const latencyMs = Date.now() - start;
    console.log(
      `[BlockchainClient] Cycle advanced in block ${receipt.blockNumber} ` +
      `(${latencyMs}ms, gas=${receipt.gasUsed})`,
    );

    return {
      hash:        receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed:     receipt.gasUsed,
      latencyMs,
    };
  }

  // ---- Utility --------------------------------------------------------------

  /**
   * Returns the signer's current ETH balance on Base Sepolia.
   * Useful as a pre-flight check before attempting a cycle.
   */
  async getSignerBalance(): Promise<bigint> {
    this.init();
    return this.provider!.getBalance(this.signer!.address);
  }

  /** Returns the checksummed signer address. */
  getSignerAddress(): string {
    this.init();
    return this.signer!.address;
  }
}

// -----------------------------------------------------------------------------
// Module-level singleton
// -----------------------------------------------------------------------------

let _instance: BlockchainClient | null = null;

/** Returns the shared BlockchainClient singleton. Lazily created. */
export function getBlockchainClient(): BlockchainClient {
  if (!_instance) {
    _instance = new BlockchainClient();
  }
  return _instance;
}
