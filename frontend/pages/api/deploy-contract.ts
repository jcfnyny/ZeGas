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
  contractType?: "l1" | "l2";
  rpcUrl: string;
  privateKey: string;
  minGasPrice?: number;
  maxGasPrice?: number;
  gasTimeout?: number;
  chainId: number;
  verifyContract?: boolean;
  etherscanApiKey?: string;
  platformFeeBps?: number;
  feeCollector?: string;
  relayerAddresses?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { 
      contractType = "l1",
      rpcUrl, 
      privateKey, 
      minGasPrice, 
      maxGasPrice, 
      gasTimeout, 
      chainId, 
      verifyContract, 
      etherscanApiKey,
      platformFeeBps = 10,
      feeCollector,
      relayerAddresses = []
    }: DeployRequest = req.body;

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
      const startTime = Date.now();
      const timeoutMs = (gasTimeout || 300) * 1000;
      
      while (currentGasPrice.gasPrice && currentGasPrice.gasPrice > ethers.parseUnits(maxGasPrice.toString(), "gwei")) {
        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          return res.status(400).json({ 
            error: `Gas price timeout. Current: ${ethers.formatUnits(currentGasPrice.gasPrice || 0n, "gwei")} gwei, Max: ${maxGasPrice} gwei. Waited ${gasTimeout}s.` 
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        currentGasPrice = await provider.getFeeData();
      }
      
      // Verify gas is within acceptable range
      const currentGwei = Number(ethers.formatUnits(currentGasPrice.gasPrice || 0n, "gwei"));
      if (minGasPrice && currentGwei < minGasPrice) {
        return res.status(400).json({ 
          error: `Gas price too low. Current: ${currentGwei} gwei, Min acceptable: ${minGasPrice} gwei` 
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
    
    // Select contract based on type
    const contractName = contractType === "l2" ? "ZegasL2Optimizer" : "ZegasSmartTransfer";
    const contractFile = contractType === "l2" ? "ZegasL2Optimizer.sol" : "ZegasSmartTransfer.sol";
    
    let contractArtifact;
    try {
      // Try to read from Hardhat artifacts
      const artifactPath = path.join(process.cwd(), `../artifacts/contracts/${contractFile}/${contractName}.json`);
      contractArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    } catch (error) {
      return res.status(500).json({ 
        error: `Contract artifacts not found for ${contractName}. Please run 'npm run compile' first.` 
      });
    }

    // Determine fee collector (use deployer address if not specified)
    const finalFeeCollector = feeCollector || wallet.address;

    // Prepare constructor parameters based on contract type
    let constructorArgs: any[];
    if (contractType === "l2") {
      // ZegasL2Optimizer: constructor(uint256 _platformFeeBps, address _feeCollector, address[] memory _initialRelayers)
      constructorArgs = [platformFeeBps, finalFeeCollector, relayerAddresses];
    } else {
      // ZegasSmartTransfer: constructor(uint256 _platformFeeBps, address _feeCollector)
      constructorArgs = [platformFeeBps, finalFeeCollector];
    }

    // Deploy the contract with constructor parameters
    const factory = new ethers.ContractFactory(
      contractArtifact.abi,
      contractArtifact.bytecode,
      wallet
    );

    const contract = await factory.deploy(...constructorArgs);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    const txHash = contract.deploymentTransaction()?.hash;

    // Authorize relayers (only for L1 contract, L2 handles this in constructor)
    if (contractType === "l1") {
      const relayersToAuthorize = [...relayerAddresses];
      if (!relayersToAuthorize.includes(wallet.address)) {
        relayersToAuthorize.push(wallet.address);
      }

      for (const relayerAddress of relayersToAuthorize) {
        try {
          const tx = await contract.setRelayerAuthorization(relayerAddress, true);
          await tx.wait();
        } catch (error) {
          console.error(`Failed to authorize relayer ${relayerAddress}:`, error);
        }
      }
    }

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
      contractType,
      contractName,
      verificationStatus
    });

  } catch (error: any) {
    console.error("Deployment error:", error);
    return res.status(500).json({ 
      error: error.message || "Deployment failed" 
    });
  }
}
