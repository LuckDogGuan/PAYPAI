'use client';

import { useState, useEffect } from 'react';
import { formatAddress } from '@/lib/wallet';
import VaultInfo from './VaultInfo';
import VaultConfig from './VaultConfig';
import VaultWithdraw from './VaultWithdraw';
import VaultSetup from './VaultSetup';
import VaultExecutor from './VaultExecutor';
import VaultApproval from './VaultApproval';

interface VaultManagerProps {
  aaWalletAddress: string;
  privateKey: string;
  onVaultReady?: (vaultAddress: string, executorAuthorized: boolean) => void;
}

export default function VaultManager({ aaWalletAddress, privateKey, onVaultReady }: VaultManagerProps) {
  const [vaultAddress, setVaultAddress] = useState('');
  const [displayAAWallet, setDisplayAAWallet] = useState('');
  const [calculatedAddress, setCalculatedAddress] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [executorAuthorized, setExecutorAuthorized] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<{
    deployed: boolean;
    hasBalance: boolean;
  } | null>(null);

  useEffect(() => {
    // Calculate and check vault address on mount
    checkVaultAddress();
  }, [aaWalletAddress]);

  useEffect(() => {
    if (deploymentStatus?.deployed && vaultAddress) {
      onVaultReady?.(vaultAddress, executorAuthorized);
    }
  }, [deploymentStatus?.deployed, vaultAddress, executorAuthorized, onVaultReady]);

  const checkVaultAddress = async () => {
    setIsChecking(true);
    try {
      // Call API to calculate vault address
      const response = await fetch(`/api/vault/calculate?address=${aaWalletAddress}`);
      const data = await response.json();

      if (data.aaWalletAddress) {
        setDisplayAAWallet(data.aaWalletAddress);
      }

      if (data.vaultAddress) {
        setCalculatedAddress(data.vaultAddress);
        setVaultAddress(data.vaultAddress);
        setDeploymentStatus({
          deployed: data.deployed || false,
          hasBalance: false
        });
      }
    } catch (error) {
      console.error('Error checking vault address:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDeployNew = () => {
    alert('Vault deployment feature coming soon!\n\nFor now, you can:\n1. Use Kite&apos;s deployment tools\n2. Enter an existing vault address manually');
  };

  if (isChecking) {
    return (
      <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-gray-400">Checking vault status...</span>
        </div>
      </div>
    );
  }

  if (!deploymentStatus?.deployed) {
    return (
      <div className="space-y-6">
        <VaultSetup
          signerAddress={aaWalletAddress}
          privateKey={privateKey}
          onReady={(address) => {
            setVaultAddress(address);
            setDeploymentStatus({ deployed: true, hasBalance: false });
          }}
        />

        {/* Wallet Info */}
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h2 className="text-xl font-semibold mb-4">Your Wallet Information</h2>

          <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800">
            <h3 className="text-lg font-semibold text-blue-300 mb-3">
              📋 Address Overview
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Signer Address (EOA):</span>
                <span className="font-mono text-blue-300 text-xs">
                  {formatAddress(aaWalletAddress)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">AA Wallet Address:</span>
                <span className="font-mono text-green-300 text-xs">
                  {formatAddress(displayAAWallet || aaWalletAddress)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Vault Address:</span>
                <span className="font-mono text-purple-300 text-xs">
                  {formatAddress(calculatedAddress)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Status:</span>
                <span className="text-yellow-400 font-semibold">Not Deployed Yet</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vault is deployed - show management interface
  return (
    <div className="space-y-6">
      <div className="bg-green-900/20 p-4 rounded-lg border border-green-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-green-300 font-semibold">Vault Deployed</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Managing vault: {formatAddress(vaultAddress)}
        </p>
      </div>

      <VaultInfo vaultAddress={vaultAddress} />
      <VaultApproval
        signerAddress={aaWalletAddress}
        privateKey={privateKey}
        vaultAddress={vaultAddress}
        onApproved={() => window.location.reload()}
      />
      <VaultExecutor
        vaultAddress={vaultAddress}
        aaWalletAddress={aaWalletAddress}
        privateKey={privateKey}
        onAuthorized={(authorized) => setExecutorAuthorized(authorized)}
      />

      <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-300 font-semibold">Advanced Settings</div>
            <div className="text-xs text-gray-500">Change rules or withdraw funds</div>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="px-3 py-1.5 text-xs rounded bg-zinc-800 border border-zinc-700 text-gray-300 hover:bg-zinc-700"
          >
            {showAdvanced ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {showAdvanced && (
        <>
          <VaultConfig
            aaWalletAddress={aaWalletAddress}
            privateKey={privateKey}
            vaultAddress={vaultAddress}
            onConfigured={() => window.location.reload()}
          />
          <VaultWithdraw
            vaultAddress={vaultAddress}
            aaWalletAddress={aaWalletAddress}
            privateKey={privateKey}
            onWithdrawn={() => window.location.reload()}
          />
        </>
      )}
    </div>
  );
}
