import { useState } from "react";
import { ethers } from "ethers";

type Props = { schedulerAddress: string };

export default function SchedulerForm({ schedulerAddress }: Props) {
  const [target, setTarget] = useState("");
  const [gas, setGas] = useState("");
  const [amountEth, setAmountEth] = useState("");
  const [deadline, setDeadline] = useState("999999999");

  const createJob = async () => {
    if (!window.ethereum) return alert("Please connect a wallet.");
    const provider = new ethers.BrowserProvider(window.ethereum as any);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(
      schedulerAddress,
      ["function createJob(address,uint256,bytes,uint256,uint64,uint64) payable returns (uint256)"],
      signer
    );
    const bounty = ethers.parseEther("0.001"); // demo bounty
    const value = amountEth ? ethers.parseEther(amountEth) : 0n;
    const tx = await contract.createJob(target, value, "0x", Number(gas), 0, Number(deadline), { value: bounty + value });
    await tx.wait();
    alert("Job created!");
  };

  return (
    <div className="w-full max-w-md space-y-2">
      <input className="w-full border p-2 rounded" placeholder="Target address" value={target} onChange={e=>setTarget(e.target.value)} />
      <input className="w-full border p-2 rounded" placeholder="Max Gas (gwei)" value={gas} onChange={e=>setGas(e.target.value)} />
      <input className="w-full border p-2 rounded" placeholder="ETH to send (optional)" value={amountEth} onChange={e=>setAmountEth(e.target.value)} />
      <input className="w-full border p-2 rounded" placeholder="Deadline block (optional)" value={deadline} onChange={e=>setDeadline(e.target.value)} />
      <button onClick={createJob} className="w-full bg-blue-600 text-white p-2 rounded">Create Job</button>
    </div>
  );
}
