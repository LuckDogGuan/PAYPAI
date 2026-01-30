'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useWalletClient, useAccount } from 'wagmi';
import { formatAddress } from '@/lib/wallet';
import { createWalletClientSignFunction } from '@/lib/wallet-client';
import { kiteTestnetChain } from '@/lib/wagmi';
import { AAWallet } from '@/types';

interface WalletInfoProps {
  signerAddress: string;
  privateKey: string;
  onDeploymentStatusChange?: (deployed: boolean) => void;
  aaWalletAddress?: string;
  refreshTrigger?: number;
}

interface WalletData {
  wallet: AAWallet;
  balance: string;
  signerBalance: string;
}

export default function WalletInfo({ signerAddress, privateKey, onDeploymentStatusChange, refreshTrigger }: WalletInfoProps) {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fundingAmount, setFundingAmount] = useState('0.01');
  const [funding, setFunding] = useState(false);
  const [deploying, setDeploying] = useState(false);

  // Get wagmi connection status
  const { isConnected } = useAccount();

  // Get wallet client for MetaMask signing
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient({
    chainId: kiteTestnetChain.id,
  });

  // Debug: log wallet client status
  useEffect(() => {
    console.log('=== WalletInfo Debug ===');
    console.log('signerAddress:', signerAddress);
    console.log('privateKey:', privateKey);
    console.log('privateKey length:', privateKey?.length);
    console.log('isConnected (wagmi):', isConnected);
    console.log('walletClient:', walletClient ? 'exists' : 'null');
    console.log('isWalletClientLoading:', isWalletClientLoading);
  }, [signerAddress, privateKey, isConnected, walletClient, isWalletClientLoading]);

  const fetchWalletInfo = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(
        `/api/wallet/info?address=${signerAddress}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch wallet info');
      }

      const data = await response.json();
      setWalletData(data);

      // Notify parent component about deployment status
      if (onDeploymentStatusChange) {
        onDeploymentStatusChange(data.wallet.isDeployed);
      }
    } catch (error) {
      console.error('Error fetching wallet info:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletInfo();

    // Refresh every 10 seconds
    const interval = setInterval(() => fetchWalletInfo(true), 10000);
    return () => clearInterval(interval);
  }, [signerAddress, refreshTrigger]);

  const handleDeploy = async () => {
    try {
      setDeploying(true);

      console.log('=== Deploy Wallet ===');
      console.log('privateKey:', privateKey);
      console.log('privateKey type:', typeof privateKey);
      console.log('privateKey length:', privateKey?.length);
      console.log('!privateKey:', !privateKey);
      console.log('isConnected:', isConnected);
      console.log('walletClient:', walletClient);
      console.log('isWalletClientLoading:', isWalletClientLoading);

      // Determine deployment method
      const hasPrivateKey = privateKey && privateKey.length > 0;
      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;

      console.log('hasPrivateKey:', hasPrivateKey);
      console.log('hasWalletClient:', hasWalletClient);

      // If using MetaMask (no private key but have wallet client)
      if (!hasPrivateKey && hasWalletClient) {
        console.log('Deploying with MetaMask...');

        // Dynamically import Kite SDK to avoid SSR issues
        const { getKiteManager } = await import('@/lib/kite');
        const kiteManager = getKiteManager();
        const sdk = kiteManager.getSDK();

        // Create sign function using MetaMask
        const signFunction = createWalletClientSignFunction(walletClient, signerAddress);

        // Send deployment transaction
        const deployRequest = {
          target: signerAddress,
          value: 0n,
          callData: '0x'
        };

        console.log('Sending user operation...');
        const result = await sdk.sendUserOperationAndWait(
          signerAddress,
          deployRequest,
          signFunction
        );

        console.log('Deploy result:', result);

        if (result.status?.status === 'success') {
          alert('Wallet deployed successfully!');
          fetchWalletInfo();
        } else {
          const errorMsg = result.status?.reason || 'Unknown error';
          alert(`Deployment failed: ${errorMsg}`);
          console.error('Deployment error details:', result);
        }
      } else if (hasPrivateKey) {
        console.log('Deploying with private key...');
        // Use private key method
        const response = await fetch('/api/wallet/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signerAddress, privateKey })
        });

        const result = await response.json();
        console.log('Deploy response:', result);

        if (!response.ok) {
          const errorMsg = result.error || result.details || 'Unknown error';
          alert(`Deployment failed: ${errorMsg}`);
          return;
        }

        if (result.status?.status === 'success') {
          alert('Wallet deployed successfully!');
          fetchWalletInfo();
        } else {
          const errorMsg = result.status?.reason || result.error || result.details || 'Unknown error';
          alert(`Deployment failed: ${errorMsg}`);
          console.error('Deployment error details:', result);
        }
      } else {
        console.error('No wallet connection available');
        console.error('- hasPrivateKey:', hasPrivateKey);
        console.error('- hasWalletClient:', hasWalletClient);
        console.error('- isConnected:', isConnected);
        console.error('- walletClient:', walletClient);
        console.error('- isWalletClientLoading:', isWalletClientLoading);

        if (isWalletClientLoading) {
          alert('Wallet is still loading. Please wait a moment and try again.');
        } else if (!isConnected) {
          alert('Wallet not connected. Please reconnect your wallet.');
        } else {
          alert('No wallet connection available. Please reconnect your wallet.');
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to deploy wallet: ${errorMsg}`);
      console.error('Deploy error:', error);
    } finally {
      setDeploying(false);
    }
  };

  const handleFund = async () => {
    if (!walletData) return;

    try {
      setFunding(true);
      const hasPrivateKey = privateKey && privateKey.length > 0;
      const hasWalletClient = isConnected && walletClient && !isWalletClientLoading;

      if (hasPrivateKey) {
        const response = await fetch('/api/wallet/fund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signerAddress,
            aaWalletAddress: walletData.wallet.address,
            amount: fundingAmount,
            privateKey
          })
        });

        const result = await response.json();

        if (result.success) {
          alert(`Successfully funded ${result.amount} ETH to AA wallet!`);
          fetchWalletInfo();
        } else {
          alert(`Funding failed: ${result.error || 'Unknown error'}`);
        }
      } else if (hasWalletClient) {
        const hash = await walletClient.sendTransaction({
          account: signerAddress as `0x${string}`,
          to: walletData.wallet.address as `0x${string}`,
          value: ethers.parseEther(fundingAmount)
        });

        alert(`Funding submitted: ${hash}`);
        fetchWalletInfo();
      } else {
        alert('Wallet not connected. Please reconnect and try again.');
      }
    } catch (error) {
      alert('Failed to fund wallet');
      console.error(error);
    } finally {
      setFunding(false);
    }
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

  if (!walletData) {
    return (
      <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
        <p className="text-gray-400">Failed to load wallet information</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Wallet Information</h2>
        <button
          onClick={() => fetchWalletInfo(true)}
          disabled={refreshing}
          className="px-3 py-1 text-sm bg-zinc-700 hover:bg-zinc-600 disabled:bg-gray-700 rounded transition-colors"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-3">
        <InfoRow
          label="Signer Address"
          value={formatAddress(walletData.wallet.signerAddress)}
          fullValue={walletData.wallet.signerAddress}
        />

        <InfoRow
          label="AA Wallet Address"
          value={formatAddress(walletData.wallet.address)}
          fullValue={walletData.wallet.address}
        />

        <InfoRow
          label="Status"
          value={
            <span className={`inline-flex items-center gap-2 ${
              walletData.wallet.isDeployed ? 'text-green-400' : 'text-yellow-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                walletData.wallet.isDeployed ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'
              }`}></span>
              {walletData.wallet.isDeployed ? 'Deployed' : 'Not Deployed'}
            </span>
        }
        />

        <InfoRow
          label="AA Wallet Balance"
          value={`${parseFloat(walletData.balance).toFixed(6)} ETH`}
        />

        <InfoRow
          label="Signer Balance"
          value={`${parseFloat(walletData.signerBalance).toFixed(6)} ETH`}
        />

        {walletData.wallet.isDeployed && parseFloat(walletData.balance) < 0.001 && (
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
            <p className="text-sm text-blue-300 mb-3">
              Your AA wallet balance is low. Fund it to start transactions.
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={fundingAmount}
                onChange={(e) => setFundingAmount(e.target.value)}
                className="flex-1 px-3 py-2 bg-black/50 border border-blue-700 rounded text-white text-sm"
                placeholder="Amount in ETH"
              />
              <button
                onClick={handleFund}
                disabled={funding || !fundingAmount}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg transition-colors text-sm font-semibold"
              >
                {funding ? 'Sending...' : 'Fund'}
              </button>
            </div>
          </div>
        )}

        {!walletData.wallet.isDeployed && (
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-300 mb-3">
              Your AA wallet needs to be deployed before you can use it.
            </p>
            {!privateKey && (isWalletClientLoading || !isConnected) && (
              <p className="text-xs text-gray-400 mb-2">
                {isWalletClientLoading ? '⏳ Loading wallet connection...' : !isConnected ? '⚠️ Wallet not connected' : ''}
              </p>
            )}
            <button
              onClick={handleDeploy}
              disabled={deploying || (!privateKey && (isWalletClientLoading || !isConnected))}
              className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {deploying ? 'Deploying...' : (!privateKey && isWalletClientLoading) ? 'Loading...' : (!privateKey && !isConnected) ? 'Wallet Not Connected' : 'Deploy Wallet'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  fullValue
}: {
  label: string;
  value: React.ReactNode;
  fullValue?: string;
}) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-zinc-800 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-right font-mono text-sm">{value}</span>
    </div>
  );
}
