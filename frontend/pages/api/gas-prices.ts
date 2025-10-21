import type { NextApiRequest, NextApiResponse } from 'next';

const RPC_URLS: { [chainId: number]: string } = {
  1: process.env.ETHEREUM_RPC_URL || 'https://eth.public-rpc.com',
  11155111: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
  137: 'https://polygon-rpc.com',
  42161: 'https://arb1.arbitrum.io/rpc',
};

async function getGasPricesFromRPC(rpcUrl: string) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_feeHistory',
      params: ['1', 'latest', [50]],
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
  };
}

async function getGasPricesFrom1inch(chainId: number) {
  const chainIdMap: { [key: number]: string } = {
    1: '1',
    137: '137',
    42161: '42161',
  };

  const chainParam = chainIdMap[chainId];
  if (!chainParam) {
    return null;
  }

  try {
    const response = await fetch(
      `https://gas-price-api.1inch.io/v1.4/${chainParam}`,
      { next: { revalidate: 10 } }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const baseFeeGwei = Number(data.baseFee) / 1e9;
    const priorityFeeGwei = Number(data.maxPriorityFeePerGas) / 1e9;

    return {
      baseFeeGwei,
      priorityFeeGwei,
      totalFeeGwei: baseFeeGwei + priorityFeeGwei,
      timestamp: Date.now(),
      source: '1inch',
    };
  } catch (error) {
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { chainId } = req.body;

  if (!chainId) {
    return res.status(400).json({ error: 'chainId is required' });
  }

  try {
    // Try 1inch first
    const oneInchPrices = await getGasPricesFrom1inch(chainId);
    if (oneInchPrices) {
      return res.status(200).json(oneInchPrices);
    }

    // Fallback to RPC
    const rpcUrl = RPC_URLS[chainId];
    if (!rpcUrl) {
      return res.status(400).json({ error: 'Unsupported chain ID' });
    }

    const rpcPrices = await getGasPricesFromRPC(rpcUrl);
    return res.status(200).json(rpcPrices);
  } catch (error) {
    console.error('Error fetching gas prices:', error);
    return res.status(500).json({ error: 'Failed to fetch gas prices' });
  }
}
