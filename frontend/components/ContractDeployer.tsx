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
