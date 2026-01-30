'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const WalletConnect = dynamic(() => import('@/components/wallet/WalletConnect'), { ssr: false });
const WalletInfo = dynamic(() => import('@/components/wallet/WalletInfo'), { ssr: false });
const SendTransaction = dynamic(() => import('@/components/wallet/SendTransaction'), { ssr: false });
const AICommand = dynamic(() => import('@/components/ai/AICommand'), { ssr: false });
const VaultManager = dynamic(() => import('@/components/vault/VaultManager'), { ssr: false });

export default function Home() {
  const [privateKey, setPrivateKey] = useState<string>('');
  const [manualAddress, setManualAddress] = useState<string>('');
  const [isWalletDeployed, setIsWalletDeployed] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [vaultAddress, setVaultAddress] = useState('');
  const [vaultExecutorReady, setVaultExecutorReady] = useState(false);
  const [useVault, setUseVault] = useState(true);
  const [activeAction, setActiveAction] = useState<'ai' | 'manual'>('ai');

  const { address, isConnected } = useAccount();

  // Wait for client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrivateKeyConnect = (address: string, key: string) => {
    console.log('handlePrivateKeyConnect:', { address, key: key ? 'exists' : 'empty' });
    setManualAddress(address);
    setPrivateKey(key);
  };

  const signerAddress = useMemo(() => {
    if (isConnected && address) return address;
    return manualAddress;
  }, [address, isConnected, manualAddress]);

  const effectivePrivateKey = isConnected ? '' : privateKey;

  useEffect(() => {
    if (isConnected) {
      setManualAddress('');
      setPrivateKey('');
    }
  }, [isConnected]);

  useEffect(() => {
    if (signerAddress) {
      setIsWalletDeployed(false);
    }
  }, [signerAddress]);

  // Show loading during SSR
  if (!mounted) {
    return (
      <main className="min-h-screen p-8 bg-black">
        <div className="max-w-2xl mx-auto">
          <header className="mb-12 text-center">
            <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              PayPai
            </h1>
            <p className="text-xl text-gray-400">Loading...</p>
          </header>
        </div>
      </main>
    );
  }

  // Show connect screen if no wallet is connected
  if (!signerAddress) {
    return (
      <main className="min-h-screen p-8 bg-black">
        <div className="max-w-2xl mx-auto">
          <header className="mb-12 text-center">
            <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              PayPai
            </h1>
            <p className="text-xl text-gray-400">
              AI-Powered Smart Wallet
            </p>
          </header>

          <WalletConnect onPrivateKeyConnect={handlePrivateKeyConnect} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              PayPai
            </h1>
            <p className="text-sm text-gray-400">
              Connected: {signerAddress.slice(0, 8)}...{signerAddress.slice(-6)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
            {!isConnected && manualAddress && (
              <button
                onClick={() => {
                  setManualAddress('');
                  setPrivateKey('');
                  setIsWalletDeployed(false);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
              >
                Disconnect Dev Key
              </button>
            )}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="space-y-6">
            <WalletInfo
              signerAddress={signerAddress}
              privateKey={effectivePrivateKey}
              refreshTrigger={refreshTrigger}
              onDeploymentStatusChange={setIsWalletDeployed}
            />

            {isWalletDeployed && (
              <VaultManager
                aaWalletAddress={signerAddress}
                privateKey={effectivePrivateKey}
                onVaultReady={(address, executorReady) => {
                  setVaultAddress(address);
                  setVaultExecutorReady(executorReady);
                }}
              />
            )}

            {!isWalletDeployed && (
              <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-6 rounded-lg border border-purple-700">
                <h3 className="text-lg font-semibold text-white mb-2">
                  ⚠️ Wallet Not Deployed
                </h3>
                <p className="text-sm text-gray-300">
                  Your AA wallet needs to be deployed before you can send transactions.
                  Click the button in the wallet info section above.
                </p>
              </div>
            )}
          </section>

          <section className="space-y-6">
            {isWalletDeployed && (
              <div className="bg-zinc-900/80 p-4 rounded-lg border border-zinc-800">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Execution Mode
                    </div>
                    <div className="text-sm text-gray-300">
                      {vaultAddress
                        ? vaultExecutorReady
                          ? 'Vault can auto-execute without prompts.'
                          : 'Authorize the executor to enable vault automation.'
                        : 'Deploy a vault to enable auto-execution.'}
                    </div>
                  </div>
                  {vaultAddress && (
                    <button
                      onClick={() => setUseVault((prev) => !prev)}
                      disabled={!vaultExecutorReady}
                      className={`px-4 py-2 rounded text-sm font-semibold ${
                        useVault
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-zinc-700 hover:bg-zinc-600'
                      } disabled:bg-gray-700 disabled:cursor-not-allowed`}
                    >
                      {useVault ? 'Vault Enabled' : 'Vault Disabled'}
                    </button>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveAction('ai')}
                    className={`px-4 py-2 rounded text-sm font-semibold ${
                      activeAction === 'ai'
                        ? 'bg-blue-600'
                        : 'bg-zinc-800 border border-zinc-700 text-gray-300'
                    }`}
                  >
                    AI Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAction('manual')}
                    className={`px-4 py-2 rounded text-sm font-semibold ${
                      activeAction === 'manual'
                        ? 'bg-emerald-600'
                        : 'bg-zinc-800 border border-zinc-700 text-gray-300'
                    }`}
                  >
                    Manual Send
                  </button>
                </div>

                {vaultAddress && (
                  <p className="mt-3 text-xs text-gray-500">
                    Vault mode supports the settlement token only. Disable it to send ETH or custom ERC20s.
                  </p>
                )}
              </div>
            )}

            {!isWalletDeployed && (
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 text-sm text-gray-400">
                Deploy your AA wallet to unlock AI and manual transactions.
              </div>
            )}

            {isWalletDeployed && activeAction === 'ai' && (
              <AICommand
                signerAddress={signerAddress}
                privateKey={effectivePrivateKey}
                vaultAddress={vaultAddress}
                useVault={useVault && vaultExecutorReady}
                refreshTrigger={refreshTrigger}
                onTransactionExecuted={() => setRefreshTrigger(prev => prev + 1)}
              />
            )}

            {isWalletDeployed && activeAction === 'manual' && (
              <SendTransaction
                signerAddress={signerAddress}
                privateKey={effectivePrivateKey}
                vaultAddress={vaultAddress}
                useVault={useVault && vaultExecutorReady}
                refreshTrigger={refreshTrigger}
                isWalletDeployed={isWalletDeployed}
                onTransactionSent={() => setRefreshTrigger(prev => prev + 1)}
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
