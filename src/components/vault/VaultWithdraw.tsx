'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { KITE_CONTRACTS } from '@/types';
import { kiteTestnetChain } from '@/lib/wagmi';

interface VaultWithdrawProps {
  vaultAddress: string;
  aaWalletAddress: string;
  privateKey: string;
  onWithdrawn?: () => void;
}

export default function VaultWithdraw({
  vaultAddress,
  aaWalletAddress,
  privateKey,
  onWithdrawn
}: VaultWithdrawProps) {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const { isConnected } = useAccount();
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient({
    chainId: kiteTestnetChain.id,
  });

  const handleWithdraw = async () => {
    setError('');
    setTxHash('');
    setLoading(true);

    try {
      // Validate recipient
      if (!ethers.isAddress(recipient)) {
        throw new Error('Invalid recipient address');
      }

      // Validate amount
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid amount');
      }

      const hasPrivateKey = privateKey && privateKey.length > 0;
      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;

      if (hasPrivateKey) {
        const response = await fetch('/api/vault/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vaultAddress,
            privateKey,
            tokenAddress: KITE_CONTRACTS.SETTLEMENT_TOKEN,
            amount: ethers.parseUnits(amount, KITE_CONTRACTS.SETTLEMENT_TOKEN_DECIMALS).toString(),
            recipient
          })
        });

        const result = await response.json();

        if (result.success) {
          setTxHash(result.transactionHash || '');
          onWithdrawn?.();

          // Reset form
          setAmount('');
          setRecipient('');
        } else {
          throw new Error(result.error || 'Withdrawal failed');
        }
      } else if (hasWalletClient) {
        const vaultInterface = new ethers.Interface([
          'function withdraw(address token, uint256 amount, address recipient) external'
        ]);
        const callData = vaultInterface.encodeFunctionData('withdraw', [
          KITE_CONTRACTS.SETTLEMENT_TOKEN,
          ethers.parseUnits(amount, KITE_CONTRACTS.SETTLEMENT_TOKEN_DECIMALS),
          recipient
        ]);

        const hash = await walletClient.sendTransaction({
          account: aaWalletAddress as `0x${string}`,
          to: vaultAddress as `0x${string}`,
          data: callData as `0x${string}`,
          value: 0n
        });

        setTxHash(hash);
        onWithdrawn?.();
        setAmount('');
        setRecipient('');
      } else {
        throw new Error('Wallet not connected. Please reconnect your wallet.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
      <h2 className="text-xl font-semibold mb-4">Withdraw from Vault</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Vault Address
          </label>
          <input
            type="text"
            value={vaultAddress}
            readOnly
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-mono text-sm opacity-75"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Amount (Tokens)
          </label>
          <input
            type="number"
            step="0.0001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10"
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
            disabled={loading}
          />
        </div>

        <div className="bg-yellow-900/20 p-3 rounded border border-yellow-800">
          <p className="text-xs text-yellow-300">
            <strong>⚠️ Warning:</strong> Only the admin (AA wallet) can withdraw from the vault.
            Make sure you have configured spending rules properly.
          </p>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-800">
            {error}
          </div>
        )}

        {txHash && (
          <div className="text-green-400 text-sm bg-green-900/20 p-3 rounded border border-green-800">
            <div className="font-semibold mb-1">Withdrawal Successful!</div>
            <div className="font-mono text-xs break-all">
              Hash: {txHash}
            </div>
          </div>
        )}

        <button
          onClick={handleWithdraw}
          disabled={loading || !amount || !recipient}
          className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
        >
          {loading ? 'Withdrawing...' : 'Withdraw Tokens'}
        </button>
      </div>
    </div>
  );
}
