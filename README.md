
# ⛽ ZeGas – Smarter Ethereum Transactions

**ZeGas** is a decentralized scheduler that automatically executes Ethereum transactions when gas prices fall below a user-defined threshold. It helps users, DAOs, and DeFi protocols save gas and time by automating “send-later” transactions on-chain.

## 💡 Problem
Gas prices are volatile. Users either overpay to get included fast or wait around watching charts. Ethereum has no native “send when gas < X gwei”.

## 🚀 Solution
ZeGas queues jobs on-chain and executes them automatically once live gas meets user thresholds. A relayer/keeper triggers the transaction and earns a bounty. Users can create, view, and cancel jobs from a simple web UI.

## 🧭 How the Tech Stack Works Together
ZeGas is a hybrid on-chain/off-chain system:
- **On-chain (Solidity + Hardhat + OpenZeppelin):** `ZegasScheduler.sol` stores jobs (target, calldata, ETH value, max gas, window, bounty). `execute(jobId, gasObs)` checks the gas threshold and time window, performs the call/transfer, and pays the executor.
- **Gas source:** EIP-1559 `block.basefee` and/or a Chainlink gas feed (configurable).
- **Off-chain (TypeScript bot or Chainlink Automation):** Monitors gas via Ethers.js & RPC, then calls `execute` when conditions are met. OpenZeppelin Defender Relayer is optional.
- **Frontend (Next.js + Tailwind + Ethers.js):** Schedules jobs and shows status. Optional indexing via The Graph for faster lists.

### Sequence (Happy Path)
1) User creates a job with `maxGas` & bounty → contract stores it.  
2) Watcher checks gas periodically → when `gas <= maxGas` and within window → submits `execute`.  
3) Contract performs the call/transfer and pays the bounty → UI updates from events.

## 🧩 Tech
- **Contracts:** Solidity, Hardhat, OpenZeppelin
- **Automation:** Node/TS watcher, optional Chainlink Automation, optional OZ Defender
- **Frontend:** Next.js, TailwindCSS, Ethers.js
- **Infra:** Alchemy/Infura RPC, Etherscan verification

## 🧰 Quickstart

```bash
# 0) Node 18+, PNPM or NPM, and a Sepolia RPC
# 1) Install deps
npm install

# 2) Compile contracts
npx hardhat compile

# 3) Deploy (Sepolia)
RPC_URL=<your> PRIVATE_KEY=<pk> npx hardhat run scripts/deploy.ts --network sepolia

# 4) Run watcher
RELAYER_KEY=<pk> SCHEDULER_ADDRESS=<addr> RPC_URL=<your> npm run watcher

# 5) Frontend
cd frontend && npm install && npm run dev
```

## 🏁 License
MIT © 2025 ZeGas
