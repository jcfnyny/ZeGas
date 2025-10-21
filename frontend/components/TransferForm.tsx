import { useState, useEffect } from "react";
import { ethers } from "ethers";
import TokenSelector, { Token } from "./TokenSelector";

type Props = {
  contractAddress: string;
  userAddress: string;
  provider: ethers.BrowserProvider;
  chainId: number;
};

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function balanceOf(address account) public view returns (uint256)",
];

const CONTRACT_ABI = [
  "function scheduleTransfer(address to, address token, uint256 amount, uint64 executeAfter) payable returns (uint256)",
  "function executeTransfer(uint256 transferId)",
  "function cancelTransfer(uint256 transferId)",
  "function getTransfer(uint256 transferId) view returns (tuple(address from, address to, address token, uint256 amount, uint256 chainId, uint64 executeAfter, bool executed, bool canceled))",
  "event TransferScheduled(uint256 indexed transferId, address indexed from, address indexed to, address token, uint256 amount, uint256 chainId, uint64 executeAfter)",
];

export default function TransferForm({ contractAddress, userAddress, provider, chainId }: Props) {
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [executeAfter, setExecuteAfter] = useState("");
  const [balance, setBalance] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [txStatus, setTxStatus] = useState("");

  useEffect(() => {
    if (selectedToken && userAddress) {
      fetchBalance();
    }
  }, [selectedToken, userAddress]);

  const fetchBalance = async () => {
    if (!selectedToken) return;

    try {
      if (selectedToken.isNative) {
        const bal = await provider.getBalance(userAddress);
        setBalance(ethers.formatEther(bal));
      } else {
        const tokenContract = new ethers.Contract(selectedToken.address, ERC20_ABI, provider);
        const bal = await tokenContract.balanceOf(userAddress);
        setBalance(ethers.formatUnits(bal, selectedToken.decimals));
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance("0");
    }
  };

  const scheduleTransfer = async () => {
    if (!selectedToken || !recipient || !amount || !executeAfter) {
      alert("Please fill in all fields");
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      alert("Invalid recipient address");
      return;
    }

    const executeTime = new Date(executeAfter).getTime() / 1000;
    if (executeTime <= Date.now() / 1000) {
      alert("Execution time must be in the future");
      return;
    }

    setIsLoading(true);
    setTxStatus("Preparing transaction...");

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);

      const amountWei = ethers.parseUnits(amount, selectedToken.decimals);

      if (!selectedToken.isNative) {
        setTxStatus("Checking token allowance...");
        const tokenContract = new ethers.Contract(selectedToken.address, ERC20_ABI, signer);
        const allowance = await tokenContract.allowance(userAddress, contractAddress);

        if (allowance < amountWei) {
          setTxStatus("Approving token...");
          const approveTx = await tokenContract.approve(contractAddress, amountWei);
          await approveTx.wait();
        }
      }

      setTxStatus("Scheduling transfer...");
      const tokenAddress = selectedToken.isNative ? ethers.ZeroAddress : selectedToken.address;
      
      const tx = await contract.scheduleTransfer(
        recipient,
        tokenAddress,
        amountWei,
        Math.floor(executeTime),
        selectedToken.isNative ? { value: amountWei } : {}
      );

      setTxStatus("Confirming transaction...");
      const receipt = await tx.wait();

      const event = receipt.logs
        .map((log: any) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "TransferScheduled");

      if (event) {
        const transferId = event.args[0].toString();
        setTxStatus(`Success! Transfer ID: ${transferId}`);
        alert(`Transfer scheduled successfully! ID: ${transferId}\nIt will execute after ${executeAfter}`);
        
        setRecipient("");
        setAmount("");
        setExecuteAfter("");
        fetchBalance();
      } else {
        setTxStatus("Transaction complete");
      }
    } catch (error: any) {
      console.error("Error scheduling transfer:", error);
      setTxStatus("");
      alert(`Error: ${error.message || "Transaction failed"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Schedule Token Transfer</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Token</label>
            <TokenSelector
              chainId={chainId}
              selectedToken={selectedToken}
              onTokenSelect={setSelectedToken}
            />
            {selectedToken && balance && (
              <p className="mt-2 text-sm text-gray-600">
                Balance: <span className="font-semibold text-gray-900">{parseFloat(balance).toFixed(6)} {selectedToken.symbol}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Recipient Address</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                step="0.000001"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {selectedToken && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                  {selectedToken.symbol}
                </div>
              )}
            </div>
            {selectedToken && balance && (
              <button
                onClick={() => setAmount(balance)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Use Max
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Execute After</label>
            <input
              type="datetime-local"
              value={executeAfter}
              onChange={(e) => setExecuteAfter(e.target.value)}
              min={getMinDateTime()}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-2 text-xs text-gray-500">
              The transfer will be executable after this time
            </p>
          </div>

          {txStatus && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium">{txStatus}</p>
            </div>
          )}

          <button
            onClick={scheduleTransfer}
            disabled={isLoading || !selectedToken}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-colors text-lg"
          >
            {isLoading ? "Processing..." : "Schedule Transfer"}
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <h3 className="text-lg font-bold text-gray-900 mb-3">📋 How it works</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">1.</span>
            <span>Select a token and enter the amount you want to transfer</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">2.</span>
            <span>Specify the recipient address and execution time</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">3.</span>
            <span>Your tokens will be locked in the contract until the scheduled time</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">4.</span>
            <span>After the time passes, anyone can execute the transfer (including you)</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
