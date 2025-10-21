import dynamic from "next/dynamic";
import { useState } from "react";
import { ethers } from "ethers";

const WalletConnect = dynamic(() => import("../components/WalletConnect"), { ssr: false });
const NetworkSelector = dynamic(() => import("../components/NetworkSelector"), { ssr: false });
const ContractSelector = dynamic(() => import("../components/ContractSelector"), { ssr: false });
const TransferForm = dynamic(() => import("../components/TransferForm"), { ssr: false });
const HeaderBanner = dynamic(() => import("../components/HeaderBanner"), { ssr: false });

import type { Network } from "../components/NetworkSelector";

export default function Home() {
  const [contractAddr, setContractAddr] = useState<string>("");
  const [userAddress, setUserAddress] = useState<string>("");
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [currentChainId, setCurrentChainId] = useState<number>(1);

  const handleConnect = async (address: string, providerInstance: ethers.BrowserProvider) => {
    setUserAddress(address);
    setProvider(providerInstance);
    
    const network = await providerInstance.getNetwork();
    setCurrentChainId(Number(network.chainId));
  };

  const handleDisconnect = () => {
    setUserAddress("");
    setProvider(null);
  };

  const handleNetworkChange = (network: Network) => {
    setCurrentChainId(network.chainId);
  };

  return (
    <main className="min-h-screen bg-kraken-darker">
      <nav className="bg-kraken-dark/80 border-b border-kraken-purple/20 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-kraken-purple to-kraken-accent rounded-lg flex items-center justify-center shadow-lg shadow-kraken-purple/30">
                <span className="text-white text-xl font-bold">Z</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ZeGas Transfer</h1>
                <p className="text-xs text-gray-400">Schedule token transfers on-chain</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {userAddress && provider && (
                <NetworkSelector 
                  currentChainId={currentChainId} 
                  onNetworkChange={handleNetworkChange}
                />
              )}
              <WalletConnect 
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            </div>
          </div>
        </div>
      </nav>

      {!userAddress && <HeaderBanner />}

      <div className="max-w-7xl mx-auto px-6 py-12">
        {!userAddress ? (
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="bg-kraken-dark/50 backdrop-blur-xl rounded-2xl shadow-2xl p-12 border border-kraken-purple/20">
              <div className="mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-kraken-purple to-kraken-accent rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-kraken-purple/50">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h3>
                <p className="text-gray-300">
                  Connect your Web3 wallet to start scheduling transfers
                </p>
              </div>
              
              <div className="flex justify-center">
                <WalletConnect 
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-kraken-dark/30 backdrop-blur-sm rounded-xl p-6 border border-kraken-purple/20 hover:border-kraken-purple/50 transition-all">
                <div className="w-12 h-12 bg-kraken-purple/20 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="font-bold text-white mb-2">Secure</h3>
                <p className="text-sm text-gray-400">Your tokens are locked in a verified smart contract</p>
              </div>
              
              <div className="bg-kraken-dark/30 backdrop-blur-sm rounded-xl p-6 border border-kraken-purple/20 hover:border-kraken-purple/50 transition-all">
                <div className="w-12 h-12 bg-kraken-purple/20 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">⏰</span>
                </div>
                <h3 className="font-bold text-white mb-2">Flexible</h3>
                <p className="text-sm text-gray-400">Schedule transfers for any future time</p>
              </div>
              
              <div className="bg-kraken-dark/30 backdrop-blur-sm rounded-xl p-6 border border-kraken-purple/20 hover:border-kraken-purple/50 transition-all">
                <div className="w-12 h-12 bg-kraken-purple/20 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🌐</span>
                </div>
                <h3 className="font-bold text-white mb-2">Multi-Chain</h3>
                <p className="text-sm text-gray-400">Support for Ethereum, Polygon, Arbitrum & more</p>
              </div>
            </div>
          </div>
        ) : !contractAddr ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-3">Select Contract</h2>
              <p className="text-gray-400">Choose the transfer contract to use</p>
            </div>
            <ContractSelector onAddressSelected={setContractAddr} />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <TransferForm 
              contractAddress={contractAddr}
              userAddress={userAddress}
              provider={provider!}
              chainId={currentChainId}
            />
          </div>
        )}
      </div>

      <footer className="bg-kraken-dark/50 border-t border-kraken-purple/20 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              © 2025 ZeGas Transfer. Built on Ethereum.
            </p>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-kraken-purple transition-colors">Docs</a>
              <a href="#" className="hover:text-kraken-purple transition-colors">GitHub</a>
              <a href="#" className="hover:text-kraken-purple transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
