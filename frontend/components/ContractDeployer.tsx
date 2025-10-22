import { useState } from "react";

type Props = {
  onDeploySuccess: (address: string) => void;
};

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

export default function ContractDeployer({ onDeploySuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false);
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

  const deployContract = async () => {
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
          contractType,
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

      let successMessage = `Contract deployed to ${data.address.substring(0, 10)}...`;
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
        onDeploySuccess(data.address);
        setIsOpen(false);
        setPrivateKey("");
        setEtherscanApiKey("");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Deployment failed");
    } finally {
      setDeploying(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-gradient-to-r from-kraken-purple to-kraken-accent hover:from-kraken-accent hover:to-kraken-purple text-white font-semibold py-4 px-6 rounded-lg transition-all shadow-lg shadow-kraken-purple/30 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        Deploy Contract
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-kraken-dark border border-kraken-purple/30 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-kraken-purple/20 to-kraken-accent/20 border-b border-kraken-purple/30 p-6 backdrop-blur-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Deploy ZeGas Contract</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-2">Choose your contract type and configure deployment parameters</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Contract Type Selector */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-white mb-3">
              Contract Type
              <span className="text-gray-400 ml-2 font-normal text-xs">Choose your optimization strategy</span>
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* L1-Focused Option */}
              <button
                onClick={() => setContractType("l1")}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  contractType === "l1"
                    ? "border-kraken-purple bg-kraken-purple/20 shadow-lg shadow-kraken-purple/30"
                    : "border-kraken-purple/30 bg-kraken-darker/50 hover:border-kraken-purple/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    contractType === "l1" ? "border-kraken-purple bg-kraken-purple" : "border-gray-500"
                  }`}>
                    {contractType === "l1" && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white mb-1">ZegasSmartTransfer</h4>
                    <p className="text-xs text-gray-400 mb-2">L1-Focused Gas Optimizer</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>✓ Gas-aware scheduling</li>
                      <li>✓ Time windows</li>
                      <li>✓ EIP-2612 permit support</li>
                      <li>✓ Single-layer execution</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* L2-Optimized Option */}
              <button
                onClick={() => setContractType("l2")}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  contractType === "l2"
                    ? "border-kraken-accent bg-kraken-accent/20 shadow-lg shadow-kraken-accent/30"
                    : "border-kraken-purple/30 bg-kraken-darker/50 hover:border-kraken-purple/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    contractType === "l2" ? "border-kraken-accent bg-kraken-accent" : "border-gray-500"
                  }`}>
                    {contractType === "l2" && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-1">
                      ZegasL2Optimizer
                      <span className="text-xs bg-gradient-to-r from-kraken-purple to-kraken-accent text-white px-2 py-0.5 rounded-full">NEW</span>
                    </h4>
                    <p className="text-xs text-gray-400 mb-2">Cross-Layer Gas Optimizer</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>✓ Multi-L2 routing (Arbitrum, Base, etc.)</li>
                      <li>✓ Cross-chain messaging</li>
                      <li>✓ Dynamic gas comparison</li>
                      <li>✓ 95% cost reduction</li>
                    </ul>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Contract Info */}
          <div className="bg-kraken-purple/10 border border-kraken-purple/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-kraken-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Contract Information
            </h3>
            <div className="text-xs text-gray-300 space-y-1">
              <p><span className="text-gray-400">Name:</span> {contractType === "l1" ? "ZegasSmartTransfer" : "ZegasL2Optimizer"}</p>
              <p><span className="text-gray-400">Version:</span> 2.0.0</p>
              {contractType === "l1" ? (
                <>
                  <p><span className="text-gray-400">Features:</span> Gas-aware scheduling, Time windows, EIP-2612 permit, Relayer system</p>
                  <p><span className="text-gray-400">Estimated Gas:</span> ~1.5M gas (~0.03 ETH at 20 Gwei)</p>
                </>
              ) : (
                <>
                  <p><span className="text-gray-400">Features:</span> Multi-L2 routing, Cross-chain messaging, Paymaster support, Batch bundling</p>
                  <p><span className="text-gray-400">Supported Networks:</span> 7 EVM-compatible L2s (Arbitrum, Optimism, Base, zkSync, Linea, Scroll, Polygon)</p>
                  <p><span className="text-gray-400">Estimated Gas:</span> ~2.0M gas (~0.04 ETH at 20 Gwei)</p>
                </>
              )}
            </div>
          </div>

          {/* Contract Configuration */}
          <div className="bg-kraken-darker/50 border border-kraken-purple/20 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-kraken-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Contract Configuration
            </h3>
            
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                Platform Fee (basis points)
                <span className="text-gray-500 ml-2 font-normal">1 bp = 0.01%, max 1000 bp (10%)</span>
              </label>
              <input
                type="number"
                value={platformFeeBps}
                onChange={(e) => setPlatformFeeBps(e.target.value)}
                placeholder="10"
                min="0"
                max="1000"
                className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-2 rounded text-sm focus:outline-none focus:border-kraken-purple transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">Default: 10 bp (0.1%) - Fee charged on each transfer</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                Fee Collector Address
                <span className="text-gray-500 ml-2 font-normal">(optional - defaults to your address)</span>
              </label>
              <input
                type="text"
                value={feeCollector}
                onChange={(e) => setFeeCollector(e.target.value)}
                placeholder="0x... (leave empty to use your address)"
                className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-2 rounded text-sm font-mono focus:outline-none focus:border-kraken-purple transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">Address that receives platform fees</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                Initial Relayer Addresses
                <span className="text-gray-500 ml-2 font-normal">(optional - comma separated)</span>
              </label>
              <textarea
                value={relayerAddresses}
                onChange={(e) => setRelayerAddresses(e.target.value)}
                placeholder="0x123..., 0x456... (leave empty to only authorize your address)"
                rows={2}
                className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-2 rounded text-sm font-mono focus:outline-none focus:border-kraken-purple transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">Authorized addresses that can execute gas-aware transfers</p>
            </div>
          </div>

          {/* Network Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Network</label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded-lg focus:outline-none focus:border-kraken-purple transition-colors"
            >
              {NETWORKS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom RPC URL */}
          {network === "custom" && (
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Custom RPC URL</label>
              <input
                type="text"
                value={customRpcUrl}
                onChange={(e) => setCustomRpcUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded-lg font-mono text-sm focus:outline-none focus:border-kraken-purple transition-colors"
              />
            </div>
          )}

          {/* RPC URL Display */}
          {network !== "custom" && (
            <div className="bg-kraken-darker/50 border border-kraken-purple/20 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">RPC Endpoint</p>
              <p className="text-sm text-gray-300 font-mono break-all">{rpcUrl}</p>
              <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
              </svg>
              Using demo RPC. For production, use your own Alchemy/Infura key.
            </p>
            </div>
          )}

          {/* Private Key */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Deployer Private Key
              <span className="text-kraken-supporting ml-2 text-xs">(required)</span>
            </label>
            <input
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="0x... (64 hex characters)"
              className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded-lg font-mono text-sm focus:outline-none focus:border-kraken-purple transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Never share your private key. It's used only for deployment and not stored.
            </p>
          </div>

          {/* Gas Price Settings */}
          <div className="bg-kraken-darker/50 border border-kraken-purple/20 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-kraken-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Gas Price Control
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Min Gas (Gwei)
                </label>
                <input
                  type="number"
                  value={minGasPrice}
                  onChange={(e) => setMinGasPrice(e.target.value)}
                  placeholder="10"
                  className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-2 rounded text-sm focus:outline-none focus:border-kraken-purple transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">Minimum acceptable gas price</p>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Max Gas (Gwei)
                </label>
                <input
                  type="number"
                  value={maxGasPrice}
                  onChange={(e) => setMaxGasPrice(e.target.value)}
                  placeholder="50"
                  className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-2 rounded text-sm focus:outline-none focus:border-kraken-purple transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">Wait if gas exceeds this limit</p>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                Gas Wait Timeout (seconds)
              </label>
              <input
                type="number"
                value={gasTimeout}
                onChange={(e) => setGasTimeout(e.target.value)}
                placeholder="300"
                className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-2 rounded text-sm focus:outline-none focus:border-kraken-purple transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">How long to wait for gas price to drop below maximum</p>
            </div>
          </div>

          {/* Contract Verification */}
          <div className="bg-kraken-darker/50 border border-kraken-purple/20 rounded-lg p-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={verifyContract}
                onChange={(e) => setVerifyContract(e.target.checked)}
                className="w-5 h-5 text-kraken-purple bg-kraken-darker border-kraken-purple/30 rounded focus:ring-kraken-purple"
              />
              <span className="ml-3 text-white font-semibold">Verify contract on Etherscan</span>
            </label>
            
            {verifyContract && (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Etherscan API Key</label>
                <input
                  type="password"
                  value={etherscanApiKey}
                  onChange={(e) => setEtherscanApiKey(e.target.value)}
                  placeholder="Your Etherscan API key"
                  className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded-lg font-mono text-sm focus:outline-none focus:border-kraken-purple transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">Get your free API key from etherscan.io</p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-400 text-sm whitespace-pre-line">{error}</p>
            </div>
          )}

          {/* Deployment Status */}
          {deploymentStatus && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-400 text-sm whitespace-pre-line">{deploymentStatus}</p>
            </div>
          )}

          {/* Deploy Button */}
          <button
            onClick={deployContract}
            disabled={deploying}
            className="w-full bg-gradient-to-r from-kraken-purple to-kraken-accent hover:from-kraken-accent hover:to-kraken-purple disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all shadow-lg shadow-kraken-purple/30 flex items-center justify-center gap-2"
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

          <p className="text-xs text-center text-gray-500">
            Deployment typically takes 30-60 seconds depending on network congestion
          </p>
        </div>
      </div>
    </div>
  );
}
