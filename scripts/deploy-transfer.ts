import { ethers } from "hardhat";

async function main() {
  console.log("Deploying ZegasTokenTransfer contract...");

  const ZegasTokenTransfer = await ethers.getContractFactory("ZegasTokenTransfer");
  const contract = await ZegasTokenTransfer.deploy();
  
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`ZegasTokenTransfer deployed to: ${address}`);
  console.log(`\nAdd this to your .env file:`);
  console.log(`TRANSFER_CONTRACT_ADDRESS=${address}`);
  console.log(`NEXT_PUBLIC_TRANSFER_CONTRACT=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
