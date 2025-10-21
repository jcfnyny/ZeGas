import { useState, useEffect } from "react";

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
      <div className="w-full max-w-md space-y-4 p-6 bg-gray-50 rounded-lg">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Connected to contract:</p>
          <code className="block text-xs bg-white p-2 rounded border break-all">
            {currentAddress}
          </code>
        </div>
        <button
          onClick={handleReset}
          className="w-full bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
        >
          Change Contract
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-4 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-2">Connect to ZegasScheduler</h2>
      <p className="text-sm text-gray-600 mb-4">
        Enter your deployed contract address to start scheduling transactions.
      </p>
      
      <div className="space-y-3">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="contract-option"
            checked={selectedOption === "preset"}
            onChange={() => setSelectedOption("preset")}
            className="w-4 h-4"
          />
          <span className="text-sm">Use official contract</span>
        </label>

        {selectedOption === "preset" && (
          <div className="ml-6 space-y-2">
            <select
              value={presetIndex}
              onChange={(e) => setPresetIndex(Number(e.target.value))}
              className="w-full border p-2 rounded text-sm"
              disabled={KNOWN_CONTRACTS[presetIndex].isPlaceholder}
            >
              {KNOWN_CONTRACTS.map((contract, idx) => (
                <option key={idx} value={idx}>
                  {contract.name}
                </option>
              ))}
            </select>
            {KNOWN_CONTRACTS[presetIndex].isPlaceholder && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ No official contracts available yet. Use the custom option below.
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
            className="w-4 h-4"
          />
          <span className="text-sm">Enter your contract address</span>
        </label>

        {selectedOption === "custom" && (
          <input
            type="text"
            value={customAddress}
            onChange={(e) => setCustomAddress(e.target.value)}
            placeholder="0x..."
            className="w-full border p-2 rounded ml-6 font-mono text-sm"
          />
        )}
      </div>

      <div className="pt-4">
        <button
          onClick={handleConnect}
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 font-semibold transition-colors"
        >
          Connect to Contract
        </button>
      </div>

      <div className="bg-blue-50 p-4 rounded text-sm space-y-2">
        <p className="font-semibold text-blue-900">📝 Need to deploy a contract?</p>
        <p className="text-blue-800">
          Run <code className="bg-blue-100 px-1 rounded">npm run deploy</code> in the terminal to deploy ZegasScheduler to Sepolia testnet.
        </p>
      </div>
    </div>
  );
}
