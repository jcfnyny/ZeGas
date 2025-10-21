// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ZegasSmartTransfer
 * @notice Gas-price-aware token transfer scheduler with time windows and permit support
 * @dev Executes transfers only when gas price conditions and time windows are met
 */
contract ZegasSmartTransfer is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct GasConditions {
        uint256 maxBaseFeeGwei;           // Max base fee in Gwei
        uint256 maxPriorityFeeGwei;       // Max priority fee in Gwei  
        uint256 maxTotalFeeGwei;          // Max total fee in Gwei
        bool enforceConditions;            // If false, execute at any gas price
    }

    struct TimeWindow {
        uint64 startTime;                  // Earliest execution time
        uint64 endTime;                    // Latest execution time / expiration
        bool executeOnExpiry;              // Execute at market gas if window expires
    }

    struct TransferJob {
        address from;                      // Sender address
        address to;                        // Recipient address
        address token;                     // ERC20 token (address(0) for ETH)
        uint256 amount;                    // Transfer amount in wei
        uint256 chainId;                   // Target chain ID
        GasConditions gasConditions;       // Gas price thresholds
        TimeWindow timeWindow;             // Execution time constraints
        bool executed;                     // Execution status
        bool canceled;                     // Cancellation status
        string purpose;                    // Transfer purpose/memo
        uint256 nonce;                     // User nonce for replay protection
    }

    mapping(uint256 => TransferJob) public jobs;
    mapping(address => uint256) public userNonces;
    uint256 public jobCount;
    
    // Authorized relayers that can execute transfers
    mapping(address => bool) public authorizedRelayers;
    
    // Platform fee in basis points (1 bp = 0.01%)
    uint256 public platformFeeBps;
    address public feeCollector;

    event JobScheduled(
        uint256 indexed jobId,
        address indexed from,
        address indexed to,
        address token,
        uint256 amount,
        uint64 startTime,
        uint64 endTime,
        uint256 maxBaseFeeGwei
    );
    
    event JobExecuted(
        uint256 indexed jobId,
        address indexed executor,
        uint256 actualBaseFee,
        uint256 actualPriorityFee
    );
    
    event JobCanceled(uint256 indexed jobId, address indexed canceler);
    event RelayerAuthorized(address indexed relayer, bool status);
    event FeeUpdated(uint256 newFeeBps, address newCollector);

    /**
     * @param initialFeeBps Initial platform fee in basis points (max 1000 = 10%)
     * @param initialFeeCollector Address to receive platform fees
     */
    constructor(uint256 initialFeeBps, address initialFeeCollector) Ownable(msg.sender) {
        require(initialFeeBps <= 1000, "Fee too high (max 10%)");
        require(initialFeeCollector != address(0), "Invalid fee collector");
        
        platformFeeBps = initialFeeBps;
        feeCollector = initialFeeCollector;
    }

    /**
     * @notice Schedule a new transfer with gas price conditions
     * @param to Recipient address
     * @param token ERC20 token address (address(0) for ETH)
     * @param amount Transfer amount
     * @param gasConditions Gas price thresholds
     * @param timeWindow Execution time constraints
     * @param purpose Transfer description
     */
    function scheduleTransfer(
        address to,
        address token,
        uint256 amount,
        GasConditions calldata gasConditions,
        TimeWindow calldata timeWindow,
        string calldata purpose
    ) external payable returns (uint256 jobId) {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(timeWindow.startTime >= block.timestamp, "Start time in past");
        require(timeWindow.endTime > timeWindow.startTime, "Invalid time window");
        
        jobId = ++jobCount;
        
        // Transfer tokens to contract
        if (token == address(0)) {
            require(msg.value == amount, "ETH amount mismatch");
        } else {
            require(msg.value == 0, "Do not send ETH for token transfer");
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        jobs[jobId] = TransferJob({
            from: msg.sender,
            to: to,
            token: token,
            amount: amount,
            chainId: block.chainid,
            gasConditions: gasConditions,
            timeWindow: timeWindow,
            executed: false,
            canceled: false,
            purpose: purpose,
            nonce: userNonces[msg.sender]++
        });

        emit JobScheduled(
            jobId,
            msg.sender,
            to,
            token,
            amount,
            timeWindow.startTime,
            timeWindow.endTime,
            gasConditions.maxBaseFeeGwei
        );
    }

    /**
     * @notice Schedule transfer using permit for gasless approval
     * @param to Recipient address
     * @param token ERC20 token address
     * @param amount Transfer amount
     * @param gasConditions Gas price thresholds
     * @param timeWindow Execution time constraints
     * @param purpose Transfer description
     * @param deadline Permit deadline
     * @param v Permit signature v
     * @param r Permit signature r
     * @param s Permit signature s
     */
    function scheduleTransferWithPermit(
        address to,
        address token,
        uint256 amount,
        GasConditions calldata gasConditions,
        TimeWindow calldata timeWindow,
        string calldata purpose,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 jobId) {
        require(token != address(0), "Permit not available for ETH");
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(timeWindow.startTime >= block.timestamp, "Start time in past");
        require(timeWindow.endTime > timeWindow.startTime, "Invalid time window");
        
        // Execute permit
        IERC20Permit(token).permit(
            msg.sender,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );
        
        // Transfer tokens
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        jobId = ++jobCount;
        
        jobs[jobId] = TransferJob({
            from: msg.sender,
            to: to,
            token: token,
            amount: amount,
            chainId: block.chainid,
            gasConditions: gasConditions,
            timeWindow: timeWindow,
            executed: false,
            canceled: false,
            purpose: purpose,
            nonce: userNonces[msg.sender]++
        });

        emit JobScheduled(
            jobId,
            msg.sender,
            to,
            token,
            amount,
            timeWindow.startTime,
            timeWindow.endTime,
            gasConditions.maxBaseFeeGwei
        );
    }

    /**
     * @notice Execute a scheduled transfer if conditions are met
     * @param jobId The job ID to execute
     * @dev Can only be called by authorized relayers or anyone if no gas conditions
     */
    function executeTransfer(uint256 jobId) external nonReentrant {
        TransferJob storage job = jobs[jobId];
        
        require(!job.executed && !job.canceled, "Job not active");
        require(block.chainid == job.chainId, "Wrong network");
        require(block.timestamp >= job.timeWindow.startTime, "Too early");
        
        // Validate execution conditions
        _validateExecutionConditions(job);
        
        job.executed = true;
        
        // Execute transfer with fees
        _executeTransferWithFees(jobId, job);
        
        emit JobExecuted(
            jobId,
            msg.sender,
            block.basefee / 1 gwei,
            (tx.gasprice - block.basefee) / 1 gwei
        );
    }

    /**
     * @dev Internal function to validate gas and time conditions
     */
    function _validateExecutionConditions(TransferJob storage job) private view {
        bool windowExpired = block.timestamp > job.timeWindow.endTime;
        
        if (windowExpired) {
            require(job.timeWindow.executeOnExpiry, "Window expired");
            return;
        }
        
        // Validate gas conditions if enforced
        if (!job.gasConditions.enforceConditions) return;
        
        require(
            authorizedRelayers[msg.sender],
            "Only authorized relayers can execute"
        );
        
        uint256 baseFeeGwei = block.basefee / 1 gwei;
        require(
            baseFeeGwei <= job.gasConditions.maxBaseFeeGwei,
            "Base fee too high"
        );
        
        if (job.gasConditions.maxPriorityFeeGwei > 0) {
            uint256 priorityFeeGwei = (tx.gasprice - block.basefee) / 1 gwei;
            require(
                priorityFeeGwei <= job.gasConditions.maxPriorityFeeGwei,
                "Priority fee too high"
            );
        }
        
        if (job.gasConditions.maxTotalFeeGwei > 0) {
            uint256 totalFeeGwei = tx.gasprice / 1 gwei;
            require(
                totalFeeGwei <= job.gasConditions.maxTotalFeeGwei,
                "Total fee too high"
            );
        }
    }

    /**
     * @dev Internal function to execute transfer and collect fees
     */
    function _executeTransferWithFees(uint256 jobId, TransferJob storage job) private {
        uint256 platformFee = (job.amount * platformFeeBps) / 10000;
        uint256 transferAmount = job.amount - platformFee;
        
        if (job.token == address(0)) {
            if (platformFee > 0) {
                (bool feeSent,) = payable(feeCollector).call{value: platformFee}("");
                require(feeSent, "Fee transfer failed");
            }
            (bool sent,) = payable(job.to).call{value: transferAmount}("");
            require(sent, "ETH transfer failed");
        } else {
            if (platformFee > 0) {
                IERC20(job.token).safeTransfer(feeCollector, platformFee);
            }
            IERC20(job.token).safeTransfer(job.to, transferAmount);
        }
    }

    /**
     * @notice Cancel a scheduled transfer and refund tokens
     * @param jobId The job ID to cancel
     */
    function cancelTransfer(uint256 jobId) external {
        TransferJob storage job = jobs[jobId];
        
        require(msg.sender == job.from, "Not job owner");
        require(!job.executed && !job.canceled, "Job not active");
        require(block.timestamp < job.timeWindow.endTime, "Window expired");
        
        job.canceled = true;
        
        // Refund tokens to sender
        if (job.token == address(0)) {
            (bool sent,) = payable(job.from).call{value: job.amount}("");
            require(sent, "ETH refund failed");
        } else {
            IERC20(job.token).safeTransfer(job.from, job.amount);
        }
        
        emit JobCanceled(jobId, msg.sender);
    }

    /**
     * @notice Admin function to authorize/deauthorize relayers
     * @param relayer Relayer address
     * @param status Authorization status
     */
    function setRelayerAuthorization(address relayer, bool status) external onlyOwner {
        authorizedRelayers[relayer] = status;
        emit RelayerAuthorized(relayer, status);
    }

    /**
     * @notice Admin function to update platform fee
     * @param newFeeBps New fee in basis points
     * @param newCollector New fee collector address
     */
    function updateFee(uint256 newFeeBps, address newCollector) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high (max 10%)");
        require(newCollector != address(0), "Invalid collector");
        
        platformFeeBps = newFeeBps;
        feeCollector = newCollector;
        
        emit FeeUpdated(newFeeBps, newCollector);
    }

    /**
     * @notice Get job details
     * @param jobId The job ID
     * @return job The job details
     */
    function getJob(uint256 jobId) external view returns (TransferJob memory) {
        return jobs[jobId];
    }

    /**
     * @notice Check if job can be executed at current gas prices
     * @param jobId The job ID
     * @return canExecute Whether the job can be executed
     * @return reason Reason if cannot execute
     */
    function canExecuteJob(uint256 jobId) external view returns (bool canExecute, string memory reason) {
        TransferJob storage job = jobs[jobId];
        
        if (job.executed) return (false, "Already executed");
        if (job.canceled) return (false, "Canceled");
        if (block.timestamp < job.timeWindow.startTime) return (false, "Too early");
        if (block.timestamp > job.timeWindow.endTime && !job.timeWindow.executeOnExpiry) {
            return (false, "Window expired");
        }
        
        if (job.gasConditions.enforceConditions && block.timestamp <= job.timeWindow.endTime) {
            uint256 baseFeeGwei = block.basefee / 1 gwei;
            
            if (baseFeeGwei > job.gasConditions.maxBaseFeeGwei) {
                return (false, "Base fee too high");
            }
        }
        
        return (true, "");
    }

    receive() external payable {}
}
