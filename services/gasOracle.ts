/**
 * Gas Oracle Service
 * Monitors real-time gas prices from 1inch and Chainlink oracles
 */

export interface GasPrices {
  baseFeeGwei: number;
  priorityFeeGwei: number;
  totalFeeGwei: number;
  timestamp: number;
  source: '1inch' | 'chainlink' | 'rpc';
  network?: string;
}

export interface L2NetworkInfo {
  chainId: number;
  name: string;
  type: 'optimistic' | 'zk' | 'l1';
  rpcUrl: string;
  supported1inch: boolean;
}

export const L2_NETWORKS: { [key: string]: L2NetworkInfo } = {
  ethereum: { chainId: 1, name: 'Ethereum', type: 'l1', rpcUrl: 'https://eth.llamarpc.com', supported1inch: true },
  arbitrum: { chainId: 42161, name: 'Arbitrum', type: 'optimistic', rpcUrl: 'https://arb1.arbitrum.io/rpc', supported1inch: true },
  optimism: { chainId: 10, name: 'Optimism', type: 'optimistic', rpcUrl: 'https://mainnet.optimism.io', supported1inch: true },
  base: { chainId: 8453, name: 'Base', type: 'optimistic', rpcUrl: 'https://mainnet.base.org', supported1inch: true },
  polygon: { chainId: 137, name: 'Polygon', type: 'l1', rpcUrl: 'https://polygon-rpc.com', supported1inch: true },
  zksync: { chainId: 324, name: 'zkSync Era', type: 'zk', rpcUrl: 'https://mainnet.era.zksync.io', supported1inch: false },
  linea: { chainId: 59144, name: 'Linea', type: 'zk', rpcUrl: 'https://rpc.linea.build', supported1inch: false },
  scroll: { chainId: 534352, name: 'Scroll', type: 'zk', rpcUrl: 'https://rpc.scroll.io', supported1inch: false },
};

export class GasOracleService {
  private chainId: number;
  private rpcUrl: string;

  constructor(chainId: number, rpcUrl: string) {
    this.chainId = chainId;
    this.rpcUrl = rpcUrl;
  }

  /**
   * Get network name from chain ID
   */
  private getNetworkName(): string {
    for (const [name, info] of Object.entries(L2_NETWORKS)) {
      if (info.chainId === this.chainId) {
        return info.name;
      }
    }
    return `Chain ${this.chainId}`;
  }

  /**
   * Get current gas prices from 1inch oracle
   */
  async getGasPricesFrom1inch(): Promise<GasPrices | null> {
    try {
      const chainIdMap: { [key: number]: string } = {
        1: '1',       // Ethereum
        137: '137',   // Polygon
        42161: '42161', // Arbitrum
        10: '10',     // Optimism
        8453: '8453', // Base
      };

      const chainParam = chainIdMap[this.chainId];
      if (!chainParam) {
        console.warn(`1inch not supported for chain ${this.chainId}`);
        return null;
      }

      const response = await fetch(
        `https://gas-price-api.1inch.io/v1.4/${chainParam}`
      );

      if (!response.ok) {
        throw new Error(`1inch API error: ${response.status}`);
      }

      const data = await response.json();

      // 1inch returns values in wei, convert to gwei
      const baseFeeGwei = Number(data.baseFee) / 1e9;
      const priorityFeeGwei = Number(data.maxPriorityFeePerGas) / 1e9;

      return {
        baseFeeGwei,
        priorityFeeGwei,
        totalFeeGwei: baseFeeGwei + priorityFeeGwei,
        timestamp: Date.now(),
        source: '1inch',
        network: this.getNetworkName(),
      };
    } catch (error) {
      console.error('Error fetching from 1inch:', error);
      return null;
    }
  }

  /**
   * Get current gas prices from RPC node (fallback)
   */
  async getGasPricesFromRPC(): Promise<GasPrices> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_feeHistory',
        params: ['1', 'latest', [50]], // Get last block, 50th percentile
        id: 1,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    const baseFeeWei = parseInt(data.result.baseFeePerGas[1], 16);
    const priorityFeeWei = parseInt(data.result.reward[0][0], 16);

    const baseFeeGwei = baseFeeWei / 1e9;
    const priorityFeeGwei = priorityFeeWei / 1e9;

    return {
      baseFeeGwei,
      priorityFeeGwei,
      totalFeeGwei: baseFeeGwei + priorityFeeGwei,
      timestamp: Date.now(),
      source: 'rpc',
      network: this.getNetworkName(),
    };
  }

  /**
   * Get current gas prices (tries 1inch first, falls back to RPC)
   */
  async getCurrentGasPrices(): Promise<GasPrices> {
    // Try 1inch first
    const oneInchPrices = await this.getGasPricesFrom1inch();
    if (oneInchPrices) {
      return oneInchPrices;
    }

    // Fallback to RPC
    return this.getGasPricesFromRPC();
  }

  /**
   * Check if current gas prices meet the specified conditions
   */
  async checkGasConditions(conditions: {
    maxBaseFeeGwei?: number;
    maxPriorityFeeGwei?: number;
    maxTotalFeeGwei?: number;
  }): Promise<{
    meetsConditions: boolean;
    currentPrices: GasPrices;
    reason?: string;
  }> {
    const currentPrices = await this.getCurrentGasPrices();

    if (conditions.maxBaseFeeGwei && currentPrices.baseFeeGwei > conditions.maxBaseFeeGwei) {
      return {
        meetsConditions: false,
        currentPrices,
        reason: `Base fee ${currentPrices.baseFeeGwei.toFixed(2)} gwei exceeds max ${conditions.maxBaseFeeGwei} gwei`,
      };
    }

    if (conditions.maxPriorityFeeGwei && currentPrices.priorityFeeGwei > conditions.maxPriorityFeeGwei) {
      return {
        meetsConditions: false,
        currentPrices,
        reason: `Priority fee ${currentPrices.priorityFeeGwei.toFixed(2)} gwei exceeds max ${conditions.maxPriorityFeeGwei} gwei`,
      };
    }

    if (conditions.maxTotalFeeGwei && currentPrices.totalFeeGwei > conditions.maxTotalFeeGwei) {
      return {
        meetsConditions: false,
        currentPrices,
        reason: `Total fee ${currentPrices.totalFeeGwei.toFixed(2)} gwei exceeds max ${conditions.maxTotalFeeGwei} gwei`,
      };
    }

    return {
      meetsConditions: true,
      currentPrices,
    };
  }

  /**
   * Monitor gas prices and execute callback when conditions are met
   */
  async monitorGasConditions(
    conditions: {
      maxBaseFeeGwei?: number;
      maxPriorityFeeGwei?: number;
      maxTotalFeeGwei?: number;
    },
    onConditionsMet: (prices: GasPrices) => Promise<void>,
    options: {
      pollIntervalMs?: number;
      timeoutMs?: number;
    } = {}
  ): Promise<void> {
    const pollIntervalMs = options.pollIntervalMs || 12000; // 12 seconds (1 block)
    const timeoutMs = options.timeoutMs || 3600000; // 1 hour default

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          // Check timeout
          if (Date.now() - startTime > timeoutMs) {
            clearInterval(checkInterval);
            reject(new Error('Gas monitoring timeout'));
            return;
          }

          const result = await this.checkGasConditions(conditions);

          if (result.meetsConditions) {
            clearInterval(checkInterval);
            await onConditionsMet(result.currentPrices);
            resolve();
          } else {
            console.log(`Waiting for gas conditions: ${result.reason}`);
          }
        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, pollIntervalMs);
    });
  }
}

// Singleton instances for common networks
const gasOracles: { [chainId: number]: GasOracleService } = {};

export function getGasOracle(chainId: number, rpcUrl: string): GasOracleService {
  const key = chainId;
  if (!gasOracles[key]) {
    gasOracles[key] = new GasOracleService(chainId, rpcUrl);
  }
  return gasOracles[key];
}
