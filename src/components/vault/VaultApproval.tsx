'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { kiteTestnetChain } from '@/lib/wagmi';
import { createWalletClientSignFunction } from '@/lib/wallet-client';
import { getKiteManager } from '@/lib/kite';

interface VaultApprovalProps {
  signerAddress: string;
  privateKey: string;
  vaultAddress: string;
  onApproved?: () => void;
}

export default function VaultApproval({ signerAddress, privateKey, vaultAddress, onApproved }: VaultApprovalProps) {
  const [amount, setAmount] = useState('1000');
  const [approveMax, setApproveMax] = useState(true);
  const [tokenAddress, setTokenAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('TOKEN');
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [allowance, setAllowance] = useState('0');
  const [spendingAccount, setSpendingAccount] = useState('');
  const [derivedAA, setDerivedAA] = useState('');
  const [aaDeployed, setAaDeployed] = useState(false);
  const [fundAmount, setFundAmount] = useState('100');
  const [funding, setFunding] = useState(false);
  const [fundError, setFundError] = useState('');
  const [fundTxHash, setFundTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUserOpHash, setLastUserOpHash] = useState('');
  const [lastSignature, setLastSignature] = useState('');
  const [lastSignMethod, setLastSignMethod] = useState<'personal_sign' | 'eth_sign' | ''>('');
  const [lastErrorDetails, setLastErrorDetails] = useState('');
  const [lastFailureStage, setLastFailureStage] = useState('');
  const [lastRecoveredPrefixed, setLastRecoveredPrefixed] = useState('');
  const [lastRecoveredRaw, setLastRecoveredRaw] = useState('');
  const [lastWalletAccount, setLastWalletAccount] = useState('');
  const [bundlerUrl, setBundlerUrl] = useState('');
  const [disablePaymaster, setDisablePaymaster] = useState(false);

  const { isConnected } = useAccount();
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient({
    chainId: kiteTestnetChain.id,
  });

  const fetchInfo = async () => {
    try {
      setRefreshing(true);
      const [vaultRes, walletRes] = await Promise.all([
        fetch(`/api/vault/info?address=${vaultAddress}`),
        fetch(`/api/wallet/info?address=${signerAddress}`)
      ]);

      if (walletRes.ok) {
        const walletData = await walletRes.json();
        if (walletData?.wallet?.address) {
          setDerivedAA(walletData.wallet.address);
        }
        if (typeof walletData?.wallet?.isDeployed === 'boolean') {
          setAaDeployed(walletData.wallet.isDeployed);
        }
      }

      const response = vaultRes;
      if (!response.ok) return;
      const data = await response.json();
      if (data?.vault?.settlementToken) setTokenAddress(data.vault.settlementToken);
      if (data?.vault?.spendingAccount) setSpendingAccount(data.vault.spendingAccount);
      if (data?.tokenMeta?.symbol) setTokenSymbol(data.tokenMeta.symbol);
      if (Number.isFinite(Number(data?.tokenMeta?.decimals))) {
        setTokenDecimals(Number(data.tokenMeta.decimals));
      }
      if (data?.allowance) setAllowance(data.allowance);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (vaultAddress) {
      fetchInfo();
    }
  }, [vaultAddress]);

  useEffect(() => {
    try {
      const config = getKiteManager().getConfig();
      if (config?.bundlerUrl) {
        setBundlerUrl(config.bundlerUrl);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleApprove = async () => {
    setError('');
    setTxHash('');
    setLastUserOpHash('');
    setLastSignature('');
    setLastSignMethod('');
    setLastErrorDetails('');
    setLastFailureStage('');
    setLastRecoveredPrefixed('');
    setLastRecoveredRaw('');
    setLastWalletAccount('');
    setLoading(true);

    try {
      if (!ethers.isAddress(vaultAddress)) {
        throw new Error('Invalid vault address');
      }
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error('Invalid token address');
      }

      if (!approveMax) {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw new Error('Invalid amount');
        }
      }

      if (!aaDeployed) {
        throw new Error('AA wallet not deployed. Deploy it first.');
      }
      if (derivedAA && spendingAccount && derivedAA.toLowerCase() !== spendingAccount.toLowerCase()) {
        throw new Error('Vault spending account does not match your AA wallet. Redeploy the vault.');
      }

      const hasPrivateKey = privateKey && privateKey.length > 0;
      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;

      if (hasPrivateKey) {
        const response = await fetch('/api/wallet/approve-erc20', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signerAddress,
            tokenAddress,
            spender: vaultAddress,
            amount,
            privateKey,
            tokenDecimals,
            useMax: approveMax
          })
        });

        const result = await response.json();
        if (result.status?.status === 'success') {
          setTxHash(result.status.transactionHash || '');
          onApproved?.();
        } else {
          throw new Error(result.status?.reason || 'Approval failed');
        }
      } else if (hasWalletClient) {
        if (walletClient.chain && walletClient.chain.id !== kiteTestnetChain.id) {
          throw new Error('Wrong network. Switch MetaMask to Kite Testnet.');
        }
        if (walletClient.account?.address && walletClient.account.address.toLowerCase() !== signerAddress.toLowerCase()) {
          throw new Error('Connected wallet does not match the signer address. Switch accounts.');
        }
        const { getKiteManager } = await import('@/lib/kite');
        const sdk = getKiteManager().getSDK();
        const erc20 = new ethers.Interface(['function approve(address spender, uint256 amount)']);
        const approveAmount = approveMax ? ethers.MaxUint256 : ethers.parseUnits(amount, tokenDecimals);
        const callData = erc20.encodeFunctionData('approve', [
          vaultAddress,
          approveAmount
        ]);

        const getErrorMessage = (err: unknown) => {
          if (err instanceof Error) return err.message;
          if (typeof err === 'string') return err;
          if (err && typeof err === 'object') {
            const anyErr = err as { message?: string; details?: { message?: string } };
            return anyErr.details?.message || anyErr.message || 'Unknown error';
          }
          return 'Unknown error';
        };

        const isAA33 = (message: string) => message.includes('AA33');

        const buildHashHex = (hash: Uint8Array | string) => {
          if (typeof hash === 'string') {
            return hash.startsWith('0x') ? hash : `0x${hash}`;
          }
          return `0x${Array.from(hash)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')}`;
        };

        const signWithWalletClient = () => async (hash: Uint8Array | string) => {
          const hashHex = buildHashHex(hash);
          let sig = '';
          sig = await createWalletClientSignFunction(walletClient, signerAddress)(hash);
          setLastSignMethod('personal_sign');
          console.log('[VaultApproval] personal_sign userOpHash:', hashHex);
          setLastUserOpHash(hashHex);
          setLastSignature(sig);
          try {
            setLastWalletAccount(walletClient.account?.address || '');
            const prefixed = ethers.verifyMessage(ethers.getBytes(hashHex), sig);
            setLastRecoveredPrefixed(prefixed);
            const raw = ethers.recoverAddress(hashHex, sig);
            setLastRecoveredRaw(raw);
          } catch {
            // ignore recovery errors
          }
          return sig;
        };

        const signWithEthSign = () => async (hash: Uint8Array | string) => {
          const hashHex = buildHashHex(hash);
          const ethereum = (window as typeof window & { ethereum?: { request?: (args: { method: string; params?: unknown[] }) => Promise<string> } }).ethereum;
          if (!ethereum?.request) {
            throw new Error('eth_sign not available in this wallet');
          }
          const sig = await ethereum.request({
            method: 'eth_sign',
            params: [signerAddress, hashHex]
          });
          setLastSignMethod('eth_sign');
          setLastUserOpHash(hashHex);
          setLastSignature(sig);
          try {
            setLastWalletAccount(walletClient.account?.address || '');
            const raw = ethers.recoverAddress(hashHex, sig);
            setLastRecoveredRaw(raw);
          } catch {
            // ignore recovery errors
          }
          return sig;
        };

        const paymasterOverride = disablePaymaster
          ? '0x0000000000000000000000000000000000000000'
          : undefined;

        const attemptApprove = async () => {
          return sdk.sendUserOperationAndWait(
            signerAddress,
            {
              target: tokenAddress,
              value: 0n,
              callData
            },
            signWithWalletClient(),
            undefined,
            paymasterOverride
          );
        };

        const sdkAny = sdk as any;
        const request = { target: tokenAddress, value: 0n, callData };
        const sendWithoutEstimate = async (signFn: (hash: Uint8Array | string) => Promise<string>, stageLabel: string) => {
          const userOp = await sdkAny.createUserOperation(
            signerAddress,
            request,
            undefined,
            paymasterOverride
          );
          const userOpHash = await sdk.getUserOpHash(userOp);
          const signature = await signFn(userOpHash);
          userOp.signature = signature;
          const opHash = await sdkAny.provider.sendUserOperation(userOp, sdkAny.config.entryPoint);
          const status = await sdk.pollUserOperationStatus(opHash);
          return { userOpHash: opHash, status, stage: stageLabel };
        };

        let lastReason = '';

        const runAttempt = async (fn: () => Promise<any>, stage: string) => {
          try {
            const res = await fn();
            if (res?.status?.reason) {
              lastReason = res.status.reason;
              setLastErrorDetails(res.status.reason);
            }
            return res;
          } catch (err) {
            const message = getErrorMessage(err);
            lastReason = message;
            setLastErrorDetails(message);
            setLastFailureStage(stage);
            return { status: { status: 'failed', reason: message } };
          }
        };

        let result = await runAttempt(() => attemptApprove(), 'estimate+personal_sign');
        if (result?.status?.status !== 'success' && isAA33(result?.status?.reason || lastReason)) {
          result = await runAttempt(() => sendWithoutEstimate(signWithWalletClient(), 'no-estimate+personal_sign'), 'no-estimate+personal_sign');
        }
        if (result?.status?.status !== 'success' && isAA33(result?.status?.reason || lastReason)) {
          result = await runAttempt(() => sendWithoutEstimate(signWithEthSign(), 'no-estimate+eth_sign'), 'no-estimate+eth_sign');
        }

        if (result?.status?.status === 'success') {
          setTxHash(result.status.transactionHash || '');
          onApproved?.();
        } else {
          throw new Error(result?.status?.reason || 'Approval failed');
        }
      } else {
        throw new Error('Wallet not connected. Please reconnect your wallet.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  const handleFund = async () => {
    setFundError('');
    setFundTxHash('');
    setFunding(true);

    try {
      if (!spendingAccount || !ethers.isAddress(spendingAccount)) {
        throw new Error('Spending account not available');
      }
      if (!aaDeployed) {
        throw new Error('AA wallet not deployed. Deploy it first.');
      }
      if (derivedAA && spendingAccount && derivedAA.toLowerCase() !== spendingAccount.toLowerCase()) {
        throw new Error('Vault spending account does not match your AA wallet.');
      }
      if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
        throw new Error('Invalid token address');
      }

      const parsedAmount = parseFloat(fundAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid amount');
      }

      const hasPrivateKey = privateKey && privateKey.length > 0;
      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;

      if (hasPrivateKey) {
        const response = await fetch('/api/wallet/send-erc20-eoa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signerAddress,
            recipient: spendingAccount,
            amount: fundAmount,
            privateKey,
            tokenAddress,
            tokenDecimals
          })
        });

        const result = await response.json();
        if (result.success) {
          setFundTxHash(result.transactionHash || '');
          fetchInfo();
        } else {
          throw new Error(result.error || 'Funding failed');
        }
      } else if (hasWalletClient) {
        if (walletClient.account?.address && walletClient.account.address.toLowerCase() !== signerAddress.toLowerCase()) {
          throw new Error('Connected wallet does not match the signer address. Switch accounts.');
        }
        if (walletClient.chain && walletClient.chain.id !== kiteTestnetChain.id) {
          throw new Error('Wrong network. Switch MetaMask to Kite Testnet.');
        }

        const erc20 = new ethers.Interface(['function transfer(address to, uint256 amount)']);
        const callData = erc20.encodeFunctionData('transfer', [
          spendingAccount,
          ethers.parseUnits(fundAmount, tokenDecimals)
        ]);

        const hash = await walletClient.sendTransaction({
          account: signerAddress as `0x${string}`,
          to: tokenAddress as `0x${string}`,
          data: callData as `0x${string}`,
          value: 0n
        });

        setFundTxHash(hash);
        fetchInfo();
      } else {
        throw new Error('Wallet not connected. Please reconnect your wallet.');
      }
    } catch (err) {
      setFundError(err instanceof Error ? err.message : 'Failed to fund AA wallet');
    } finally {
      setFunding(false);
    }
  };

  return (
    <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Approve Vault Spending</h2>
        <button
          type="button"
          onClick={fetchInfo}
          disabled={refreshing}
          className="px-3 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-gray-300 hover:bg-zinc-700"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-700">
          <div className="text-xs text-gray-400 mb-1">Settlement Token</div>
          <div className="text-xs font-mono text-blue-400 break-all">{tokenAddress || 'Loading...'}</div>
          <div className="text-xs text-gray-500 mt-1">
            Current Allowance: {allowance} {tokenSymbol}
          </div>
        </div>

        {spendingAccount && (
          <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-700">
            <div className="text-xs text-gray-400 mb-1">AA Wallet Address</div>
            <div className="text-xs font-mono text-blue-400 break-all">{spendingAccount}</div>
          </div>
        )}

        {derivedAA && spendingAccount && derivedAA.toLowerCase() !== spendingAccount.toLowerCase() && (
          <div className="text-yellow-300 text-xs bg-yellow-900/20 p-3 rounded border border-yellow-800">
            Vault spending account does not match your AA wallet. Please redeploy the vault.
          </div>
        )}

        {!aaDeployed && (
          <div className="text-yellow-300 text-xs bg-yellow-900/20 p-3 rounded border border-yellow-800">
            AA wallet not deployed yet. Deploy it before approving.
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-300">
          <input
            id="approve-max"
            type="checkbox"
            checked={approveMax}
            onChange={(e) => setApproveMax(e.target.checked)}
          />
          <label htmlFor="approve-max">Approve max (recommended)</label>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-300">
          <input
            id="disable-paymaster"
            type="checkbox"
            checked={disablePaymaster}
            onChange={(e) => setDisablePaymaster(e.target.checked)}
          />
          <label htmlFor="disable-paymaster">Disable paymaster (debug)</label>
        </div>

        {disablePaymaster && (
          <div className="text-yellow-300 text-xs bg-yellow-900/20 p-3 rounded border border-yellow-800">
            Paymaster disabled. Your AA wallet must have native KITE to pay gas.
          </div>
        )}

        {!approveMax && (
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Allowance Amount ({tokenSymbol})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-mono text-sm"
              disabled={loading}
            />
          </div>
        )}

        <p className="text-xs text-gray-500">
          Vault can only spend tokens that your AA wallet has approved. You can revoke or change later.
        </p>

        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-800">
            {error}
          </div>
        )}

        {txHash && (
          <div className="text-green-400 text-sm bg-green-900/20 p-3 rounded border border-green-800">
            <div className="font-semibold mb-1">Approval Sent!</div>
            <div className="font-mono text-xs break-all">Hash: {txHash}</div>
          </div>
        )}

        <button
          onClick={handleApprove}
          disabled={loading || !tokenAddress || !aaDeployed || (derivedAA && spendingAccount && derivedAA.toLowerCase() !== spendingAccount.toLowerCase())}
          className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
        >
          {loading ? 'Approving...' : 'Approve Vault'}
        </button>

        {(lastUserOpHash || lastSignature || lastErrorDetails || lastFailureStage || lastRecoveredPrefixed || lastRecoveredRaw) && (
          <div className="text-xs text-gray-400 bg-zinc-900/60 p-3 rounded border border-zinc-800">
            <div className="font-semibold text-gray-300 mb-1">Debug (AA33)</div>
            {lastFailureStage && (
              <div>Stage: <span className="text-blue-300">{lastFailureStage}</span></div>
            )}
            {bundlerUrl && (
              <div>Bundler URL: <span className="text-blue-300">{bundlerUrl}</span></div>
            )}
            <div>Paymaster: <span className="text-blue-300">{disablePaymaster ? 'disabled' : 'enabled'}</span></div>
            {lastSignMethod && (
              <div>Method: <span className="text-blue-300">{lastSignMethod}</span></div>
            )}
            {lastWalletAccount && (
              <div>Wallet Account: <span className="text-blue-300">{lastWalletAccount}</span></div>
            )}
            {lastUserOpHash && (
              <div className="font-mono break-all">userOpHash: {lastUserOpHash}</div>
            )}
            {lastSignature && (
              <div className="font-mono break-all">signature: {lastSignature.slice(0, 18)}…</div>
            )}
            {lastRecoveredPrefixed && (
              <div className="font-mono break-all">recovered (prefixed): {lastRecoveredPrefixed}</div>
            )}
            {lastRecoveredRaw && (
              <div className="font-mono break-all">recovered (raw): {lastRecoveredRaw}</div>
            )}
            {lastErrorDetails && (
              <div className="font-mono break-all">error: {lastErrorDetails}</div>
            )}
          </div>
        )}

        <div className="border-t border-zinc-800 pt-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Fund AA Wallet</h3>
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Amount ({tokenSymbol})
            </label>
            <input
              type="number"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              placeholder="100"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-mono text-sm"
              disabled={funding}
            />
          </div>

          {fundError && (
            <div className="mt-3 text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-800">
              {fundError}
            </div>
          )}

          {fundTxHash && (
            <div className="mt-3 text-green-400 text-sm bg-green-900/20 p-3 rounded border border-green-800">
              <div className="font-semibold mb-1">Transfer Sent!</div>
              <div className="font-mono text-xs break-all">Hash: {fundTxHash}</div>
            </div>
          )}

        <button
          onClick={handleFund}
          disabled={funding || !spendingAccount || !tokenAddress || !aaDeployed || (derivedAA && spendingAccount && derivedAA.toLowerCase() !== spendingAccount.toLowerCase())}
          className="mt-3 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
        >
            {funding ? 'Sending...' : 'Send Tokens to AA Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
}
