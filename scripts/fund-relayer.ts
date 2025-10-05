import { ethers } from "hardhat";

// Example script to fund a relayer from the first local account
async function main() {
  const [deployer] = await ethers.getSigners();
  const relayer = process.env.RELAYER_ADDR;
  if (!relayer) throw new Error("Set RELAYER_ADDR in env");
  const tx = await deployer.sendTransaction({ to: relayer, value: ethers.parseEther("0.05") });
  await tx.wait();
  console.log("Funded relayer:", relayer);
}
main().catch((e)=>{console.error(e); process.exit(1)});
