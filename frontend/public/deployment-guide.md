# ZeGas Smart Transfer - Custom Deployment Parameters

## How to Deploy with Custom Parameters

### Step 1: Connect Your Wallet
Click the "Connect Wallet" button on the homepage.

### Step 2: Access Deployment Screen
After connecting, you'll see the contract selector page with a "Deploy Contract" button.

### Step 3: Configure Your Contract
When you click "Deploy Contract", a modal opens with these custom parameters:

#### Contract Configuration Section
1. **Platform Fee (basis points)**
   - Range: 0-1000 bp (0% - 10%)
   - Default: 10 bp = 0.1%
   - Example: Enter "50" for 0.5% fee on each transfer

2. **Fee Collector Address** (optional)
   - Enter an Ethereum address to receive fees
   - Leave empty to use your deployer address
   - Example: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

3. **Initial Relayer Addresses** (optional)
   - Comma-separated list of addresses
   - These addresses can execute gas-aware transfers
   - Example: 0x123..., 0x456..., 0x789...

#### Network Selection
- Sepolia Testnet (recommended for testing)
- Ethereum Mainnet
- Polygon
- Arbitrum One
- Custom RPC

#### Gas Price Control
- Minimum gas price (Gwei)
- Maximum gas price (Gwei)
- Gas wait timeout (seconds)

#### Deployment Security
- Private key (required, not stored)
- Etherscan verification (optional)

### Step 4: Deploy
Click the "Deploy Contract" button at the bottom of the modal to deploy with your custom settings.

## Example Configuration

**Low-fee marketplace:**
- Platform Fee: 5 bp (0.05%)
- Fee Collector: Your treasury address
- Relayers: Your automation service addresses

**High-value transfers:**
- Platform Fee: 100 bp (1%)
- Fee Collector: Your business wallet
- Relayers: Trusted execution nodes
