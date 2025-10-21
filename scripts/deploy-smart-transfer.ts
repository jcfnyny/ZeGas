import { ethers } from "hardhat";

async function main() {
  console.log("Deploying ZegasSmartTransfer...");

  // Get deployment parameters from environment or use defaults
  const platformFeeBps = process.env.PLATFORM_FEE_BPS || "10"; // 0.1% default
  const [deployer] = await ethers.getSigners();
  const feeCollector = process.env.FEE_COLLECTOR || deployer.address;

  console.log("Deployment parameters:");
  console.log("- Platform fee:", platformFeeBps, "basis points");
  console.log("- Fee collector:", feeCollector);

  const ZegasSmartTransfer = await ethers.getContractFactory("ZegasSmartTransfer");
  const contract = await ZegasSmartTransfer.deploy(platformFeeBps, feeCollector);

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("ZegasSmartTransfer deployed to:", address);
  console.log("Save this address to your .env file as SCHEDULER_ADDRESS");
  
  // Authorize deployer as initial relayer
  console.log("Authorizing deployer as relayer:", deployer.address);
  await contract.setRelayerAuthorization(deployer.address, true);
  console.log("Relayer authorized successfully");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
