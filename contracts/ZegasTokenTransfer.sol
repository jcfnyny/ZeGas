// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ZegasTokenTransfer is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Transfer {
        address from;
        address to;
        address token;
        uint256 amount;
        uint256 chainId;
        uint64 executeAfter;
        bool executed;
        bool canceled;
    }

    mapping(uint256 => Transfer) public transfers;
    uint256 public transferCount;

    event TransferScheduled(
        uint256 indexed transferId,
        address indexed from,
        address indexed to,
        address token,
        uint256 amount,
        uint256 chainId,
        uint64 executeAfter
    );
    event TransferExecuted(uint256 indexed transferId, address indexed executor);
    event TransferCanceled(uint256 indexed transferId);

    function scheduleTransfer(
        address to,
        address token,
        uint256 amount,
        uint64 executeAfter
    ) external payable returns (uint256 transferId) {
        require(to != address(0), "invalid recipient");
        require(executeAfter > block.timestamp, "invalid time");
        require(amount > 0, "amount must be > 0");

        transferId = ++transferCount;
        
        if (token == address(0)) {
            require(msg.value == amount, "ETH amount mismatch");
        } else {
            require(msg.value == 0, "do not send ETH for token transfer");
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        transfers[transferId] = Transfer({
            from: msg.sender,
            to: to,
            token: token,
            amount: amount,
            chainId: block.chainid,
            executeAfter: executeAfter,
            executed: false,
            canceled: false
        });

        emit TransferScheduled(transferId, msg.sender, to, token, amount, block.chainid, executeAfter);
    }

    function executeTransfer(uint256 transferId) external nonReentrant {
        Transfer storage t = transfers[transferId];
        require(!t.executed && !t.canceled, "transfer not active");
        require(block.timestamp >= t.executeAfter, "too early");
        require(block.chainid == t.chainId, "wrong network");

        t.executed = true;

        if (t.token == address(0)) {
            (bool sent,) = payable(t.to).call{value: t.amount}("");
            require(sent, "ETH transfer failed");
        } else {
            IERC20(t.token).safeTransfer(t.to, t.amount);
        }

        emit TransferExecuted(transferId, msg.sender);
    }

    function cancelTransfer(uint256 transferId) external {
        Transfer storage t = transfers[transferId];
        require(msg.sender == t.from, "not owner");
        require(!t.executed && !t.canceled, "transfer not active");

        t.canceled = true;

        if (t.token == address(0)) {
            (bool sent,) = payable(t.from).call{value: t.amount}("");
            require(sent, "ETH refund failed");
        } else {
            IERC20(t.token).safeTransfer(t.from, t.amount);
        }

        emit TransferCanceled(transferId);
    }

    function getTransfer(uint256 transferId) external view returns (Transfer memory) {
        return transfers[transferId];
    }

    receive() external payable {}
}
