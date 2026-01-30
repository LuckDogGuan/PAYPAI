'use client';

import type { WalletClient } from 'viem';

export function createWalletClientSignFunction(
  walletClient: WalletClient,
  signerAddress: string
) {
  return async (hash: Uint8Array | string): Promise<string> => {
    const hashHex = typeof hash === 'string'
      ? (hash.startsWith('0x') ? hash : `0x${hash}`)
      : `0x${Array.from(hash)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')}`;

    let signature = await walletClient.signMessage({
      account: signerAddress as `0x${string}`,
      message: { raw: hashHex as `0x${string}` }
    });

    // Some providers return v as 0/1. Normalize to 27/28 for on-chain ecrecover.
    if (signature.startsWith('0x') && signature.length === 132) {
      const vHex = signature.slice(-2);
      const v = Number.parseInt(vHex, 16);
      if (v === 0 || v === 1) {
        const normalizedV = (v + 27).toString(16).padStart(2, '0');
        signature = `${signature.slice(0, -2)}${normalizedV}`;
      }
    }

    return signature;
  };
}
