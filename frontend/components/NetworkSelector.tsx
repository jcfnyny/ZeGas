import { useState, useEffect } from "react";
import { ethers } from "ethers";

export type Network = {
  chainId: number;
  name: string;
  symbol: string;
  rpcUrl: string;
  blockExplorer: string;
};

export const SUPPORTED_NETWORKS: Network[] = [
  {
    chainId: 1,
    name: "Ethereum Mainnet",
    symbol: "ETH",
    rpcUrl: "https://eth.llamarpc.com",
    blockExplorer: "https://etherscan.io",
  },
  {
    chainId: 11155111,
    name: "Sepolia Testnet",
    symbol: "ETH",
    rpcUrl: "https://rpc.sepolia.org",
    blockExplorer: "https://sepolia.etherscan.io",
  },
  {
    chainId: 137,
    name: "Polygon",
    symbol: "MATIC",
    rpcUrl: "https://polygon-rpc.com",
    blockExplorer: "https://polygonscan.com",
  },
  {
    chainId: 42161,
    name: "Arbitrum One",
    symbol: "ETH",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    blockExplorer: "https://arbiscan.io",
  },
];

type Props = {
  currentChainId: number;
  onNetworkChange: (network: Network) => void;
};

export default function NetworkSelector({ currentChainId, onNetworkChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const currentNetwork = SUPPORTED_NETWORKS.find(n => n.chainId === currentChainId) || SUPPORTED_NETWORKS[0];

  const switchNetwork = async (network: Network) => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${network.chainId.toString(16)}` }],
      });
      onNetworkChange(network);
      setIsOpen(false);
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${network.chainId.toString(16)}`,
                chainName: network.name,
                nativeCurrency: {
                  name: network.symbol,
                  symbol: network.symbol,
                  decimals: 18,
                },
                rpcUrls: [network.rpcUrl],
                blockExplorerUrls: [network.blockExplorer],
              },
            ],
          });
          onNetworkChange(network);
          setIsOpen(false);
        } catch (addError) {
          console.error("Error adding network:", addError);
        }
      } else {
        console.error("Error switching network:", error);
      }
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-kraken-dark border border-kraken-purple/30 rounded-lg px-4 py-2 flex items-center gap-2 hover:border-kraken-purple/50 transition-colors"
      >
        <div className="w-2 h-2 bg-kraken-purple rounded-full"></div>
        <span className="text-sm font-medium text-white">{currentNetwork.name}</span>
        <svg
          className={`w-4 h-4 transition-transform text-white ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-kraken-dark rounded-lg shadow-2xl border border-kraken-purple/30 py-2 min-w-[200px] z-50 backdrop-blur-xl">
          {SUPPORTED_NETWORKS.map((network) => (
            <button
              key={network.chainId}
              onClick={() => switchNetwork(network)}
              className={`w-full px-4 py-2 text-left hover:bg-kraken-purple/20 transition-colors flex items-center gap-2 ${
                network.chainId === currentChainId ? "bg-kraken-purple/30 text-white" : "text-gray-300"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${network.chainId === currentChainId ? "bg-kraken-purple" : "bg-gray-500"}`}></div>
              <span className="text-sm font-medium">{network.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
