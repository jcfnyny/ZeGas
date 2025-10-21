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
                  <svg className="w-6 h-6 text-kraken-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-2">Secure</h3>
                <p className="text-sm text-gray-400">Your tokens are locked in a verified smart contract</p>
              </div>
              
              <div className="bg-kraken-dark/30 backdrop-blur-sm rounded-xl p-6 border border-kraken-purple/20 hover:border-kraken-purple/50 transition-all">
                <div className="w-12 h-12 bg-kraken-purple/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-kraken-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-2">Flexible</h3>
                <p className="text-sm text-gray-400">Schedule transfers for any future time</p>
              </div>
              
              <div className="bg-kraken-dark/30 backdrop-blur-sm rounded-xl p-6 border border-kraken-purple/20 hover:border-kraken-purple/50 transition-all">
                <div className="w-12 h-12 bg-kraken-purple/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-kraken-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                  </svg>
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
