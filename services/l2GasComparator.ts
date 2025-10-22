/**
 * Layer 2 Gas Comparator Service
 * Compares gas prices across multiple L2 networks to find the cheapest option
 */

import { GasOracleService, GasPrices, L2_NETWORKS } from './gasOracle';

export interface L2GasComparison {
  network: string;
  chainId: number;
  gasPrices: GasPrices;
  estimatedCostUSD?: number;
}

export class L2GasComparator {
  private oracles: Map<number, GasOracleService> = new Map();

  constructor() {
    // Initialize gas oracles for all L2 networks
    for (const [name, info] of Object.entries(L2_NETWORKS)) {
      this.oracles.set(info.chainId, new GasOracleService(info.chainId, info.rpcUrl));
    }
  }

  /**
   * Get gas prices for a specific network
   */
  async getNetworkGasPrices(chainId: number): Promise<L2GasComparison | null> {
    const oracle = this.oracles.get(chainId);
    if (!oracle) {
      console.warn(`No oracle configured for chain ${chainId}`);
      return null;
    }

    try {
      const gasPrices = await oracle.getCurrentGasPrices();
      const networkInfo = Object.values(L2_NETWORKS).find(n => n.chainId === chainId);

      return {
        network: networkInfo?.name || `Chain ${chainId}`,
        chainId,
        gasPrices,
      };
    } catch (error) {
      console.error(`Error fetching gas prices for chain ${chainId}:`, error);
      return null;
    }
  }

  /**
   * Get gas prices for all L2 networks
   */
  async getAllNetworkPrices(): Promise<L2GasComparison[]> {
    const promises = Array.from(this.oracles.keys()).map(chainId =>
      this.getNetworkGasPrices(chainId)
    );

    const results = await Promise.all(promises);
    return results.filter((result): result is L2GasComparison => result !== null);
  }

  /**
   * Find the cheapest L2 network based on gas prices
   */
  async findCheapestNetwork(
    preferredNetworks?: number[]
  ): Promise<L2GasComparison | null> {
    const networksToCheck = preferredNetworks || Array.from(this.oracles.keys());
    
    const comparisons = await Promise.all(
      networksToCheck.map(chainId => this.getNetworkGasPrices(chainId))
    );

    const validComparisons = comparisons.filter(
      (c): c is L2GasComparison => c !== null
    );

    if (validComparisons.length === 0) {
      return null;
    }

    // Find the network with lowest total gas fee
    return validComparisons.reduce((cheapest, current) => {
      return current.gasPrices.totalFeeGwei < cheapest.gasPrices.totalFeeGwei
        ? current
        : cheapest;
    });
  }

  /**
   * Check if any network meets the gas threshold
   */
  async findNetworkBelowThreshold(
    maxGasGwei: number,
    preferredNetworks?: number[]
  ): Promise<L2GasComparison | null> {
    const networksToCheck = preferredNetworks || Array.from(this.oracles.keys());
    
    const comparisons = await Promise.all(
      networksToCheck.map(chainId => this.getNetworkGasPrices(chainId))
    );

    const validComparisons = comparisons.filter(
      (c): c is L2GasComparison => 
        c !== null && c.gasPrices.totalFeeGwei <= maxGasGwei
    );

    if (validComparisons.length === 0) {
      return null;
    }

    // Return the cheapest among those that meet the threshold
    return validComparisons.reduce((cheapest, current) => {
      return current.gasPrices.totalFeeGwei < cheapest.gasPrices.totalFeeGwei
        ? current
        : cheapest;
    });
  }

  /**
   * Get recommended network based on gas prices and user preferences
   */
  async getRecommendedNetwork(
    preferredNetworks: number[],
    maxGasGwei: number,
    allowL1Fallback: boolean = true
  ): Promise<{
    recommended: L2GasComparison | null;
    reason: string;
    allPrices: L2GasComparison[];
  }> {
    const allPrices = await this.getAllNetworkPrices();
    
    // Filter by preferred networks
    const preferredPrices = allPrices.filter(c =>
      preferredNetworks.includes(c.chainId)
    );

    // Find network below threshold
    const belowThreshold = preferredPrices.find(
      c => c.gasPrices.totalFeeGwei <= maxGasGwei
    );

    if (belowThreshold) {
      // Find cheapest among those below threshold
      const recommended = preferredPrices
        .filter(c => c.gasPrices.totalFeeGwei <= maxGasGwei)
        .reduce((cheapest, current) => {
          return current.gasPrices.totalFeeGwei < cheapest.gasPrices.totalFeeGwei
            ? current
            : cheapest;
        });

      return {
        recommended,
        reason: `${recommended.network} has optimal gas price at ${recommended.gasPrices.totalFeeGwei.toFixed(2)} gwei`,
        allPrices,
      };
    }

    // No preferred network meets threshold, check L1 fallback
    if (allowL1Fallback) {
      const ethereumPrice = allPrices.find(c => c.chainId === 1);
      if (ethereumPrice && ethereumPrice.gasPrices.totalFeeGwei <= maxGasGwei) {
        return {
          recommended: ethereumPrice,
          reason: `Falling back to Ethereum L1 at ${ethereumPrice.gasPrices.totalFeeGwei.toFixed(2)} gwei`,
          allPrices,
        };
      }
    }

    return {
      recommended: null,
      reason: `No network meets gas threshold of ${maxGasGwei} gwei`,
      allPrices,
    };
  }

  /**
   * Compare execution costs across networks
   * Estimates cost based on gas price and typical transaction gas usage
   */
  compareExecutionCosts(
    comparisons: L2GasComparison[],
    estimatedGasUnits: number = 21000
  ): L2GasComparison[] {
    return comparisons.map(comparison => ({
      ...comparison,
      estimatedCostUSD: this.estimateCostInUSD(
        comparison.gasPrices.totalFeeGwei,
        estimatedGasUnits
      ),
    })).sort((a, b) => (a.estimatedCostUSD || 0) - (b.estimatedCostUSD || 0));
  }

  /**
   * Estimate transaction cost in USD
   * Note: This is a simplified estimation. In production, you'd fetch real-time ETH price
   */
  private estimateCostInUSD(gasPriceGwei: number, gasUnits: number): number {
    const ETH_PRICE_USD = 2500; // Placeholder - should fetch from oracle
    const costInETH = (gasPriceGwei * gasUnits) / 1e9;
    return costInETH * ETH_PRICE_USD;
  }
}

// Singleton instance
let comparatorInstance: L2GasComparator | null = null;

export function getL2GasComparator(): L2GasComparator {
  if (!comparatorInstance) {
    comparatorInstance = new L2GasComparator();
  }
  return comparatorInstance;
}
