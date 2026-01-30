import { GokiteAASDK } from 'gokite-aa-sdk';
import { WalletConfig } from '@/types';

/**
 * Kite SDK Configuration and Initialization
 */
export class KiteSDKManager {
  private sdk: GokiteAASDK;
  private config: WalletConfig;

  constructor(config?: WalletConfig) {
    this.config = config || this.getDefaultConfig();

    this.sdk = new GokiteAASDK(
      this.config.network,
      this.config.rpcUrl,
      this.config.bundlerUrl
    );
  }

  /**
   * Get default Kite testnet configuration
   */
  private getDefaultConfig(): WalletConfig {
    const isBrowser = typeof window !== 'undefined';
    const browserBundlerUrl =
      process.env.NEXT_PUBLIC_BUNDLER_PROXY_URL || '/api/bundler';
    const serverBundlerUrl =
      process.env.KITE_BUNDLER_URL ||
      process.env.NEXT_PUBLIC_KITE_BUNDLER_URL ||
      'https://bundler-service.staging.gokite.ai/rpc/';

    return {
      network: process.env.NEXT_PUBLIC_KITE_NETWORK || 'kite_testnet',
      rpcUrl: process.env.NEXT_PUBLIC_KITE_RPC_URL || 'https://rpc-testnet.gokite.ai',
      bundlerUrl: isBrowser ? browserBundlerUrl : serverBundlerUrl,
    };
  }

  /**
   * Get the underlying SDK instance
   */
  getSDK(): GokiteAASDK {
    return this.sdk;
  }

  /**
   * Get AA wallet address for a given signer
   */
  getAccountAddress(signerAddress: string): string {
    return this.sdk.getAccountAddress(signerAddress);
  }

  /**
   * Get current configuration
   */
  getConfig(): WalletConfig {
    return this.config;
  }

  /**
   * Validate configuration
   */
  validateConfig(): boolean {
    return !!(
      this.config.network &&
      this.config.rpcUrl &&
      this.config.bundlerUrl
    );
  }
}

// Singleton instance
let kiteManager: KiteSDKManager | null = null;

/**
 * Get or create Kite SDK manager instance
 */
export function getKiteManager(): KiteSDKManager {
  if (!kiteManager) {
    kiteManager = new KiteSDKManager();
  }
  return kiteManager;
}

/**
 * Reset the Kite SDK manager (useful for testing)
 */
export function resetKiteManager(): void {
  kiteManager = null;
}
