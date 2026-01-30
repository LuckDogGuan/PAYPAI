import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import type { Chain } from 'viem';

// KiteAI Testnet configuration
const rpcUrl = process.env.NEXT_PUBLIC_KITE_RPC_URL || 'https://rpc-testnet.gokite.ai';
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'paypai-walletconnect';

const kiteTestnetChain = {
  id: 2368,
  name: 'KiteAI Testnet',
  network: 'kiteai-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'KITE',
    symbol: 'KITE',
  },
  rpcUrls: {
    public: { http: [rpcUrl] },
    default: { http: [rpcUrl] },
  },
  blockExplorers: {
    default: { name: 'KiteScan', url: 'https://testnet.kitescan.ai' },
  },
  testnet: true,
} as const satisfies Chain;

export const chains = [kiteTestnetChain] as const;

// Create wagmi + RainbowKit config
export const config = getDefaultConfig({
  appName: 'PayPai',
  projectId: walletConnectProjectId,
  chains,
  ssr: true,
  transports: {
    [kiteTestnetChain.id]: http(rpcUrl),
  },
});

// Export chain for use in components
export { kiteTestnetChain };
