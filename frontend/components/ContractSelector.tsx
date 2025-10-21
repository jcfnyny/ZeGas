import { useState, useEffect } from "react";
import ContractDeployer from "./ContractDeployer";

type NetworkConfig = {
  name: string;
  address: string;
  chainId: number;
  isPlaceholder?: boolean;
};

const KNOWN_CONTRACTS: NetworkConfig[] = [
  {
    name: "Not yet deployed - Deploy your own contract first",
    address: "",
    chainId: 11155111,
    isPlaceholder: true,
  },
];

const STORAGE_KEY = "zegas_contract_address";

type Props = {
  onAddressSelected: (address: string) => void;
};

export default function ContractSelector({ onAddressSelected }: Props) {
  const [selectedOption, setSelectedOption] = useState<"preset" | "custom">("custom");
  const [presetIndex, setPresetIndex] = useState(0);
  const [customAddress, setCustomAddress] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setCustomAddress(saved);
      setSelectedOption("custom");
      onAddressSelected(saved);
      setIsConfigured(true);
    } else if (process.env.NEXT_PUBLIC_SCHEDULER) {
      const envAddress = process.env.NEXT_PUBLIC_SCHEDULER;
      const presetIdx = KNOWN_CONTRACTS.findIndex(c => c.address === envAddress);
      if (presetIdx >= 0) {
        setPresetIndex(presetIdx);
        setSelectedOption("preset");
      } else {
        setCustomAddress(envAddress);
        setSelectedOption("custom");
      }
      onAddressSelected(envAddress);
      setIsConfigured(true);
    }
  }, []);

  const handleConnect = () => {
    const address = selectedOption === "preset" 
      ? KNOWN_CONTRACTS[presetIndex].address 
      : customAddress;

    if (!address || address.trim() === "") {
      alert("Please enter a valid contract address. You must deploy the ZegasScheduler contract first.");
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      alert("Invalid Ethereum address format. Must be 42 characters starting with 0x.");
      return;
    }

    localStorage.setItem(STORAGE_KEY, address);
    onAddressSelected(address);
    setIsConfigured(true);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsConfigured(false);
    onAddressSelected("");
  };

  if (isConfigured) {
    const currentAddress = selectedOption === "preset" 
      ? KNOWN_CONTRACTS[presetIndex].address 
      : customAddress;
    
    return (
      <div className="w-full max-w-md space-y-4 p-6 bg-kraken-dark/50 backdrop-blur-xl rounded-lg border border-kraken-purple/20">
        <div className="space-y-2">
          <p className="text-sm text-gray-400">Connected to contract:</p>
          <code className="block text-xs bg-kraken-darker p-3 rounded border border-kraken-purple/20 break-all text-gray-300">
            {currentAddress}
          </code>
        </div>
        <button
          onClick={handleReset}
          className="w-full bg-kraken-dark border border-kraken-purple/30 text-white p-2 rounded hover:bg-kraken-purple/20 transition-colors"
        >
          Change Contract
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-4 p-6 bg-kraken-dark/50 backdrop-blur-xl rounded-lg shadow-2xl border border-kraken-purple/20">
      <h2 className="text-xl font-semibold mb-2 text-white">Connect to ZegasScheduler</h2>
      <p className="text-sm text-gray-400 mb-4">
        Enter your deployed contract address to start scheduling transactions.
      </p>
      
      <div className="space-y-3">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="contract-option"
            checked={selectedOption === "preset"}
            onChange={() => setSelectedOption("preset")}
            className="w-4 h-4 accent-kraken-purple"
          />
          <span className="text-sm text-white">Use official contract</span>
        </label>

        {selectedOption === "preset" && (
          <div className="ml-6 space-y-2">
            <select
              value={presetIndex}
              onChange={(e) => setPresetIndex(Number(e.target.value))}
              className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-2 rounded text-sm"
              disabled={KNOWN_CONTRACTS[presetIndex].isPlaceholder}
            >
              {KNOWN_CONTRACTS.map((contract, idx) => (
                <option key={idx} value={idx}>
                  {contract.name}
                </option>
              ))}
            </select>
            {KNOWN_CONTRACTS[presetIndex].isPlaceholder && (
              <p className="text-xs text-amber-400 bg-amber-900/30 p-2 rounded border border-amber-700/50 flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                No official contracts available yet. Use the custom option below.
              </p>
            )}
          </div>
        )}

        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="contract-option"
            checked={selectedOption === "custom"}
            onChange={() => setSelectedOption("custom")}
            className="w-4 h-4 accent-kraken-purple"
          />
          <span className="text-sm text-white">Enter your contract address</span>
        </label>

        {selectedOption === "custom" && (
          <input
            type="text"
            value={customAddress}
            onChange={(e) => setCustomAddress(e.target.value)}
            placeholder="0x..."
            className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-2 rounded ml-6 font-mono text-sm focus:border-kraken-purple focus:outline-none"
          />
        )}
      </div>

      <div className="pt-4">
        <button
          onClick={handleConnect}
          className="w-full bg-gradient-to-r from-kraken-purple to-kraken-accent text-white p-3 rounded hover:from-kraken-accent hover:to-kraken-purple font-semibold transition-all shadow-lg shadow-kraken-purple/30"
        >
          Connect to Contract
        </button>
      </div>

      <div className="bg-kraken-purple/10 border border-kraken-purple/30 p-4 rounded space-y-3">
        <p className="font-semibold text-white text-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Don't have a contract yet?
        </p>
        <p className="text-gray-300 text-xs">
          Deploy your own ZegasTokenTransfer contract with custom parameters directly from your browser.
        </p>
        <ContractDeployer 
          onDeploySuccess={(address) => {
            setCustomAddress(address);
            setSelectedOption("custom");
            localStorage.setItem(STORAGE_KEY, address);
            onAddressSelected(address);
            setIsConfigured(true);
          }} 
        />
      </div>
    </div>
  );
}
