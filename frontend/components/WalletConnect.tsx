import { useState, useEffect } from "react";
import { ethers } from "ethers";

type Props = {
  onConnect: (address: string, provider: ethers.BrowserProvider) => void;
  onDisconnect: () => void;
};

export default function WalletConnect({ onConnect, onDisconnect }: Props) {
  const [account, setAccount] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
    
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", () => window.location.reload());
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount("");
      onDisconnect();
    } else if (accounts[0] !== account) {
      setAccount(accounts[0]);
      connectWallet();
    }
  };

  const checkConnection = async () => {
    if (!window.ethereum) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        const address = accounts[0].address;
        setAccount(address);
        onConnect(address, provider);
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask or another Web3 wallet!");
      return;
    }

    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      onConnect(address, provider);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount("");
    onDisconnect();
  };

  if (account) {
    return (
      <div className="flex items-center gap-3">
        <div className="bg-kraken-dark border border-kraken-purple/30 rounded-lg px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-white">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        </div>
        <button
          onClick={disconnectWallet}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      className="bg-gradient-to-r from-kraken-purple to-kraken-accent hover:from-kraken-accent hover:to-kraken-purple text-white font-semibold px-6 py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-kraken-purple/30"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
