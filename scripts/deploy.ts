import { ethers } from "hardhat";

async function main() {
  const Scheduler = await ethers.getContractFactory("ZegasScheduler");
  const scheduler = await Scheduler.deploy();
  await scheduler.waitForDeployment();
  console.log("ZegasScheduler deployed to:", await scheduler.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
