import dynamic from "next/dynamic";
import { useState } from "react";
import { ethers } from "ethers";

const WalletConnect = dynamic(() => import("../components/WalletConnect"), { ssr: false });
const NetworkSelector = dynamic(() => import("../components/NetworkSelector"), { ssr: false });
const ContractSelector = dynamic(() => import("../components/ContractSelector"), { ssr: false });
const TransferForm = dynamic(() => import("../components/TransferForm"), { ssr: false });
const GasPriceMonitor = dynamic(() => import("../components/GasPriceMonitor"), { ssr: false });

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
    <main className="min-h-screen bg-gradient-to-b from-kraken-darker via-kraken-dark to-kraken-darker">
      <nav className="bg-kraken-dark/90 border-b border-kraken-purple/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-kraken-purple to-kraken-accent rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">Z</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ZeGas</h1>
                <p className="text-xs text-gray-400">Token Transfer Scheduler</p>
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

      <div className="max-w-6xl mx-auto px-6 py-16">
        {!userAddress ? (
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">Gas-Aware Smart Transfers</h2>
              <p className="text-lg text-gray-300">Schedule transfers that execute only when gas prices meet your thresholds</p>
            </div>

            <div className="bg-kraken-dark/60 backdrop-blur-md rounded-xl p-8 border border-kraken-purple/30">
              <h3 className="text-xl font-semibold text-white mb-2 text-center">Get Started</h3>
              <p className="text-gray-300 text-center mb-6">Connect your wallet to schedule transfers</p>
              
              <div className="flex justify-center">
                <WalletConnect 
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-12">
              <div className="text-center">
                <div className="bg-kraken-purple/10 rounded-lg p-4 mb-3">
                  <svg className="w-8 h-8 text-kraken-accent mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-white font-semibold text-sm mb-1">Secure</h4>
                <p className="text-gray-400 text-xs">Smart contract protected</p>
              </div>

              <div className="text-center">
                <div className="bg-kraken-purple/10 rounded-lg p-4 mb-3">
                  <svg className="w-8 h-8 text-kraken-accent mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-white font-semibold text-sm mb-1">Gas-Optimized</h4>
                <p className="text-gray-400 text-xs">Execute at optimal prices</p>
              </div>

              <div className="text-center">
                <div className="bg-kraken-purple/10 rounded-lg p-4 mb-3">
                  <svg className="w-8 h-8 text-kraken-accent mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-white font-semibold text-sm mb-1">Multi-Chain</h4>
                <p className="text-gray-400 text-xs">Multiple networks</p>
              </div>
            </div>
          </div>
        ) : !contractAddr ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-3">Select Contract</h2>
              <p className="text-gray-400">Choose or deploy your transfer scheduler contract</p>
            </div>
            <ContractSelector onAddressSelected={setContractAddr} />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Gas-Aware Token Transfers</h2>
              <p className="text-gray-400">Schedule transfers to execute when gas prices meet your thresholds</p>
            </div>
            
            <GasPriceMonitor chainId={currentChainId} />
            
            <TransferForm 
              contractAddress={contractAddr}
              userAddress={userAddress}
              provider={provider!}
              chainId={currentChainId}
            />
          </div>
        )}
      </div>

      <footer className="border-t border-kraken-purple/20 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="text-center text-sm text-gray-400">
            © 2025 ZeGas Transfer · Built on Ethereum
          </div>
        </div>
      </footer>
    </main>
  );
}
