import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

// ---- Environment variable helpers ----
// These throw at config-load time so you get a clear error rather than a
// cryptic "cannot sign transactions" message later in the run.

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Copy .env.example to .env and fill in all required values.`
    );
  }
  return value;
}

function optionalEnv(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

// Only require the private key when not running local/test tasks.
// This prevents CI test runs from failing on missing env vars.
const isLocalTask =
  process.argv.includes("test") ||
  process.argv.includes("compile") ||
  process.argv.includes("coverage") ||
  process.argv.includes("node");

const DEPLOYER_PRIVATE_KEY: string = isLocalTask
  ? optionalEnv(
      "DEPLOYER_PRIVATE_KEY",
      // Hardhat's well-known default test account — never use on mainnet.
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    )
  : requireEnv("DEPLOYER_PRIVATE_KEY");

const BASESCAN_API_KEY: string = optionalEnv("BASESCAN_API_KEY");

// RPC URLs — prefer Alchemy/QuickNode keys over the public endpoint for
// reliability during a live hackathon demo.
const BASE_SEPOLIA_RPC_URL: string = optionalEnv(
  "BASE_SEPOLIA_RPC_URL",
  "https://sepolia.base.org" // Public fallback — use a private key in production
);

const BASE_MAINNET_RPC_URL: string = optionalEnv(
  "BASE_MAINNET_RPC_URL",
  "https://mainnet.base.org"
);

// -------------------------------------------------------------------------

const config: HardhatUserConfig = {
  // ---- Solidity compiler ----
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        // 200 runs balances deploy cost vs. per-call cost. For a contract that
        // will be called many times per cycle, increase this to 10_000.
        runs: 200,
      },
      // Enable the IR-based code generator for better gas optimisation.
      viaIR: true,
    },
  },

  // ---- Networks ----
  networks: {
    // Local Hardhat in-process network (default for `npx hardhat test`)
    hardhat: {
      chainId: 31337,
    },

    // Local Hardhat node (`npx hardhat node`)
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // Base Sepolia testnet — primary deployment target
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      chainId: 84532,
      accounts: [DEPLOYER_PRIVATE_KEY],
      // Gas settings tuned for Base Sepolia's typical fee environment.
      // Remove these to let ethers.js estimate automatically.
      gasPrice: "auto",
      gas: "auto",
    },

    // Base Mainnet — for post-hackathon production use
    base: {
      url: BASE_MAINNET_RPC_URL,
      chainId: 8453,
      accounts: [DEPLOYER_PRIVATE_KEY],
      gasPrice: "auto",
      gas: "auto",
    },
  },

  // ---- Contract verification ----
  etherscan: {
    apiKey: {
      // Basescan uses the same API key format as Etherscan.
      baseSepolia: BASESCAN_API_KEY,
      base: BASESCAN_API_KEY,
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
    ],
  },

  // ---- Gas reporter ----
  // Run `REPORT_GAS=true npx hardhat test` to see a per-function gas table.
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    gasPrice: 1, // gwei — set to a realistic value when on a live network
    coinmarketcap: optionalEnv("COINMARKETCAP_API_KEY"),
    outputFile: process.env.CI ? "gas-report.txt" : undefined,
    noColors: !!process.env.CI,
  },

  // ---- Code coverage ----
  // Run `npx hardhat coverage` to generate an Istanbul coverage report.

  // ---- Paths ----
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },

  // ---- TypeChain ----
  // Generates TypeScript bindings in typechain-types/ after compilation.
  typechain: {
    outDir:  "typechain-types",
    target:  "ethers-v6",
  },
};

export default config;
