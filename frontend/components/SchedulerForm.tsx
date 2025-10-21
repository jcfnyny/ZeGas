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
    <div className="w-full max-w-md space-y-4 p-6 bg-kraken-dark/50 backdrop-blur-xl rounded-xl shadow-2xl border border-kraken-purple/20">
      <h2 className="text-2xl font-bold text-white mb-4">Schedule Transaction</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Target Address</label>
          <input 
            className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded-lg font-mono text-sm focus:outline-none focus:border-kraken-purple transition-colors" 
            placeholder="0x..." 
            value={target} 
            onChange={e=>setTarget(e.target.value)} 
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Max Gas (gwei)</label>
          <input 
            className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded-lg text-sm focus:outline-none focus:border-kraken-purple transition-colors" 
            placeholder="e.g. 50" 
            value={gas} 
            onChange={e=>setGas(e.target.value)} 
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">ETH to Send (optional)</label>
          <input 
            className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded-lg text-sm focus:outline-none focus:border-kraken-purple transition-colors" 
            placeholder="0.0" 
            value={amountEth} 
            onChange={e=>setAmountEth(e.target.value)} 
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Deadline Block (optional)</label>
          <input 
            className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded-lg text-sm focus:outline-none focus:border-kraken-purple transition-colors" 
            placeholder="999999999" 
            value={deadline} 
            onChange={e=>setDeadline(e.target.value)} 
          />
        </div>
      </div>
      
      <button 
        onClick={createJob} 
        className="w-full bg-gradient-to-r from-kraken-purple to-kraken-accent hover:from-kraken-accent hover:to-kraken-purple text-white font-semibold p-4 rounded-lg transition-all shadow-lg shadow-kraken-purple/30"
      >
        Create Job
      </button>
    </div>
  );
}
