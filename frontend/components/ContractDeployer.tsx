import { useState } from "react";

type Props = {
  onDeploySuccess: (address: string) => void;
};

const NETWORKS = [
  { id: "sepolia", name: "Sepolia Testnet", chainId: 11155111, rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/demo" },
  { id: "mainnet", name: "Ethereum Mainnet", chainId: 1, rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/demo" },
  { id: "polygon", name: "Polygon", chainId: 137, rpcUrl: "https://polygon-rpc.com" },
  { id: "arbitrum", name: "Arbitrum One", chainId: 42161, rpcUrl: "https://arb1.arbitrum.io/rpc" },
  { id: "custom", name: "Custom RPC", chainId: 0, rpcUrl: "" },
];

export default function ContractDeployer({ onDeploySuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [network, setNetwork] = useState("sepolia");
  const [customRpcUrl, setCustomRpcUrl] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [maxGasPrice, setMaxGasPrice] = useState("50");
  const [verifyContract, setVerifyContract] = useState(true);
  const [etherscanApiKey, setEtherscanApiKey] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState("");
  const [deploymentStatus, setDeploymentStatus] = useState("");

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
          rpcUrl,
          privateKey: privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`,
          maxGasPrice: maxGasPrice ? parseInt(maxGasPrice) : undefined,
          chainId: selectedNetwork.chainId,
          verifyContract,
          etherscanApiKey: verifyContract ? etherscanApiKey : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Deployment failed");
      }

      setDeploymentStatus(`✅ Contract deployed successfully!`);
      setTimeout(() => {
        onDeploySuccess(data.address);
        setIsOpen(false);
        setPrivateKey("");
        setEtherscanApiKey("");
      }, 2000);
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
        className="w-full bg-gradient-to-r from-kraken-purple to-kraken-accent hover:from-kraken-accent hover:to-kraken-purple text-white font-semibold py-4 px-6 rounded-lg transition-all shadow-lg shadow-kraken-purple/30"
      >
        🚀 Deploy Contract
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-kraken-dark border border-kraken-purple/30 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-kraken-purple/20 to-kraken-accent/20 border-b border-kraken-purple/30 p-6 backdrop-blur-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Deploy ZegasTokenTransfer Contract</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-2">Configure deployment parameters for your token transfer scheduler</p>
        </div>

        <div className="p-6 space-y-6">
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
              <p className="text-xs text-yellow-400 mt-2">💡 Using demo RPC. For production, use your own Alchemy/Infura key.</p>
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
            <p className="text-xs text-gray-400 mt-1">⚠️ Never share your private key. It's used only for deployment and not stored.</p>
          </div>

          {/* Gas Price Limit */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Max Gas Price (Gwei)
              <span className="text-gray-500 ml-2 text-xs">(optional)</span>
            </label>
            <input
              type="number"
              value={maxGasPrice}
              onChange={(e) => setMaxGasPrice(e.target.value)}
              placeholder="50"
              className="w-full border border-kraken-purple/30 bg-kraken-darker text-white p-3 rounded-lg text-sm focus:outline-none focus:border-kraken-purple transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1">Deployment will wait for gas price to be below this threshold</p>
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
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">❌ {error}</p>
            </div>
          )}

          {/* Deployment Status */}
          {deploymentStatus && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-400 text-sm">{deploymentStatus}</p>
            </div>
          )}

          {/* Deploy Button */}
          <button
            onClick={deployContract}
            disabled={deploying}
            className="w-full bg-gradient-to-r from-kraken-purple to-kraken-accent hover:from-kraken-accent hover:to-kraken-purple disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all shadow-lg shadow-kraken-purple/30"
          >
            {deploying ? "Deploying..." : "Deploy Contract"}
          </button>

          <p className="text-xs text-center text-gray-500">
            Deployment typically takes 30-60 seconds depending on network congestion
          </p>
        </div>
      </div>
    </div>
  );
}
