'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { createWalletClientSignFunction } from '@/lib/wallet-client';
import { kiteTestnetChain } from '@/lib/wagmi';
import { KITE_CONTRACTS } from '@/types';

interface AICommandProps {
  signerAddress: string;
  privateKey: string;
  refreshTrigger?: number;
  onTransactionExecuted?: () => void;
  vaultAddress?: string;
  useVault?: boolean;
}

export default function AICommand({ signerAddress, privateKey, refreshTrigger, onTransactionExecuted, vaultAddress, useVault }: AICommandProps) {
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [txResult, setTxResult] = useState<any>(null);
  const [assetType, setAssetType] = useState<'ETH' | 'ERC20'>('ETH');
  const [tokenAddress, setTokenAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('TOKEN');
  const [tokenDecimals, setTokenDecimals] = useState('18');

  const { isConnected } = useAccount();
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient({
    chainId: kiteTestnetChain.id,
  });

  const vaultMode = Boolean(useVault && vaultAddress);

  useEffect(() => {
    if (vaultMode) {
      setAssetType('ERC20');
      setTokenAddress(KITE_CONTRACTS.SETTLEMENT_TOKEN);
      setTokenSymbol('KITE');
      setTokenDecimals(String(KITE_CONTRACTS.SETTLEMENT_TOKEN_DECIMALS));
    }
  }, [vaultMode]);

  useEffect(() => {
    if (!parsedResult || vaultMode) return;
    const token = (parsedResult.parsed?.token || 'ETH').toUpperCase();
    if (token === 'ETH') {
      setAssetType('ETH');
      setTokenSymbol('ETH');
      return;
    }

    setAssetType('ERC20');
    setTokenSymbol(token);
    if (token === 'KITE') {
      setTokenAddress(KITE_CONTRACTS.SETTLEMENT_TOKEN);
      setTokenDecimals(String(KITE_CONTRACTS.SETTLEMENT_TOKEN_DECIMALS));
    }
  }, [parsedResult, vaultMode]);

  const handleParse = async () => {
    setError('');
    setParsedResult(null);
    setTxResult(null);
    setLoading(true);

    try {
      // Parse command with AI
      const response = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to parse command');
      }

      setParsedResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse command');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!parsedResult?.transaction) return;

    setError('');
    setLoading(true);

    try {
      const recipient = parsedResult.parsed?.recipient || parsedResult.transaction?.target;
      if (!recipient || !ethers.isAddress(recipient)) {
        throw new Error('Invalid recipient address');
      }

      const parsedAmount = parseFloat(parsedResult.parsed?.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid amount');
      }

      const hasPrivateKey = privateKey && privateKey.length > 0;
      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;

      if (vaultMode) {
        if (!tokenAddress || tokenAddress.toLowerCase() !== KITE_CONTRACTS.SETTLEMENT_TOKEN.toLowerCase()) {
          throw new Error('Vault execution only supports settlement token transfers.');
        }

        const response = await fetch('/api/vault/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vaultAddress,
            recipient,
            amount: parsedResult.parsed.amount
          })
        });

        const result = await response.json();

        if (result.success) {
          setTxResult({
            success: true,
            hash: result.transactionHash
          });
          onTransactionExecuted?.();
          setCommand('');
          setParsedResult(null);
        } else {
          throw new Error(result.error || 'Vault execution failed');
        }
      } else if (hasPrivateKey) {
        if (assetType === 'ETH') {
          const response = await fetch('/api/wallet/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              signerAddress,
              recipient,
              amount: parsedResult.parsed.amount,
              privateKey
            })
          });

          const result = await response.json();

          if (result.status?.status === 'success') {
            setTxResult({
              success: true,
              hash: result.status.transactionHash
            });
            onTransactionExecuted?.();
            setCommand('');
            setParsedResult(null);
          } else {
            throw new Error(result.status?.reason || 'Transaction failed');
          }
        } else {
          if (!ethers.isAddress(tokenAddress)) {
            throw new Error('Invalid token address');
          }

          const response = await fetch('/api/wallet/send-erc20', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              signerAddress,
              recipient,
              amount: parsedResult.parsed.amount,
              privateKey,
              tokenAddress,
              tokenDecimals: parseInt(tokenDecimals, 10) || 18
            })
          });

          const result = await response.json();

          if (result.status?.status === 'success') {
            setTxResult({
              success: true,
              hash: result.status.transactionHash
            });
            onTransactionExecuted?.();
            setCommand('');
            setParsedResult(null);
          } else {
            throw new Error(result.status?.reason || 'Transaction failed');
          }
        }
      } else if (hasWalletClient) {
        const { getKiteManager } = await import('@/lib/kite');
        const sdk = getKiteManager().getSDK();
        const signFunction = createWalletClientSignFunction(walletClient, signerAddress);

        let request;
        if (assetType === 'ETH') {
          request = {
            target: recipient,
            value: ethers.parseEther(String(parsedResult.parsed.amount)),
            callData: '0x'
          };
        } else {
          if (!ethers.isAddress(tokenAddress)) {
            throw new Error('Invalid token address');
          }

          const decimals = parseInt(tokenDecimals, 10) || 18;
          const erc20 = new ethers.Interface(['function transfer(address to, uint256 amount)']);
          const callData = erc20.encodeFunctionData('transfer', [
            recipient,
            ethers.parseUnits(parsedResult.parsed.amount, decimals)
          ]);

          request = {
            target: tokenAddress,
            value: 0n,
            callData
          };
        }

        const result = await sdk.sendUserOperationAndWait(
          signerAddress,
          request,
          signFunction
        );

        if (result.status?.status === 'success') {
          setTxResult({
            success: true,
            hash: result.status.transactionHash
          });
          onTransactionExecuted?.();
          setCommand('');
          setParsedResult(null);
        } else {
          throw new Error(result.status?.reason || 'Transaction failed');
        }
      } else {
        throw new Error('Wallet not connected. Please reconnect your wallet.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-green-900/30 to-teal-900/30 p-6 rounded-lg border border-green-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <h2 className="text-xl font-semibold text-white">
          AI Agent
        </h2>
        {useVault && vaultAddress && (
          <span className="text-xs text-green-300 bg-green-900/40 px-2 py-1 rounded">
            Vault Mode
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Command Input */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Enter your command in plain English:
          </label>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Send 0.001 ETH to 0x... or 10 USDC to 0x..."
            className="w-full px-4 py-3 bg-black/50 border border-green-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-green-500 font-mono text-sm"
            disabled={loading}
          />
        </div>

        {/* Examples */}
        <div className="bg-black/30 p-3 rounded-lg">
          <p className="text-xs text-gray-400 mb-2">Try:</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• &quot;Send 0.001 ETH to 0x1234...&quot;</li>
            <li>• &quot;Transfer 0.01 ETH to my friend&quot;</li>
            <li>• &quot;Pay 0.005 ETH for subscription&quot;</li>
            <li>• &quot;Send 15 USDC to 0xabcd...&quot;</li>
          </ul>
          {useVault && vaultAddress && (
            <p className="mt-2 text-xs text-green-400">
              Vault mode uses settlement token transfers only.
            </p>
          )}
        </div>

        {/* Parsed Result */}
        {parsedResult && (
          <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-700">
            <p className="text-xs text-gray-400 mb-2">AI understood:</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Action:</span>
                <span className="text-green-400 font-semibold">{parsedResult.parsed.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Recipient:</span>
                <span className="text-blue-400 font-mono text-xs">
                  {parsedResult.parsed.recipient?.slice(0, 10)}...{parsedResult.parsed.recipient?.slice(-8)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount:</span>
                <span className="text-purple-400 font-mono">
                  {parsedResult.parsed.amount} {parsedResult.parsed.token || (assetType === 'ETH' ? 'ETH' : tokenSymbol)}
                </span>
              </div>
            </div>

            <div className="mt-4 border-t border-blue-800/60 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Execution Asset</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => !vaultMode && setAssetType('ETH')}
                    disabled={vaultMode}
                    className={`px-3 py-1.5 rounded text-xs font-semibold ${
                      assetType === 'ETH'
                        ? 'bg-blue-600'
                        : 'bg-black/40 border border-blue-700/60 text-gray-300'
                    } ${vaultMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    ETH
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssetType('ERC20')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold ${
                      assetType === 'ERC20'
                        ? 'bg-green-600'
                        : 'bg-black/40 border border-blue-700/60 text-gray-300'
                    }`}
                  >
                    ERC20
                  </button>
                </div>
              </div>

              {assetType === 'ERC20' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Token Address</label>
                    <input
                      type="text"
                      value={tokenAddress}
                      onChange={(e) => setTokenAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 bg-black/50 border border-blue-700/60 rounded-lg text-white font-mono text-xs"
                      disabled={loading || vaultMode}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Token Name / Symbol</label>
                      <input
                        type="text"
                        value={tokenSymbol}
                        onChange={(e) => setTokenSymbol(e.target.value)}
                        className="w-full px-3 py-2 bg-black/50 border border-blue-700/60 rounded-lg text-white text-xs"
                        disabled={loading || vaultMode}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Decimals</label>
                      <input
                        type="number"
                        value={tokenDecimals}
                        onChange={(e) => setTokenDecimals(e.target.value)}
                        className="w-full px-3 py-2 bg-black/50 border border-blue-700/60 rounded-lg text-white text-xs"
                        disabled={loading || vaultMode}
                      />
                    </div>
                  </div>
                  {vaultMode && (
                    <p className="text-[11px] text-green-300">
                      Vault mode uses the settlement token only.
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleExecute}
              disabled={loading || (assetType === 'ERC20' && !tokenAddress)}
              className="mt-3 w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold"
            >
              {loading ? 'Executing...' : 'Execute Transaction'}
            </button>
          </div>
        )}

        {/* Transaction Result */}
        {txResult?.success && (
          <div className="bg-green-900/30 p-4 rounded-lg border border-green-600">
            <p className="text-sm text-green-400 font-semibold mb-1">✅ Success!</p>
            <p className="text-xs text-gray-400 break-all">
              Hash: {txResult.hash}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {!parsedResult && (
          <button
            onClick={handleParse}
            disabled={loading || !command}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>🤖</span>
                <span>Parse with AI</span>
              </>
            )}
          </button>
        )}

        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-800">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
