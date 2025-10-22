import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Deploying ZegasL2Optimizer contract...");

  // Get deployment parameters from environment variables or use defaults
  const platformFeeBps = process.env.PLATFORM_FEE_BPS 
    ? parseInt(process.env.PLATFORM_FEE_BPS) 
    : 10; // 0.1% default
  
  const feeCollector = process.env.FEE_COLLECTOR || "";
  
  const relayerAddresses = process.env.RELAYER_ADDRESSES
    ? process.env.RELAYER_ADDRESSES.split(",").map(addr => addr.trim())
    : [];

  console.log("Deployment parameters:");
  console.log("- Platform Fee (bps):", platformFeeBps);
  console.log("- Fee Collector:", feeCollector || "(deployer address)");
  console.log("- Initial Relayers:", relayerAddresses.length > 0 ? relayerAddresses : "(none)");

  const ZegasL2Optimizer = await ethers.getContractFactory("ZegasL2Optimizer");
  const optimizer = await ZegasL2Optimizer.deploy(
    platformFeeBps,
    feeCollector,
    relayerAddresses
  );

  await optimizer.waitForDeployment();
  const address = await optimizer.getAddress();

  console.log("\n✅ ZegasL2Optimizer deployed to:", address);
  console.log("\nContract Features:");
  console.log("- Multi-L2 support (Arbitrum, Optimism, Base, zkSync, Linea)");
  console.log("- Dynamic gas price routing");
  console.log("- Cross-chain messaging ready (CCIP/LayerZero)");
  console.log("- Paymaster support for stablecoin fees");
  console.log("- Batch transaction bundling");
  console.log("- L1 fallback option");
  console.log("\nSave this address to your .env file:");
  console.log(`L2_OPTIMIZER_ADDRESS=${address}`);

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
