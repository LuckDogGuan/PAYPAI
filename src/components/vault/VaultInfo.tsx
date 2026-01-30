'use client';

import { useEffect, useState } from 'react';
import { ethers, BigNumberish } from 'ethers';
import { formatAddress } from '@/lib/wallet';
import { SpendingRule } from '@/types';

interface VaultInfoProps {
  vaultAddress: string;
}

interface VaultData {
  vault: {
    settlementToken: string;
    spendingAccount?: string;
    admin: string;
    balance: string;
  };
  spendingRules: SpendingRule[];
  tokenBalance: string;
  allowance?: string;
  tokenMeta?: {
    symbol?: string;
    decimals?: number;
  };
  executor?: {
    address?: string;
    authorized?: boolean;
  };
}

export default function VaultInfo({ vaultAddress }: VaultInfoProps) {
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchVaultInfo = async (showRefreshing = false) => {
    try {
      setError('');
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`/api/vault/info?address=${vaultAddress}`);

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to fetch vault info');
      }

      const data = await response.json();
      if (data?.error) {
        setError(data.error);
      }
      setVaultData(data);
    } catch (error) {
      console.error('Error fetching vault info:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch vault info');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVaultInfo();

    // Refresh every 15 seconds
    const interval = setInterval(() => fetchVaultInfo(true), 15000);
    return () => clearInterval(interval);
  }, [vaultAddress]);

  const formatTimeWindow = (seconds: BigNumberish) => {
    const hours = Number(seconds) / 3600;
    return `${hours} hours`;
  };

  const formatBudget = (budget: BigNumberish) => {
    const decimals = vaultData?.tokenMeta?.decimals ?? 18;
    const symbol = vaultData?.tokenMeta?.symbol ?? 'KITE';
    return `${ethers.formatUnits(budget, decimals)} ${symbol}`;
  };

  const formatTimestamp = (timestamp: BigNumberish) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const formatAmount = (value: string) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 'Unlimited';
    return num.toFixed(6);
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4">
            <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
            <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
            <div className="h-4 bg-zinc-800 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!vaultData) {
    return (
      <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
        <p className="text-gray-400">
          {error || 'Failed to load vault information'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Vault Information</h2>
        <button
          onClick={() => fetchVaultInfo(true)}
          disabled={refreshing}
          className="px-3 py-1 text-sm bg-zinc-700 hover:bg-zinc-600 disabled:bg-gray-700 rounded transition-colors"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-3">
        {error && (
          <div className="text-yellow-400 text-sm bg-yellow-900/20 p-3 rounded border border-yellow-800">
            {error}
          </div>
        )}

        {vaultData.allowance && Number(vaultData.allowance) === 0 && (
          <div className="text-yellow-300 text-xs bg-yellow-900/20 p-3 rounded border border-yellow-800">
            Vault allowance is zero. Approve the vault to spend from your AA wallet.
          </div>
        )}

        {vaultData.tokenBalance && Number(vaultData.tokenBalance) === 0 && (
          <div className="text-yellow-300 text-xs bg-yellow-900/20 p-3 rounded border border-yellow-800">
            AA wallet has zero token balance. Fund the AA wallet first.
          </div>
        )}

        {vaultAddress && (
          <InfoRow
            label="Vault Address"
            value={vaultAddress}
            fullValue={vaultAddress}
            valueClassName="break-all"
          />
        )}

        {vaultData.vault && (
          <InfoRow
            label="Settlement Token"
            value={formatAddress(vaultData.vault.settlementToken)}
            fullValue={vaultData.vault.settlementToken}
          />
        )}

        {vaultData.vault?.spendingAccount && (
          <InfoRow
            label="Spending Account"
            value={formatAddress(vaultData.vault.spendingAccount)}
            fullValue={vaultData.vault.spendingAccount}
          />
        )}

        {vaultData.vault && (
          <InfoRow
            label="Owner"
            value={formatAddress(vaultData.vault.admin)}
            fullValue={vaultData.vault.admin}
          />
        )}

        {vaultData.vault && (
          <InfoRow
            label="ETH Balance"
            value={`${parseFloat(vaultData.vault.balance).toFixed(6)} ETH`}
          />
        )}

        <InfoRow
          label="AA Wallet Token Balance"
          value={`${formatAmount(vaultData.tokenBalance)} ${vaultData.tokenMeta?.symbol || 'KITE'}`}
        />

        {vaultData.allowance && (
          <InfoRow
            label="Vault Allowance"
            value={`${formatAmount(vaultData.allowance)} ${vaultData.tokenMeta?.symbol || 'KITE'}`}
          />
        )}

        {vaultData.executor?.address && (
          <InfoRow
            label="Executor"
            value={
              <span className={vaultData.executor.authorized ? 'text-green-400' : 'text-yellow-400'}>
                {vaultData.executor.authorized ? 'Authorized' : 'Not Authorized'}
              </span>
            }
          />
        )}

        {vaultData.spendingRules && vaultData.spendingRules.length > 0 && (
          <div className="pt-3 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Spending Rules</h3>
            <div className="space-y-2">
              {vaultData.spendingRules.map((rule, index) => (
                <div key={index} className="bg-zinc-800 p-3 rounded border border-zinc-700">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="col-span-2">
                      <span className="text-gray-400">Rule Token:</span>
                      <span className="ml-2 text-cyan-300 font-mono text-xs">
                        {formatAddress(rule.token)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Budget:</span>
                      <span className="ml-2 text-green-400 font-mono">
                        {formatBudget(rule.budget)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Time Window:</span>
                      <span className="ml-2 text-blue-400 font-mono">
                        {formatTimeWindow(rule.timeWindow)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-400">Start Time:</span>
                      <span className="ml-2 text-yellow-400 font-mono text-xs">
                        {formatTimestamp(rule.initialWindowStartTime)}
                      </span>
                    </div>
                    {rule.whitelist && rule.whitelist.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Whitelist:</span>
                        <div className="ml-2 mt-1 space-y-1">
                          {rule.whitelist.map((provider, idx) => (
                            <div key={idx} className="font-mono text-xs text-purple-400">
                              {formatAddress(provider)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(!rule.whitelist || rule.whitelist.length === 0) && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Whitelist:</span>
                        <span className="ml-2 text-green-400">All recipients allowed</span>
                      </div>
                    )}
                    {rule.blacklist && rule.blacklist.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Blacklist:</span>
                        <div className="ml-2 mt-1 space-y-1">
                          {rule.blacklist.map((provider, idx) => (
                            <div key={idx} className="font-mono text-xs text-red-400">
                              {formatAddress(provider)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(!rule.blacklist || rule.blacklist.length === 0) && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Blacklist:</span>
                        <span className="ml-2 text-gray-500">None</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  fullValue,
  valueClassName
}: {
  label: string;
  value: React.ReactNode;
  fullValue?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-zinc-800 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <div className="flex items-center gap-2 max-w-[70%]">
        <span
          className={`text-right font-mono text-sm ${valueClassName || ''}`}
          title={fullValue}
        >
          {value}
        </span>
        {fullValue && (
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(fullValue)}
            className="text-xs text-blue-300 hover:text-blue-200"
          >
            Copy
          </button>
        )}
      </div>
    </div>
  );
}
