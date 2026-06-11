import { ethers, network, run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deployment script for AgentNationsRegistry on Base Sepolia.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network baseSepolia
 *
 * Required environment variables (set in .env):
 *   DEPLOYER_PRIVATE_KEY  — Private key of the deploying wallet (funded with Base Sepolia ETH).
 *   EXECUTOR_ADDRESS      — Address of the backend hot wallet that will hold EXECUTOR_ROLE.
 *                           Can be the same as the deployer during development.
 *   BASESCAN_API_KEY      — API key for contract verification on Basescan.
 */
async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();

  // ---- Resolve executor address ----
  const executorAddress: string =
    process.env.EXECUTOR_ADDRESS ?? deployer.address;

  console.log("=".repeat(60));
  console.log("Agent Nations Registry — Deployment");
  console.log("=".repeat(60));
  console.log(`Network:          ${network.name}`);
  console.log(`Deployer:         ${deployer.address}`);
  console.log(`Executor:         ${executorAddress}`);

  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(deployerBalance)} ETH`);

  if (deployerBalance === 0n) {
    throw new Error(
      "Deployer wallet has zero balance. " +
        "Fund it with Base Sepolia ETH from https://faucet.quicknode.com/base/sepolia"
    );
  }

  // ---- Deploy ----
  console.log("\nDeploying AgentNationsRegistry...");

  const factory = await ethers.getContractFactory("AgentNationsRegistry");
  const contract = await factory.deploy(executorAddress);

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log(`\n✅ Contract deployed at: ${contractAddress}`);
  console.log(`   TX hash:              ${deployTx?.hash}`);
  console.log(`   Block explorer:       https://sepolia.basescan.org/address/${contractAddress}`);

  // ---- Verify initial state ----
  console.log("\nVerifying initial on-chain state...");

  const states = await contract.getAllStates();
  for (let i = 0; i < 3; i++) {
    const n = states[i];
    console.log(
      `   [${i}] ${n.name.padEnd(16)} treasury=${n.treasury}  tech=${n.techScore}  mil=${n.militaryScore}  dip=${n.diplomacyScore}`
    );
  }

  const cycle = await contract.getCycleNumber();
  console.log(`   Cycle: ${cycle}`);

  // ---- Persist deployment manifest ----
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const manifest = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    contractAddress,
    deployerAddress: deployer.address,
    executorAddress,
    deployTxHash: deployTx?.hash ?? "",
    deployedAt: new Date().toISOString(),
    blockExplorerUrl: `https://sepolia.basescan.org/address/${contractAddress}`,
  };

  const manifestPath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📄 Deployment manifest saved to: ${manifestPath}`);

  // ---- Contract verification ----
  // Verification is attempted after a short delay to give Basescan time to
  // index the newly deployed contract. On local networks it is skipped.
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nWaiting 15 seconds for Basescan to index the contract...");
    await new Promise((resolve) => setTimeout(resolve, 15_000));

    console.log("Submitting verification request to Basescan...");
    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: [executorAddress],
      });
      console.log("✅ Contract verified on Basescan.");
    } catch (err: unknown) {
      // A "Already Verified" error is not a failure — surface everything else.
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes("already verified")) {
        console.log("ℹ️  Contract is already verified.");
      } else {
        console.warn(`⚠️  Verification failed: ${message}`);
        console.warn(
          "   You can verify manually with:\n" +
            `   npx hardhat verify --network ${network.name} ${contractAddress} ${executorAddress}`
        );
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Deployment complete.");
  console.log("=".repeat(60));
  console.log("\nNext steps:");
  console.log("  1. Copy CONTRACT_ADDRESS from the manifest into your backend .env");
  console.log(`     CONTRACT_ADDRESS=${contractAddress}`);
  console.log("  2. Ensure EXECUTOR_ADDRESS in .env matches the executor wallet");
  console.log("  3. Fund the executor wallet with Base Sepolia ETH if needed");
  console.log("  4. Start the backend: cd ../backend && npm run dev\n");
}

main().catch((error: Error) => {
  console.error("\n❌ Deployment failed:", error.message);
  process.exitCode = 1;
});
