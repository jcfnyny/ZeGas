import { ethers } from "hardhat";

async function main() {
  console.log("Deploying ZegasSmartTransfer...");

  const ZegasSmartTransfer = await ethers.getContractFactory("ZegasSmartTransfer");
  const contract = await ZegasSmartTransfer.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("ZegasSmartTransfer deployed to:", address);
  console.log("Save this address to your .env file as SCHEDULER_ADDRESS");
  
  // Authorize deployer as initial relayer
  const [deployer] = await ethers.getSigners();
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
