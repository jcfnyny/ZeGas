/**
 * Relayer Service
 * Monitors scheduled jobs and executes them when gas conditions are met
 */

import { ethers } from 'ethers';
import { GasOracleService } from './gasOracle';

interface JobData {
  jobId: number;
  from: string;
  to: string;
  token: string;
  amount: string;
  gasConditions: {
    maxBaseFeeGwei: number;
    maxPriorityFeeGwei: number;
    maxTotalFeeGwei: number;
    enforceConditions: boolean;
  };
  timeWindow: {
    startTime: number;
    endTime: number;
    executeOnExpiry: boolean;
  };
  executed: boolean;
  canceled: boolean;
}

export class RelayerService {
  private contract: ethers.Contract;
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private gasOracle: GasOracleService;
  private chainId: number;
  private monitoring: Map<number, NodeJS.Timeout> = new Map();

  constructor(
    contractAddress: string,
    provider: ethers.Provider,
    signer: ethers.Signer,
    chainId: number,
    rpcUrl: string
  ) {
    this.provider = provider;
    this.signer = signer;
    this.chainId = chainId;
    this.gasOracle = new GasOracleService(chainId, rpcUrl);

    const abi = [
      'function getJob(uint256 jobId) view returns (tuple(address from, address to, address token, uint256 amount, uint256 chainId, tuple(uint256 maxBaseFeeGwei, uint256 maxPriorityFeeGwei, uint256 maxTotalFeeGwei, bool enforceConditions) gasConditions, tuple(uint64 startTime, uint64 endTime, bool executeOnExpiry) timeWindow, bool executed, bool canceled, string purpose, uint256 nonce))',
      'function executeTransfer(uint256 jobId)',
      'function canExecuteJob(uint256 jobId) view returns (bool, string)',
      'event JobScheduled(uint256 indexed jobId, address indexed from, address indexed to, address token, uint256 amount, uint64 startTime, uint64 endTime, uint256 maxBaseFeeGwei)',
      'event JobExecuted(uint256 indexed jobId, address indexed executor, uint256 actualBaseFee, uint256 actualPriorityFee)',
      'event JobCanceled(uint256 indexed jobId, address indexed canceler)',
    ];

    this.contract = new ethers.Contract(contractAddress, abi, signer);
  }

  /**
   * Start monitoring a job for execution
   */
  async monitorJob(jobId: number): Promise<void> {
    console.log(`Starting to monitor job ${jobId}`);

    // Don't monitor if already monitoring
    if (this.monitoring.has(jobId)) {
      console.log(`Job ${jobId} already being monitored`);
      return;
    }

    const checkJob = async () => {
      try {
        // Get job details
        const job = await this.contract.getJob(jobId);
        
        // Check if job is still active
        if (job.executed || job.canceled) {
          console.log(`Job ${jobId} is no longer active (executed: ${job.executed}, canceled: ${job.canceled})`);
          this.stopMonitoring(jobId);
          return;
        }

        const now = Math.floor(Date.now() / 1000);

        // Check if we're in the time window
        if (now < job.timeWindow.startTime) {
          console.log(`Job ${jobId} not yet in time window (starts at ${new Date(job.timeWindow.startTime * 1000).toISOString()})`);
          return;
        }

        // Check if window expired
        if (now > job.timeWindow.endTime) {
          if (job.timeWindow.executeOnExpiry) {
            console.log(`Job ${jobId} time window expired, executing at market gas price`);
            await this.executeJob(jobId);
          } else {
            console.log(`Job ${jobId} time window expired and executeOnExpiry is false, stopping monitoring`);
            this.stopMonitoring(jobId);
          }
          return;
        }

        // Check gas conditions
        if (job.gasConditions.enforceConditions) {
          const result = await this.gasOracle.checkGasConditions({
            maxBaseFeeGwei: Number(job.gasConditions.maxBaseFeeGwei),
            maxPriorityFeeGwei: Number(job.gasConditions.maxPriorityFeeGwei),
            maxTotalFeeGwei: Number(job.gasConditions.maxTotalFeeGwei),
          });

          if (result.meetsConditions) {
            console.log(`Job ${jobId} gas conditions met:`, result.currentPrices);
            await this.executeJob(jobId);
          } else {
            console.log(`Job ${jobId} waiting for gas conditions: ${result.reason}`);
          }
        } else {
          // No gas conditions, execute immediately if in time window
          console.log(`Job ${jobId} has no gas conditions, executing`);
          await this.executeJob(jobId);
        }
      } catch (error) {
        console.error(`Error checking job ${jobId}:`, error);
      }
    };

    // Check immediately
    await checkJob();

    // Then check every 12 seconds (roughly 1 block on Ethereum)
    const interval = setInterval(checkJob, 12000);
    this.monitoring.set(jobId, interval);
  }

  /**
   * Execute a job
   */
  private async executeJob(jobId: number): Promise<void> {
    try {
      console.log(`Executing job ${jobId}...`);

      // Check if job can be executed
      const [canExecute, reason] = await this.contract.canExecuteJob(jobId);
      
      if (!canExecute) {
        console.log(`Cannot execute job ${jobId}: ${reason}`);
        this.stopMonitoring(jobId);
        return;
      }

      // Execute the transfer
      const tx = await this.contract.executeTransfer(jobId);
      console.log(`Transaction sent for job ${jobId}: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`Job ${jobId} executed successfully in block ${receipt.blockNumber}`);

      // Stop monitoring this job
      this.stopMonitoring(jobId);
    } catch (error) {
      console.error(`Error executing job ${jobId}:`, error);
      // Don't stop monitoring - might be a temporary error
    }
  }

  /**
   * Stop monitoring a job
   */
  stopMonitoring(jobId: number): void {
    const interval = this.monitoring.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.monitoring.delete(jobId);
      console.log(`Stopped monitoring job ${jobId}`);
    }
  }

  /**
   * Start listening for new jobs
   */
  startListening(): void {
    console.log('Starting to listen for new jobs...');

    this.contract.on('JobScheduled', async (jobId) => {
      console.log(`New job scheduled: ${jobId}`);
      await this.monitorJob(Number(jobId));
    });

    this.contract.on('JobCanceled', (jobId) => {
      console.log(`Job ${jobId} canceled`);
      this.stopMonitoring(Number(jobId));
    });

    console.log('Relayer service started');
  }

  /**
   * Stop the relayer service
   */
  stop(): void {
    console.log('Stopping relayer service...');
    
    // Stop all monitoring intervals
    for (const [jobId, interval] of this.monitoring.entries()) {
      clearInterval(interval);
      console.log(`Stopped monitoring job ${jobId}`);
    }
    
    this.monitoring.clear();

    // Remove all event listeners
    this.contract.removeAllListeners();
    
    console.log('Relayer service stopped');
  }
}
