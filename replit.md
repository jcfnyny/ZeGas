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
  - `ZegasScheduler.sol`: Original scheduler contract for general transactions
  - `ZegasTokenTransfer.sol`: Token transfer scheduler with ERC20 and native token support
  
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
  - `deploy.ts`: Deploy ZegasScheduler contract
  - `deploy-transfer.ts`: Deploy ZegasTokenTransfer contract
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
