import { useState, useEffect } from "react";

type NetworkConfig = {
  name: string;
  address: string;
  chainId: number;
};

const KNOWN_CONTRACTS: NetworkConfig[] = [
  {
    name: "Sepolia Testnet (Official)",
    address: "0x0000000000000000000000000000000000000000",
    chainId: 11155111,
  },
];

const STORAGE_KEY = "zegas_contract_address";

type Props = {
  onAddressSelected: (address: string) => void;
};

export default function ContractSelector({ onAddressSelected }: Props) {
  const [selectedOption, setSelectedOption] = useState<"preset" | "custom">("preset");
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

    if (!address || address === "0x0000000000000000000000000000000000000000") {
      alert("Please enter a valid contract address or deploy your own ZegasScheduler contract.");
      return;
    }

    if (selectedOption === "custom" && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
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
    <div className="w-full max-w-md space-y-4 p-6 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Select ZegasScheduler Contract</h2>
      
      <div className="space-y-3">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="contract-option"
            checked={selectedOption === "preset"}
            onChange={() => setSelectedOption("preset")}
            className="w-4 h-4"
          />
          <span>Use pre-configured contract</span>
        </label>

        {selectedOption === "preset" && (
          <select
            value={presetIndex}
            onChange={(e) => setPresetIndex(Number(e.target.value))}
            className="w-full border p-2 rounded ml-6"
          >
            {KNOWN_CONTRACTS.map((contract, idx) => (
              <option key={idx} value={idx}>
                {contract.name}
              </option>
            ))}
          </select>
        )}

        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="contract-option"
            checked={selectedOption === "custom"}
            onChange={() => setSelectedOption("custom")}
            className="w-4 h-4"
          />
          <span>Enter custom contract address</span>
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
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 font-semibold"
        >
          Connect to Contract
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Don't have a contract? Deploy ZegasScheduler to your preferred network first.
      </p>
    </div>
  );
}
