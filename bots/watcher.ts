import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const abi = [
  "function jobCount() view returns (uint256)",
  "function jobs(uint256) view returns (address owner, address target, uint256 value, bytes data, uint256 maxGasGwei, uint64 startBlock, uint64 deadlineBlock, uint256 bountyWei, bool executed, bool canceled)",
  "function execute(uint256 jobId, uint256 gasObservationGwei) external",
];
const address = process.env.SCHEDULER_ADDRESS!;
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.RELAYER_KEY!, provider);
const scheduler = new ethers.Contract(address, abi, wallet);

async function getGasGwei() {
  const fee = await provider.getFeeData();
  const gp = fee.gasPrice ?? ethers.parseUnits("30", "gwei");
  return Number(ethers.formatUnits(gp, "gwei"));
}

async function step() {
  const count: bigint = await scheduler.jobCount();
  const nowBlock = await provider.getBlockNumber();
  for (let id = 1n; id <= count; id++) {
    const j = await scheduler.jobs(id);
    if (!j.executed && !j.canceled && j.startBlock <= nowBlock && nowBlock <= j.deadlineBlock) {
      const gas = await getGasGwei();
      if (gas <= Number(j.maxGasGwei)) {
        console.log(`Executing job ${id} @ ${gas} gwei`);
        try {
          const tx = await scheduler.execute(id, gas);
          await tx.wait();
          console.log(`✔ Executed job ${id}`);
        } catch (e:any) {
          console.error(`✖ Execute failed for job ${id}:`, e?.message || e);
        }
      }
    }
  }
}

(async () => {
  console.log("ZeGas watcher started.");
  setInterval(step, 30000);
})();
