import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";

function getNetworkName(chainId: number): string {
  const networks: { [key: number]: string } = {
    1: "mainnet",
    11155111: "sepolia",
    137: "polygon",
    42161: "arbitrum",
  };
  return networks[chainId] || "unknown";
}

// ZegasTokenTransfer contract bytecode and ABI
// This is the compiled contract - in production, you'd import this from artifacts
const CONTRACT_ABI = [
  "constructor()",
  "function scheduleTransfer(address to, address token, uint256 amount, uint64 executeAfter) payable returns (uint256)",
  "function executeTransfer(uint256 transferId)",
  "function cancelTransfer(uint256 transferId)",
  "function getTransfer(uint256 transferId) view returns (tuple(address from, address to, address token, uint256 amount, uint256 chainId, uint64 executeAfter, bool executed, bool canceled))",
  "function transfers(uint256) view returns (address from, address to, address token, uint256 amount, uint256 chainId, uint64 executeAfter, bool executed, bool canceled)",
  "function transferCount() view returns (uint256)",
  "event TransferScheduled(uint256 indexed transferId, address indexed from, address indexed to, address token, uint256 amount, uint256 chainId, uint64 executeAfter)",
  "event TransferExecuted(uint256 indexed transferId, address indexed executor)",
  "event TransferCanceled(uint256 indexed transferId)",
];

interface DeployRequest {
  rpcUrl: string;
  privateKey: string;
  maxGasPrice?: number;
  chainId: number;
  verifyContract?: boolean;
  etherscanApiKey?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { rpcUrl, privateKey, maxGasPrice, chainId, verifyContract, etherscanApiKey }: DeployRequest = req.body;

    if (!rpcUrl || !privateKey) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Connect to the network
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Check wallet balance
    const balance = await wallet.provider.getBalance(wallet.address);
    if (balance === 0n) {
      return res.status(400).json({ 
        error: "Deployer wallet has no funds. Please fund the wallet before deploying." 
      });
    }

    // Wait for gas price if needed
    if (maxGasPrice) {
      let currentGasPrice = await provider.getFeeData();
      let attempts = 0;
      const maxAttempts = 10;
      
      while (currentGasPrice.gasPrice && currentGasPrice.gasPrice > ethers.parseUnits(maxGasPrice.toString(), "gwei") && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        currentGasPrice = await provider.getFeeData();
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        return res.status(400).json({ 
          error: `Gas price exceeded max threshold. Current: ${ethers.formatUnits(currentGasPrice.gasPrice || 0n, "gwei")} gwei, Max: ${maxGasPrice} gwei` 
        });
      }
    }

    // For now, we'll deploy using a simple approach
    // In production, you'd want to use the actual compiled contract from Hardhat artifacts
    // We'll need to compile and get the bytecode from the contracts directory
    
    // Import the contract artifacts - this is a simplified version
    // In a real scenario, you'd use the compiled artifacts from Hardhat
    const fs = require('fs');
    const path = require('path');
    
    let contractArtifact;
    try {
      // Try to read from Hardhat artifacts
      const artifactPath = path.join(process.cwd(), '../artifacts/contracts/ZegasTokenTransfer.sol/ZegasTokenTransfer.json');
      contractArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    } catch (error) {
      return res.status(500).json({ 
        error: "Contract artifacts not found. Please run 'npm run compile' first." 
      });
    }

    // Deploy the contract
    const factory = new ethers.ContractFactory(
      contractArtifact.abi,
      contractArtifact.bytecode,
      wallet
    );

    const contract = await factory.deploy();
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    const txHash = contract.deploymentTransaction()?.hash;

    // Verify contract on Etherscan if requested
    let verificationStatus = "not_requested";
    if (verifyContract && etherscanApiKey) {
      try {
        // Wait a bit for the deployment to be indexed
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Call Hardhat verify task
        const { execSync } = require('child_process');
        const rootPath = require('path').join(process.cwd(), '..');
        
        execSync(
          `cd ${rootPath} && npx hardhat verify --network ${getNetworkName(chainId)} ${address}`,
          {
            env: { 
              ...process.env, 
              ETHERSCAN_API_KEY: etherscanApiKey 
            },
            stdio: 'pipe'
          }
        );
        verificationStatus = "verified";
      } catch (error: any) {
        console.error("Verification error:", error);
        verificationStatus = error.message?.includes("already verified") 
          ? "already_verified" 
          : "failed";
      }
    }

    return res.status(200).json({ 
      address,
      deployer: wallet.address,
      chainId,
      txHash,
      verificationStatus
    });

  } catch (error: any) {
    console.error("Deployment error:", error);
    return res.status(500).json({ 
      error: error.message || "Deployment failed" 
    });
  }
}
