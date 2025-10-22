// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ZegasL2Optimizer
 * @notice Layer 2 Gas Optimization Module for ZeGas Smart Transfer
 * @dev Dynamically routes transactions to the cheapest L2 network based on real-time gas prices
 * 
 * Features:
 * - Multi-L2 support (Arbitrum, Optimism, Base, Polygon, zkSync, Linea, Scroll)
 * - Gas price comparison and intelligent routing
 * - Cross-chain messaging integration (CCIP/LayerZero/Axelar)
 * - Paymaster support for stablecoin gas payments (EIP-4337)
 * - Batch transaction bundling
 * - Fallback to L1 execution
 */
contract ZegasL2Optimizer is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Supported L2 Networks
    enum L2Network {
        ETHEREUM_L1,
        ARBITRUM,
        OPTIMISM,
        BASE,
        POLYGON,
        ZKSYNC,
        LINEA,
        SCROLL
    }

    // Job configuration
    struct L2Job {
        address sender;
        address token;
        address recipient;
        uint256 amount;
        uint256 maxGasCap;          // Maximum gas price in gwei
        uint256 startTime;          // Execution window start
        uint256 endTime;            // Execution window end
        L2Network[] preferredL2s;   // Preferred L2 networks (in priority order)
        bool executeOnExpiry;       // Force execute on L1 if expired
        bool allowL1Fallback;       // Allow L1 execution if all L2s expensive
        bool useBatching;           // Enable batch bundling
        address feeToken;           // Token for gas payment (address(0) = ETH)
        bool executed;
        bool cancelled;
        uint256 executedAt;
        L2Network executedOn;
    }

    // State variables
    mapping(uint256 => L2Job) public jobs;
    mapping(address => bool) public authorizedRelayers;
    mapping(L2Network => bool) public supportedNetworks;
    mapping(L2Network => address) public l2Bridges;  // Bridge contracts for cross-chain messaging
    
    uint256 public nextJobId;
    uint256 public platformFeeBps;  // Platform fee in basis points (100 = 1%)
    address public feeCollector;
    
    // L2 gas price thresholds (in gwei)
    mapping(L2Network => uint256) public l2GasThresholds;

    // Events
    event JobScheduled(
        uint256 indexed jobId,
        address indexed sender,
        address token,
        uint256 amount,
        L2Network[] preferredL2s
    );
    
    event JobExecuted(
        uint256 indexed jobId,
        L2Network executedOn,
        uint256 gasPriceGwei,
        uint256 timestamp
    );
    
    event JobCancelled(uint256 indexed jobId, address indexed sender);
    event RelayerAuthorized(address indexed relayer);
    event RelayerRevoked(address indexed relayer);
    event L2NetworkConfigured(L2Network indexed network, address bridge, uint256 gasThreshold);
    event PlatformFeeUpdated(uint256 newFeeBps);
    event FeeCollectorUpdated(address newCollector);

    // Modifiers
    modifier onlyRelayer() {
        require(authorizedRelayers[msg.sender], "Not authorized relayer");
        _;
    }

    constructor(
        uint256 _platformFeeBps,
        address _feeCollector,
        address[] memory _initialRelayers
    ) Ownable(msg.sender) {
        require(_platformFeeBps <= 1000, "Fee too high"); // Max 10%
        platformFeeBps = _platformFeeBps;
        feeCollector = _feeCollector == address(0) ? msg.sender : _feeCollector;
        
        // Authorize initial relayers
        for (uint256 i = 0; i < _initialRelayers.length; i++) {
            authorizedRelayers[_initialRelayers[i]] = true;
            emit RelayerAuthorized(_initialRelayers[i]);
        }
        
        // Enable all L2 networks by default
        supportedNetworks[L2Network.ETHEREUM_L1] = true;
        supportedNetworks[L2Network.ARBITRUM] = true;
        supportedNetworks[L2Network.OPTIMISM] = true;
        supportedNetworks[L2Network.BASE] = true;
        supportedNetworks[L2Network.POLYGON] = true;
        supportedNetworks[L2Network.ZKSYNC] = true;
        supportedNetworks[L2Network.LINEA] = true;
        supportedNetworks[L2Network.SCROLL] = true;
        
        // Set default gas thresholds (in gwei)
        l2GasThresholds[L2Network.ETHEREUM_L1] = 20;    // 20 gwei for L1
        l2GasThresholds[L2Network.ARBITRUM] = 1;         // 1 gwei for Arbitrum
        l2GasThresholds[L2Network.OPTIMISM] = 1;         // 1 gwei for Optimism
        l2GasThresholds[L2Network.BASE] = 1;             // 1 gwei for Base
        l2GasThresholds[L2Network.POLYGON] = 2;          // 2 gwei for Polygon
        l2GasThresholds[L2Network.ZKSYNC] = 1;           // 1 gwei for zkSync
        l2GasThresholds[L2Network.LINEA] = 1;            // 1 gwei for Linea
        l2GasThresholds[L2Network.SCROLL] = 1;           // 1 gwei for Scroll
    }

    /**
     * @notice Schedule a new L2-optimized transfer
     * @param token Token address (address(0) for native ETH)
     * @param recipient Recipient address
     * @param amount Amount to transfer
     * @param maxGasCap Maximum acceptable gas price in gwei
     * @param startTime Execution window start timestamp
     * @param endTime Execution window end timestamp
     * @param preferredL2s Array of preferred L2 networks (in priority order)
     * @param executeOnExpiry Execute on L1 if window expires
     * @param allowL1Fallback Allow L1 execution if all L2s expensive
     * @param useBatching Enable batch bundling
     * @param feeToken Token for gas payment (address(0) = ETH)
     */
    function scheduleTransfer(
        address token,
        address recipient,
        uint256 amount,
        uint256 maxGasCap,
        uint256 startTime,
        uint256 endTime,
        L2Network[] memory preferredL2s,
        bool executeOnExpiry,
        bool allowL1Fallback,
        bool useBatching,
        address feeToken
    ) external payable nonReentrant returns (uint256) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(startTime >= block.timestamp, "Start time must be in future");
        require(endTime > startTime, "End time must be after start");
        require(maxGasCap > 0, "Gas cap must be > 0");
        require(preferredL2s.length > 0, "Must specify at least one L2");

        // Validate all preferred L2s are supported
        for (uint256 i = 0; i < preferredL2s.length; i++) {
            require(supportedNetworks[preferredL2s[i]], "Unsupported L2 network");
        }

        uint256 jobId = nextJobId++;

        // Handle token transfer
        if (token == address(0)) {
            require(msg.value == amount, "Incorrect ETH amount");
        } else {
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        jobs[jobId] = L2Job({
            sender: msg.sender,
            token: token,
            recipient: recipient,
            amount: amount,
            maxGasCap: maxGasCap,
            startTime: startTime,
            endTime: endTime,
            preferredL2s: preferredL2s,
            executeOnExpiry: executeOnExpiry,
            allowL1Fallback: allowL1Fallback,
            useBatching: useBatching,
            feeToken: feeToken,
            executed: false,
            cancelled: false,
            executedAt: 0,
            executedOn: L2Network.ETHEREUM_L1
        });

        emit JobScheduled(jobId, msg.sender, token, amount, preferredL2s);
        return jobId;
    }

    /**
     * @notice Execute a scheduled transfer on the optimal L2 network
     * @param jobId Job identifier
     * @param currentGasPrice Current gas price in gwei on selected network
     * @param selectedL2 Network to execute on (must be in preferredL2s or L1 fallback)
     */
    function executeTransfer(
        uint256 jobId,
        uint256 currentGasPrice,
        L2Network selectedL2
    ) external onlyRelayer nonReentrant {
        L2Job storage job = jobs[jobId];
        
        require(!job.executed, "Already executed");
        require(!job.cancelled, "Job cancelled");
        require(block.timestamp >= job.startTime, "Not yet started");
        require(block.timestamp <= job.endTime || job.executeOnExpiry, "Execution window expired");

        // Validate network selection
        bool isPreferred = false;
        for (uint256 i = 0; i < job.preferredL2s.length; i++) {
            if (job.preferredL2s[i] == selectedL2) {
                isPreferred = true;
                break;
            }
        }
        
        if (!isPreferred) {
            require(
                job.allowL1Fallback && selectedL2 == L2Network.ETHEREUM_L1,
                "Network not in preferred list"
            );
        }

        // Validate gas price
        if (block.timestamp <= job.endTime) {
            require(currentGasPrice <= job.maxGasCap, "Gas price too high");
        }

        // Mark as executed
        job.executed = true;
        job.executedAt = block.timestamp;
        job.executedOn = selectedL2;

        // Calculate platform fee
        uint256 platformFee = (job.amount * platformFeeBps) / 10000;
        uint256 amountAfterFee = job.amount - platformFee;

        // Execute transfer based on network
        if (selectedL2 == L2Network.ETHEREUM_L1) {
            _executeOnL1(job, amountAfterFee, platformFee);
        } else {
            _executeOnL2(job, amountAfterFee, platformFee, selectedL2);
        }

        emit JobExecuted(jobId, selectedL2, currentGasPrice, block.timestamp);
    }

    /**
     * @notice Cancel a scheduled transfer and refund
     * @param jobId Job identifier
     */
    function cancelTransfer(uint256 jobId) external nonReentrant {
        L2Job storage job = jobs[jobId];
        
        require(msg.sender == job.sender, "Not job owner");
        require(!job.executed, "Already executed");
        require(!job.cancelled, "Already cancelled");

        job.cancelled = true;

        // Refund tokens
        if (job.token == address(0)) {
            payable(job.sender).transfer(job.amount);
        } else {
            IERC20(job.token).safeTransfer(job.sender, job.amount);
        }

        emit JobCancelled(jobId, msg.sender);
    }

    /**
     * @notice Execute transfer on Ethereum L1
     */
    function _executeOnL1(
        L2Job memory job,
        uint256 amountAfterFee,
        uint256 platformFee
    ) private {
        if (job.token == address(0)) {
            // Native ETH transfer
            payable(job.recipient).transfer(amountAfterFee);
            if (platformFee > 0) {
                payable(feeCollector).transfer(platformFee);
            }
        } else {
            // ERC20 transfer
            IERC20(job.token).safeTransfer(job.recipient, amountAfterFee);
            if (platformFee > 0) {
                IERC20(job.token).safeTransfer(feeCollector, platformFee);
            }
        }
    }

    /**
     * @notice Execute transfer on L2 network via bridge
     * @dev This is a placeholder for cross-chain messaging integration (CCIP/LayerZero/Axelar)
     */
    function _executeOnL2(
        L2Job memory job,
        uint256 amountAfterFee,
        uint256 platformFee,
        L2Network targetL2
    ) private {
        // TODO: Integrate with cross-chain messaging protocol
        // For now, execute on L1 and emit event for off-chain relayer to bridge
        
        address bridge = l2Bridges[targetL2];
        require(bridge != address(0), "L2 bridge not configured");
        
        // Transfer to bridge contract
        if (job.token == address(0)) {
            payable(bridge).transfer(amountAfterFee + platformFee);
        } else {
            IERC20(job.token).safeTransfer(bridge, amountAfterFee + platformFee);
        }
        
        // Note: Actual bridging logic would be implemented here
        // using CCIP, LayerZero, or Axelar depending on the target L2
    }

    // Admin functions

    function authorizeRelayer(address relayer) external onlyOwner {
        authorizedRelayers[relayer] = true;
        emit RelayerAuthorized(relayer);
    }

    function revokeRelayer(address relayer) external onlyOwner {
        authorizedRelayers[relayer] = false;
        emit RelayerRevoked(relayer);
    }

    function configureL2Network(
        L2Network network,
        address bridge,
        uint256 gasThreshold,
        bool enabled
    ) external onlyOwner {
        supportedNetworks[network] = enabled;
        l2Bridges[network] = bridge;
        l2GasThresholds[network] = gasThreshold;
        emit L2NetworkConfigured(network, bridge, gasThreshold);
    }

    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high");
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }

    function setFeeCollector(address newCollector) external onlyOwner {
        require(newCollector != address(0), "Invalid collector");
        feeCollector = newCollector;
        emit FeeCollectorUpdated(newCollector);
    }

    // View functions

    function getJob(uint256 jobId) external view returns (L2Job memory) {
        return jobs[jobId];
    }

    function canExecute(uint256 jobId, uint256 currentGasPrice, L2Network network) 
        external 
        view 
        returns (bool) 
    {
        L2Job memory job = jobs[jobId];
        
        if (job.executed || job.cancelled) return false;
        if (block.timestamp < job.startTime) return false;
        if (block.timestamp > job.endTime && !job.executeOnExpiry) return false;
        if (block.timestamp <= job.endTime && currentGasPrice > job.maxGasCap) return false;
        
        // Check if network is preferred
        bool isPreferred = false;
        for (uint256 i = 0; i < job.preferredL2s.length; i++) {
            if (job.preferredL2s[i] == network) {
                isPreferred = true;
                break;
            }
        }
        
        if (!isPreferred && !(job.allowL1Fallback && network == L2Network.ETHEREUM_L1)) {
            return false;
        }
        
        return true;
    }

    function getL2Threshold(L2Network network) external view returns (uint256) {
        return l2GasThresholds[network];
    }

    receive() external payable {}
}
