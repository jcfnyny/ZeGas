# ZeGas Smart Transfer

## Overview
ZeGas Smart Transfer is a gas-price-aware token transfer scheduler built with Next.js and Ethereum smart contracts. It monitors real-time gas prices (via 1inch or Chainlink oracles) and automatically executes transfers only when gas fees meet user-defined thresholds, optimizing cost, timing, and reliability.

**Current State**: Major redesign to implement PRD requirements for gas-aware scheduling with time windows, permit support (EIP-2612), and automated relayer execution.

## Recent Changes

### Gas-Aware Scheduling Implementation (October 21, 2025 - PRD Implementation)
- **New Smart Contract**: `ZegasSmartTransfer.sol` with comprehensive gas-price-aware scheduling
  - Gas price thresholds (maxBaseFeeGwei, maxPriorityFeeGwei, maxTotalFeeGwei)
  - Time windows (startTime, endTime) instead of single execution time
  - Execute-on-expiry option for guaranteed execution
  - Permit support (EIP-2612) for gasless approvals
  - Platform fee system with basis points configuration
  - Authorized relayer system for automated execution
- **Gas Oracle Service**: Real-time monitoring via 1inch API with RPC fallback
  - Fetches current base fee, priority fee, and total gas prices
  - Supports Ethereum, Polygon, Arbitrum, and Sepolia
  - 12-second polling for optimal execution timing
- **Relayer Service**: Automated job execution engine
  - Monitors scheduled jobs and checks gas conditions
  - Executes transfers when both time and gas thresholds are met
  - Event-driven architecture for new job detection
  - Configurable retry and monitoring logic
- **Frontend Components**:
  - `GasPriceMonitor.tsx`: Real-time gas price display
  - API endpoint `/api/gas-prices` for fetching current network fees
- **Compiler Configuration**: Enabled viaIR and optimizer to handle complex contract logic

### Previous Changes (October 21, 2025)

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

### Token Transfer Features (October 21, 2025)
- Complete redesign with EigenLayer-inspired UI/UX
- Added wallet connection with MetaMask integration
- Multi-chain support (Ethereum, Sepolia, Polygon, Arbitrum)
- Token selector with popular tokens (ETH, USDC, WBTC, etc.) and custom token input
- Network switching functionality
- Real-time balance display
- New `ZegasTokenTransfer` contract for scheduled ERC20 and native token transfers
- Transaction status indicators with step-by-step feedback

### Kraken Theme Implementation (October 21, 2025)
- Applied Kraken's signature purple color palette (#7434f3 primary, #b494e6 supporting, #bc91f7 accent)
- Dark theme with professional backgrounds (#1a0b2e dark, #0d0618 darker)
- Imported Inter font via Google Fonts for modern, clean typography
- Created eye-catching HeaderBanner with gradient, animations, and trust indicators
- Updated all components with consistent dark purple aesthetic:
  - Glassmorphism effects with backdrop blur
  - Purple gradient buttons with shadow effects
  - Dark form inputs with purple borders and focus states
  - Consistent hover and transition animations
- Maintained visual hierarchy and accessibility across all user flows
- Removed oversized decorative icons for a cleaner, more professional UI

### Contract Deployment UI (October 21, 2025)
- Added browser-based contract deployment with `ContractDeployer` component
- Replaced CLI instruction with interactive "Deploy Contract" button
- Comprehensive deployment parameters with helper text:
  - **Contract Information Panel**: Shows contract name, version, features, and estimated gas cost
  - **Contract Configuration**:
    - Platform fee in basis points (0-1000, default 10 = 0.1%)
    - Fee collector address (optional, defaults to deployer)
    - Initial relayer addresses (comma-separated, optional)
  - **Network Selection**: Ethereum, Sepolia, Polygon, Arbitrum, or Custom RPC with chainId
  - **Gas Price Control**:
    - Minimum acceptable gas price (Gwei)
    - Maximum gas price threshold (deployment waits if exceeded)
    - Gas wait timeout (seconds) - how long to wait for favorable gas prices
  - **Security**: Private key input with warning (not stored, used only for deployment)
  - **Verification**: Optional Etherscan contract verification with API key
- Created `/api/deploy-contract` Next.js API endpoint:
  - Validates wallet balance before deployment
  - Implements gas price waiting loop with configurable timeout
  - Validates gas price within min/max thresholds
  - Deploys ZegasSmartTransfer with custom constructor parameters
  - Authorizes specified relayers after deployment
  - Handles Etherscan verification with network-specific API URLs
- Automatic contract address population and localStorage persistence after deployment
- Professional SVG icons throughout (no emojis):
  - Sparkle icon on Deploy button
  - Spinner animation during deployment
  - Properly sized icons (w-4 to w-6) for visual consistency
- Comprehensive error handling and deployment status feedback
- Fixed OpenZeppelin Contracts v5.x compatibility (ReentrancyGuard import path, Ownable constructor)

## Project Architecture

### Structure
This is a monorepo containing:

- **/contracts**: Solidity smart contracts
  - `ZegasSmartTransfer.sol`: **PRIMARY** - Gas-aware transfer scheduler with time windows and permit support
  - `ZegasScheduler.sol`: Legacy scheduler contract
  - `ZegasTokenTransfer.sol`: Legacy token transfer scheduler
  
- **/services**: Backend services
  - `gasOracle.ts`: Gas price monitoring service (1inch + RPC fallback)
  - `relayer.ts`: Automated job execution engine
  
- **/frontend**: Next.js application (pages directory)
  - `pages/`: Page routes
  - `components/`: React components
    - `WalletConnect.tsx`: MetaMask wallet connection component
    - `NetworkSelector.tsx`: Multi-chain network switching (Ethereum, Sepolia, Polygon, Arbitrum)
    - `TokenSelector.tsx`: Token selection with popular tokens and custom input
    - `TransferForm.tsx`: Main form for scheduling token transfers
    - `ContractSelector.tsx`: UI for selecting/entering contract address with localStorage persistence
    - `SchedulerForm.tsx`: Legacy form for general transactions
  - `types/`: TypeScript type definitions
  - `styles/`: Global CSS and Tailwind configuration
  
- **/scripts**: Deployment and utility scripts
  - `deploy-smart-transfer.ts`: **PRIMARY** - Deploy ZegasSmartTransfer contract
  - `deploy.ts`: Legacy ZegasScheduler deployment
  - `deploy-transfer.ts`: Legacy ZegasTokenTransfer deployment
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
- `npm run deploy`: Deploy ZegasScheduler contract to Sepolia network
- `npx hardhat run scripts/deploy-transfer.ts --network sepolia`: Deploy ZegasTokenTransfer contract
- `npm run watcher`: Start the relayer bot (for ZegasScheduler)

## Deployment
The project is configured for Replit deployment with autoscaling:
- **Build**: `cd frontend && npm run build`
- **Start**: `cd frontend && npm run start` (runs on port 5000)

## Security Notes
- All private keys and API keys are stored as Replit secrets
- Next.js updated to latest patch version (14.2.33) to address security vulnerabilities
- Client/server separation maintained with proper environment variable prefixing
