import { useState } from "react";

export type Token = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  isNative?: boolean;
};

const POPULAR_TOKENS: { [chainId: number]: Token[] } = {
  1: [
    {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      isNative: true,
    },
    {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
    {
      address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      symbol: "WBTC",
      name: "Wrapped Bitcoin",
      decimals: 8,
    },
    {
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
    },
  ],
  11155111: [
    {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "ETH",
      name: "Sepolia ETH",
      decimals: 18,
      isNative: true,
    },
  ],
  137: [
    {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "MATIC",
      name: "Polygon",
      decimals: 18,
      isNative: true,
    },
    {
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
  ],
  42161: [
    {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "ETH",
      name: "Arbitrum ETH",
      decimals: 18,
      isNative: true,
    },
    {
      address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
  ],
};

type Props = {
  chainId: number;
  selectedToken: Token | null;
  onTokenSelect: (token: Token) => void;
};

export default function TokenSelector({ chainId, selectedToken, onTokenSelect }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customAddress, setCustomAddress] = useState("");

  const tokens = POPULAR_TOKENS[chainId] || POPULAR_TOKENS[11155111];

  const handleSelectToken = (token: Token) => {
    onTokenSelect(token);
    setIsOpen(false);
    setShowCustom(false);
  };

  const handleCustomToken = () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(customAddress)) {
      alert("Invalid token address format");
      return;
    }

    const customToken: Token = {
      address: customAddress,
      symbol: "CUSTOM",
      name: "Custom Token",
      decimals: 18,
    };
    onTokenSelect(customToken);
    setIsOpen(false);
    setShowCustom(false);
    setCustomAddress("");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 flex items-center justify-between hover:border-blue-400 transition-colors"
      >
        <div className="flex items-center gap-3">
          {selectedToken ? (
            <>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {selectedToken.symbol.slice(0, 1)}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900">{selectedToken.symbol}</div>
                <div className="text-xs text-gray-500">{selectedToken.name}</div>
              </div>
            </>
          ) : (
            <span className="text-gray-500">Select a token</span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
          <div className="px-3 pb-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase">Popular Tokens</p>
          </div>

          {tokens.map((token) => (
            <button
              key={token.address}
              onClick={() => handleSelectToken(token)}
              className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 ${
                selectedToken?.address === token.address ? "bg-blue-50" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {token.symbol.slice(0, 1)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">{token.symbol}</div>
                <div className="text-xs text-gray-500">{token.name}</div>
              </div>
              {token.isNative && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Native</span>
              )}
            </button>
          ))}

          <div className="border-t border-gray-100 mt-2 pt-2">
            {!showCustom ? (
              <button
                onClick={() => setShowCustom(true)}
                className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                + Add custom token
              </button>
            ) : (
              <div className="px-4 py-2 space-y-2">
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="0x... token address"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCustomToken}
                    className="flex-1 bg-blue-600 text-white text-sm py-2 rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowCustom(false);
                      setCustomAddress("");
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 text-sm py-2 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
