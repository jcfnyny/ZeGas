// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ZegasScheduler is ReentrancyGuard, Ownable {
    struct Job {
        address owner;
        address target;
        uint256 value;
        bytes data;
        uint256 maxGasGwei;
        uint64 startBlock;
        uint64 deadlineBlock;
        uint256 bountyWei;
        bool executed;
        bool canceled;
    }

    mapping(uint256 => Job) public jobs;
    uint256 public jobCount;

    event JobCreated(uint256 indexed jobId, address indexed owner, address target);
    event JobExecuted(uint256 indexed jobId, address indexed executor, uint256 gasUsedGwei);
    event JobCanceled(uint256 indexed jobId);

    function createJob(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 maxGasGwei,
        uint64 startBlock,
        uint64 deadlineBlock
    ) external payable returns (uint256 jobId) {
        require(msg.value > 0, "bounty required");
        require(deadlineBlock > block.number, "invalid window");

        jobId = ++jobCount;
        jobs[jobId] = Job({
            owner: msg.sender,
            target: target,
            value: value,
            data: data,
            maxGasGwei: maxGasGwei,
            startBlock: startBlock,
            deadlineBlock: deadlineBlock,
            bountyWei: msg.value,
            executed: false,
            canceled: false
        });

        emit JobCreated(jobId, msg.sender, target);
    }

    function execute(uint256 jobId, uint256 gasObservationGwei) external nonReentrant {
        Job storage job = jobs[jobId];
        require(!job.executed && !job.canceled, "done");
        require(block.number >= job.startBlock && block.number <= job.deadlineBlock, "window");
        require(gasObservationGwei <= job.maxGasGwei, "gas too high");

        job.executed = true;

        (bool ok,) = job.target.call{value: job.value}(job.data);
        require(ok, "call failed");

        (bool sent,) = payable(msg.sender).call{value: job.bountyWei}("");
        require(sent, "bounty fail");

        emit JobExecuted(jobId, msg.sender, gasObservationGwei);
    }

    function cancel(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.owner, "not owner");
        require(!job.executed && !job.canceled, "done");
        job.canceled = true;

        (bool sent,) = payable(job.owner).call{value: job.bountyWei}("");
        require(sent, "refund fail");

        emit JobCanceled(jobId);
    }

    receive() external payable {}
}
