'use client';

import { useState } from 'react';
import { ethers } from 'ethers';

interface VaultDeployProps {
  aaWalletAddress: string;
  calculatedVaultAddress: string;
  signerAddress: string;
  privateKey: string;
  onDeployed?: (vaultAddress: string) => void;
}

export default function VaultDeploy({
  aaWalletAddress,
  calculatedVaultAddress,
  signerAddress,
  privateKey,
  onDeployed
}: VaultDeployProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);

  const handleDeploy = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/vault/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aaWalletAddress,
          signerAddress,
          privateKey
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Vault deployed successfully!\n\nTransaction Hash: ' + result.transactionHash);
        onDeployed?.(result.vaultAddress || calculatedVaultAddress);
      } else {
        // Show manual deployment instructions
        setShowManual(true);
      }
    } catch (err) {
      setShowManual(true);
    } finally {
      setLoading(false);
    }
  };

  if (showManual) {
    return (
      <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
        <h2 className="text-xl font-semibold mb-4">Manual Vault Deployment</h2>

        <div className="space-y-4">
          <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-800">
            <p className="text-sm text-yellow-300 mb-3">
              <strong>⚠️ Automatic deployment not yet available</strong>
            </p>
            <p className="text-xs text-gray-300">
              Please deploy your vault manually using one of the methods below.
            </p>
          </div>

          {/* Deployment Info */}
          <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
            <h3 className="text-sm font-semibold text-white mb-3">Deployment Parameters</h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Implementation:</span>
                <span className="text-purple-400 break-all ml-2">
                  {process.env.NEXT_PUBLIC_VAULT_IMPLEMENTATION_ADDRESS}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Settlement Token:</span>
                <span className="text-green-400 break-all ml-2">
                  {process.env.NEXT_PUBLIC_SETTLEMENT_TOKEN_ADDRESS}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Admin (AA Wallet):</span>
                <span className="text-blue-400 break-all ml-2">
                  {aaWalletAddress}
                </span>
              </div>
            </div>
          </div>

          {/* Deployment Methods */}
          <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
            <h3 className="text-sm font-semibold text-white mb-3">Deployment Methods</h3>
            <div className="space-y-3">
              <div className="bg-zinc-900 p-3 rounded">
                <p className="text-xs font-semibold text-white mb-1">Method 1: Using Remix IDE</p>
                <ol className="text-xs text-gray-400 list-decimal list-inside space-y-1">
                  <li>Go to <a href="https://remix.ethereum.org" target="_blank" rel="noopener" className="text-blue-400 hover:underline">Remix IDE</a></li>
                  <li>Create new file with ClientAgentVault code</li>
                  <li>Deploy with parameters above</li>
                </ol>
              </div>

              <div className="bg-zinc-900 p-3 rounded">
                <p className="text-xs font-semibold text-white mb-1">Method 2: Using Hardhat</p>
                <pre className="text-xs text-gray-400 overflow-x-auto">
{`const vault = await ethers.deployContract(
  "ClientAgentVault",
  [
    "${process.env.NEXT_PUBLIC_SETTLEMENT_TOKEN_ADDRESS}",
    "${aaWalletAddress}"
  ]
);
await vault.waitForDeployment();
console.log("Vault deployed to:", vault.target);`}
                </pre>
              </div>
            </div>
          </div>

          {/* After Deployment */}
          <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800">
            <p className="text-sm font-semibold text-blue-300 mb-2">After Deployment</p>
            <p className="text-xs text-gray-300 mb-3">
              Once you&apos;ve deployed your vault, enter the address below to start using it:
            </p>
            <button
              onClick={() => {
                const address = prompt('Enter your deployed vault address:');
                if (address && ethers.isAddress(address)) {
                  onDeployed?.(address);
                } else {
                  alert('Invalid address format');
                }
              }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
            >
              Enter Deployed Vault Address
            </button>
          </div>

          <button
            onClick={() => setShowManual(false)}
            className="w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 p-6 rounded-lg border border-purple-700">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">
            Deploy Your ClientAgentVault
          </h3>
          <p className="text-sm text-gray-300 mb-3">
            Your vault address is ready. Deploy it to enable AI agent spending rules and budget management.
          </p>

          <div className="bg-zinc-900/50 p-3 rounded-lg mb-4">
            <p className="text-xs text-gray-400 mb-1">Your Vault Address:</p>
            <p className="font-mono text-xs text-purple-400 break-all">
              {calculatedVaultAddress}
            </p>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-800 mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleDeploy}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Deploying...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Deploy Vault</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowManual(true)}
              className="px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm"
              title="View manual deployment instructions"
            >
              📖 Guide
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-3 text-center">
            🔐 Secure vault with spending rules for your AI agent
          </p>
        </div>
      </div>
    </div>
  );
}
