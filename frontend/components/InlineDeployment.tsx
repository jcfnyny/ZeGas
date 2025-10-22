import { useState } from "react";

type Props = {
  onAddressSelected: (address: string) => void;
};

type DeploymentOption = "existing" | "l1" | "l2";

const NETWORKS = [
  { id: "sepolia", name: "Sepolia Testnet", chainId: 11155111, rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/demo" },
  { id: "mainnet", name: "Ethereum Mainnet", chainId: 1, rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/demo" },
  { id: "arbitrum", name: "Arbitrum One", chainId: 42161, rpcUrl: "https://arb1.arbitrum.io/rpc" },
  { id: "optimism", name: "Optimism", chainId: 10, rpcUrl: "https://mainnet.optimism.io" },
  { id: "base", name: "Base", chainId: 8453, rpcUrl: "https://mainnet.base.org" },
  { id: "polygon", name: "Polygon", chainId: 137, rpcUrl: "https://polygon-rpc.com" },
  { id: "zksync", name: "zkSync Era", chainId: 324, rpcUrl: "https://mainnet.era.zksync.io" },
  { id: "linea", name: "Linea", chainId: 59144, rpcUrl: "https://rpc.linea.build" },
  { id: "scroll", name: "Scroll", chainId: 534352, rpcUrl: "https://rpc.scroll.io" },
  { id: "custom", name: "Custom RPC", chainId: 0, rpcUrl: "" },
];

const STORAGE_KEY = "zegas_contract_address";

export default function InlineDeployment({ onAddressSelected }: Props) {
  const [selectedOption, setSelectedOption] = useState<DeploymentOption | null>(null);
  const [customAddress, setCustomAddress] = useState("");
  
  const [contractType, setContractType] = useState<"l1" | "l2">("l1");
  const [network, setNetwork] = useState("sepolia");
  const [customRpcUrl, setCustomRpcUrl] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [maxGasPrice, setMaxGasPrice] = useState("50");
  const [minGasPrice, setMinGasPrice] = useState("10");
  const [gasTimeout, setGasTimeout] = useState("300");
  const [verifyContract, setVerifyContract] = useState(true);
  const [etherscanApiKey, setEtherscanApiKey] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState("");
  const [deploymentStatus, setDeploymentStatus] = useState("");
  
  const [platformFeeBps, setPlatformFeeBps] = useState("10");
  const [feeCollector, setFeeCollector] = useState("");
  const [relayerAddresses, setRelayerAddresses] = useState("");

  const selectedNetwork = NETWORKS.find((n) => n.id === network) || NETWORKS[0];
  const rpcUrl = network === "custom" ? customRpcUrl : selectedNetwork.rpcUrl;

  const handleExistingContract = () => {
    if (!customAddress || customAddress.trim() === "") {
      alert("Please enter a valid contract address.");
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(customAddress)) {
      alert("Invalid Ethereum address format. Must be 42 characters starting with 0x.");
      return;
    }

    localStorage.setItem(STORAGE_KEY, customAddress);
    onAddressSelected(customAddress);
  };

  const deployContract = async (type: "l1" | "l2") => {
    setError("");
    setDeploymentStatus("");

    if (!privateKey || !rpcUrl) {
      setError("Please provide all required fields");
      return;
    }

    if (privateKey.length !== 64 && privateKey.length !== 66) {
      setError("Invalid private key format (should be 64 hex characters)");
      return;
    }

    setDeploying(true);
    setDeploymentStatus("Preparing deployment...");

    try {
      const response = await fetch("/api/deploy-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractType: type,
          rpcUrl,
          privateKey: privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`,
          minGasPrice: minGasPrice ? parseInt(minGasPrice) : undefined,
          maxGasPrice: maxGasPrice ? parseInt(maxGasPrice) : undefined,
          gasTimeout: gasTimeout ? parseInt(gasTimeout) : 300,
          chainId: selectedNetwork.chainId,
          verifyContract,
          etherscanApiKey: verifyContract ? etherscanApiKey : undefined,
          platformFeeBps: platformFeeBps ? parseInt(platformFeeBps) : 10,
          feeCollector: feeCollector || undefined,
          relayerAddresses: relayerAddresses ? relayerAddresses.split(',').map(addr => addr.trim()).filter(addr => addr) : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Deployment failed");
      }

      let successMessage = `Contract deployed to ${data.address}`;
      let verificationMessage = "";
      
      if (data.verificationStatus === "verified") {
        verificationMessage = "Contract verified on Etherscan!";
      } else if (data.verificationStatus === "already_verified") {
        verificationMessage = "Contract was already verified!";
      } else if (data.verificationStatus === "failed") {
        verificationMessage = "Contract deployed but verification failed";
      }
      
      setDeploymentStatus(verificationMessage ? `${successMessage}\n${verificationMessage}` : successMessage);
      setTimeout(() => {
        onAddressSelected(data.address);
        setPrivateKey("");
        setEtherscanApiKey("");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Deployment failed");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">Choose Your Setup</h2>
        <p className="text-gray-400">Select how you want to configure your gas-aware transfer scheduler</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => setSelectedOption(selectedOption === "existing" ? null : "existing")}
          className={`p-6 rounded-xl border-2 transition-all ${
            selectedOption === "existing"
              ? "border-kraken-purple bg-kraken-purple/10 shadow-lg shadow-kraken-purple/30"
              : "border-kraken-purple/30 bg-kraken-dark/50 hover:border-kraken-purple/50"
          }`}
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-kraken-purple/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-kraken-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Existing Contract</h3>
            <p className="text-gray-400 text-sm">Already deployed? Connect your contract address</p>
          </div>
        </button>

        <button
          onClick={() => setSelectedOption(selectedOption === "l1" ? null : "l1")}
          className={`p-6 rounded-xl border-2 transition-all ${
            selectedOption === "l1"
              ? "border-kraken-purple bg-kraken-purple/10 shadow-lg shadow-kraken-purple/30"
              : "border-kraken-purple/30 bg-kraken-dark/50 hover:border-kraken-purple/50"
          }`}
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-kraken-purple/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-kraken-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">ZeGas Smart Transfer</h3>
            <p className="text-gray-400 text-sm">L1-focused with gas-aware scheduling</p>
          </div>
        </button>

        <button
          onClick={() => setSelectedOption(selectedOption === "l2" ? null : "l2")}
          className={`p-6 rounded-xl border-2 transition-all relative ${
            selectedOption === "l2"
              ? "border-kraken-purple bg-kraken-purple/10 shadow-lg shadow-kraken-purple/30"
              : "border-kraken-purple/30 bg-kraken-dark/50 hover:border-kraken-purple/50"
          }`}
        >
          <div className="absolute top-2 right-2 bg-kraken-accent text-white text-xs font-bold px-2 py-1 rounded">NEW</div>
          <div className="text-center">
            <div className="w-12 h-12 bg-kraken-purple/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-kraken-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">ZeGas L2 Optimizer</h3>
            <p className="text-gray-400 text-sm">Multi-L2 routing for 95% cost savings</p>
          </div>
        </button>
      </div>

      {selectedOption === "existing" && (
        <div className="bg-kraken-dark/60 backdrop-blur-md rounded-xl p-8 border border-kraken-purple/30 animate-fadeIn">
          <h3 className="text-xl font-bold text-white mb-4">Connect Existing Contract</h3>
          <p className="text-gray-400 text-sm mb-6">Enter your deployed ZegasSmartTransfer or ZegasL2Optimizer contract address</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Contract Address</label>
              <input
                type="text"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder="0x..."
                className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded font-mono text-sm focus:border-kraken-purple focus:outline-none"
              />
            </div>

            <button
              onClick={handleExistingContract}
              className="w-full bg-gradient-to-r from-kraken-purple to-kraken-accent text-white font-semibold py-3 px-6 rounded-lg hover:from-kraken-accent hover:to-kraken-purple transition-all shadow-lg shadow-kraken-purple/30"
            >
              Connect to Contract
            </button>
          </div>
        </div>
      )}

      {(selectedOption === "l1" || selectedOption === "l2") && (
        <div className="bg-kraken-dark/60 backdrop-blur-md rounded-xl p-8 border border-kraken-purple/30 animate-fadeIn">
          <h3 className="text-xl font-bold text-white mb-2">
            Deploy {selectedOption === "l1" ? "ZeGas Smart Transfer" : "ZeGas L2 Optimizer"}
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            {selectedOption === "l1" 
              ? "L1-focused gas-aware scheduler with time windows and permit support"
              : "Multi-L2 optimizer that routes to the cheapest network"}
          </p>

          <div className="bg-kraken-purple/10 border border-kraken-purple/30 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-300">
              <span className="text-gray-400">Features:</span> {selectedOption === "l1"
                ? "Gas-aware scheduling, Time windows, EIP-2612 permit, Relayer system"
                : "Multi-L2 routing, Cross-chain messaging, Paymaster support, Batch bundling"}
            </p>
            <p className="text-sm text-gray-300 mt-1">
              <span className="text-gray-400">Supported Networks:</span> {selectedOption === "l1"
                ? "Ethereum, Sepolia, Polygon, Arbitrum"
                : "7 EVM-compatible L2s (Arbitrum, Optimism, Base, zkSync, Linea, Scroll, Polygon)"}
            </p>
            <p className="text-sm text-gray-300 mt-1">
              <span className="text-gray-400">Estimated Gas:</span> {selectedOption === "l1" ? "~1.5M gas (~0.03 ETH at 20 Gwei)" : "~2.0M gas (~0.04 ETH at 20 Gwei)"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Platform Fee (basis points)
              </label>
              <input
                type="number"
                value={platformFeeBps}
                onChange={(e) => setPlatformFeeBps(e.target.value)}
                placeholder="10"
                min="0"
                max="1000"
                className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded focus:border-kraken-purple focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Default: 10 = 0.1% fee. Max: 1000 = 10%</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fee Collector Address (optional)
              </label>
              <input
                type="text"
                value={feeCollector}
                onChange={(e) => setFeeCollector(e.target.value)}
                placeholder="0x... (defaults to deployer)"
                className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded font-mono text-sm focus:border-kraken-purple focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Relayer Addresses (optional, comma-separated)
            </label>
            <input
              type="text"
              value={relayerAddresses}
              onChange={(e) => setRelayerAddresses(e.target.value)}
              placeholder="0x..., 0x..., 0x..."
              className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded font-mono text-sm focus:border-kraken-purple focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">Addresses authorized to execute scheduled transactions</p>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Deployment Network</label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded focus:border-kraken-purple focus:outline-none"
            >
              {NETWORKS.map((net) => (
                <option key={net.id} value={net.id}>
                  {net.name}
                </option>
              ))}
            </select>
          </div>

          {network === "custom" && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Custom RPC URL</label>
              <input
                type="text"
                value={customRpcUrl}
                onChange={(e) => setCustomRpcUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded focus:border-kraken-purple focus:outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Min Gas Price (Gwei)</label>
              <input
                type="number"
                value={minGasPrice}
                onChange={(e) => setMinGasPrice(e.target.value)}
                placeholder="10"
                className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded focus:border-kraken-purple focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Max Gas Price (Gwei)</label>
              <input
                type="number"
                value={maxGasPrice}
                onChange={(e) => setMaxGasPrice(e.target.value)}
                placeholder="50"
                className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded focus:border-kraken-purple focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Gas Wait Timeout (seconds)</label>
              <input
                type="number"
                value={gasTimeout}
                onChange={(e) => setGasTimeout(e.target.value)}
                placeholder="300"
                className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded focus:border-kraken-purple focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Private Key
            </label>
            <input
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="Your private key (not stored)"
              className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded font-mono text-sm focus:border-kraken-purple focus:outline-none"
            />
            <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Used only for deployment, not stored
            </p>
          </div>

          <div className="mt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={verifyContract}
                onChange={(e) => setVerifyContract(e.target.checked)}
                className="w-4 h-4 accent-kraken-purple"
              />
              <span className="text-sm text-gray-300">Verify contract on Etherscan</span>
            </label>
          </div>

          {verifyContract && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Etherscan API Key (optional)
              </label>
              <input
                type="text"
                value={etherscanApiKey}
                onChange={(e) => setEtherscanApiKey(e.target.value)}
                placeholder="Your Etherscan API key"
                className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded focus:border-kraken-purple focus:outline-none"
              />
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-900/30 border border-red-500/50 text-red-200 p-4 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {deploymentStatus && (
            <div className="mt-6 bg-green-900/30 border border-green-500/50 text-green-200 p-4 rounded-lg">
              <p className="text-sm whitespace-pre-line">{deploymentStatus}</p>
            </div>
          )}

          <button
            onClick={() => deployContract(selectedOption as "l1" | "l2")}
            disabled={deploying}
            className="w-full mt-6 bg-gradient-to-r from-kraken-purple to-kraken-accent text-white font-semibold py-4 px-6 rounded-lg hover:from-kraken-accent hover:to-kraken-purple transition-all shadow-lg shadow-kraken-purple/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {deploying ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deploying...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Deploy Contract
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
