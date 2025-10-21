# Zegas Scheduler

## Overview
Zegas is a blockchain-based task scheduler application built with Next.js and Ethereum smart contracts. It allows users to schedule transactions on the Ethereum blockchain and includes a relayer bot that watches for and executes scheduled transactions automatically.

**Current State**: Successfully migrated from Vercel to Replit. The development server is running and the application is functional.

## Recent Changes (October 21, 2025)

### Vercel to Replit Migration
- Updated Next.js dev and production servers to use port 5000 and bind to 0.0.0.0 for Replit compatibility
- Configured workflow to run Next.js dev server from the `frontend/` directory
- Configured deployment settings for production autoscaling
- Updated Next.js from 14.2.5 to 14.2.33 to address critical security vulnerabilities
- Installed all dependencies for both root and frontend directories

### User Experience Improvements
- Added `ContractSelector` component to allow users to enter their deployed contract address
- Implemented localStorage persistence to remember user's selected contract
- Added clear guidance for users to deploy contracts using `npm run deploy`
- Fixed TypeScript configuration (ES2020 target) and added window.ethereum type definitions
- Improved UI with better messaging and validation for contract addresses

## Project Architecture

### Structure
This is a monorepo containing:

- **/contracts**: Solidity smart contracts
  - `ZegasScheduler.sol`: Main scheduler contract built with OpenZeppelin
  
- **/frontend**: Next.js application (pages directory)
  - `pages/`: Page routes
  - `components/`: React components
    - `SchedulerForm.tsx`: Main form for creating scheduled transactions
    - `ContractSelector.tsx`: UI for selecting/entering contract address with localStorage persistence
  - `types/`: TypeScript type definitions
  - `styles/`: Global CSS and Tailwind configuration
  
- **/scripts**: Deployment and utility scripts
  - `deploy.ts`: Contract deployment script
  - `fund-relayer.ts`: Script to fund the relayer wallet
  
- **/bots**: Background automation
  - `watcher.ts`: Relayer bot that monitors and executes scheduled transactions

### Tech Stack
- **Frontend**: Next.js 14.2.33, React 18, Tailwind CSS
- **Smart Contracts**: Solidity with Hardhat and OpenZeppelin
- **Blockchain Interaction**: ethers.js v6
- **Development**: TypeScript, Node.js 20

## Environment Variables

### Backend (Root .env)
Required for contract deployment and relayer bot:
- `RPC_URL`: Ethereum RPC endpoint (Infura/Alchemy)
- `PRIVATE_KEY`: Deployer wallet private key
- `ETHERSCAN_API_KEY`: For contract verification
- `RELAYER_KEY`: Relayer bot wallet private key
- `SCHEDULER_ADDRESS`: Deployed ZegasScheduler contract address

### Frontend (frontend/.env.local)
Optional - users can also enter the contract address directly in the UI:
- `NEXT_PUBLIC_SCHEDULER`: ZegasScheduler contract address (same as SCHEDULER_ADDRESS)

**Note**: The frontend now includes a user-friendly contract selector that allows users to enter their contract address directly in the browser. The address is saved in localStorage, so users only need to enter it once.

## Development

### Running Locally
The Next.js dev server is configured to run automatically via the Replit workflow:
```bash
cd frontend && npm run dev
```
This runs on port 5000 and binds to 0.0.0.0 for Replit compatibility.

### Other Commands
- `npm run compile`: Compile smart contracts with Hardhat
- `npm run deploy`: Deploy contracts to Sepolia network
- `npm run watcher`: Start the relayer bot

## Deployment
The project is configured for Replit deployment with autoscaling:
- **Build**: `cd frontend && npm run build`
- **Start**: `cd frontend && npm run start` (runs on port 5000)

## Security Notes
- All private keys and API keys are stored as Replit secrets
- Next.js updated to latest patch version (14.2.33) to address security vulnerabilities
- Client/server separation maintained with proper environment variable prefixing
