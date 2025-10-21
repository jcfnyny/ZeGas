import { useState, useEffect } from 'react';

interface GasPrices {
  baseFeeGwei: number;
  priorityFeeGwei: number;
  totalFeeGwei: number;
  timestamp: number;
}

export default function GasPriceMonitor({ chainId }: { chainId: number }) {
  const [gasPrices, setGasPrices] = useState<GasPrices | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGasPrices = async () => {
      try {
        const response = await fetch('/api/gas-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chainId }),
        });

        if (response.ok) {
          const data = await response.json();
          setGasPrices(data);
        }
      } catch (error) {
        console.error('Error fetching gas prices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGasPrices();
    const interval = setInterval(fetchGasPrices, 12000); // Update every 12 seconds

    return () => clearInterval(interval);
  }, [chainId]);

  if (loading) {
    return (
      <div className="bg-kraken-dark/60 border border-kraken-purple/30 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-kraken-purple border-t-transparent rounded-full"></div>
          <span className="text-gray-300 text-sm">Loading gas prices...</span>
        </div>
      </div>
    );
  }

  if (!gasPrices) {
    return (
      <div className="bg-kraken-dark/60 border border-kraken-purple/30 rounded-lg p-4">
        <span className="text-gray-400 text-sm">Gas prices unavailable</span>
      </div>
    );
  }

  return (
    <div className="bg-kraken-dark/60 border border-kraken-purple/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-kraken-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Current Gas Prices
        </h3>
        <span className="text-xs text-gray-400">Live</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-kraken-darker/50 rounded p-2">
          <div className="text-xs text-gray-400 mb-1">Base Fee</div>
          <div className="text-lg font-semibold text-white">{gasPrices.baseFeeGwei.toFixed(1)}</div>
          <div className="text-xs text-gray-500">Gwei</div>
        </div>

        <div className="bg-kraken-darker/50 rounded p-2">
          <div className="text-xs text-gray-400 mb-1">Priority</div>
          <div className="text-lg font-semibold text-white">{gasPrices.priorityFeeGwei.toFixed(1)}</div>
          <div className="text-xs text-gray-500">Gwei</div>
        </div>

        <div className="bg-kraken-darker/50 rounded p-2">
          <div className="text-xs text-gray-400 mb-1">Total</div>
          <div className="text-lg font-semibold text-kraken-accent">{gasPrices.totalFeeGwei.toFixed(1)}</div>
          <div className="text-xs text-gray-500">Gwei</div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400">
        Updated {new Date(gasPrices.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
