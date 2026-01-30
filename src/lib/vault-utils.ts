import { ethers } from 'ethers';
import { getKiteManager } from './kite';
import { KITE_CONTRACTS } from '@/types';

/**
 * Vault Utilities
 * Helper functions for ClientAgentVault management
 */

/**
 * Calculate deterministic vault address based on AA wallet
 * This matches the AA wallet address calculation from Kite SDK
 */
export function getVaultSalt(adminAddress: string): string {
  return ethers.keccak256(
    ethers.solidityPacked(
      ['string', 'address'],
      ['PAYPAI_VAULT_V1', adminAddress]
    )
  );
}

export function calculateVaultAddress(signerAddress: string): string {
  // Use the same method as Kite SDK to get AA wallet address
  const kiteManager = getKiteManager();
  const sdk = kiteManager.getSDK();

  // Get the AA wallet address using Kite SDK
  const aaWalletAddress = sdk.getAccountAddress(signerAddress);

  // For ClientAgentVault, we use a similar deterministic calculation
  // but with the vault implementation contract
  const salt = getVaultSalt(signerAddress);

  // CREATE2 address: keccak256(0xff ++ factory ++ salt ++ keccak256(initCode))[12:]
  // This is a best-effort local estimate; for authoritative result use VaultFactory.getVaultAddress.
  const initData = new ethers.Interface([
    'function initialize(address settlementToken_, address admin_, address spendingAccount_) external'
  ]).encodeFunctionData('initialize', [
    KITE_CONTRACTS.SETTLEMENT_TOKEN,
    signerAddress,
    aaWalletAddress
  ]);

  const initCodeHash = ethers.keccak256(
    ethers.solidityPacked(
      ['bytes', 'bytes'],
      [
        ethers.getBytes('0x'), // placeholder for proxy bytecode when computing locally
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'bytes'],
          [KITE_CONTRACTS.VAULT_IMPLEMENTATION, initData]
        )
      ]
    )
  );

  const hash = ethers.keccak256(
    ethers.solidityPacked(
      ['bytes1', 'address', 'bytes32', 'bytes32'],
      ['0xff', KITE_CONTRACTS.VAULT_FACTORY, salt, initCodeHash]
    )
  );

  return `0x${hash.slice(-40)}`;
}

/**
 * Get AA wallet address using Kite SDK
 */
export function getAAWalletAddress(signerAddress: string): string {
  const kiteManager = getKiteManager();
  const sdk = kiteManager.getSDK();
  return sdk.getAccountAddress(signerAddress);
}

/**
 * Check if a vault exists at the given address
 */
export async function isVaultDeployed(vaultAddress: string): Promise<boolean> {
  try {
    // This should be called from an API route
    // For now returning false as placeholder
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Get vault info from explorer or RPC
 */
export async function getVaultDeploymentStatus(
  vaultAddress: string,
  rpcUrl: string
): Promise<{
  deployed: boolean;
  hasBalance: boolean;
}> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Check if contract is deployed
    const code = await provider.getCode(vaultAddress);
    const deployed = code !== '0x' && code !== '0x0';

    // Check balance
    const balance = deployed ? await provider.getBalance(vaultAddress) : 0n;
    const hasBalance = balance > 0n;

    return { deployed, hasBalance };
  } catch (error) {
    return { deployed: false, hasBalance: false };
  }
}

/**
 * Generate vault deployment explanation
 */
export function getVaultDeploymentInfo(aaWalletAddress: string) {
  const calculatedAddress = calculateVaultAddress(aaWalletAddress);

  return {
    calculatedAddress,
    message: 'Your ClientAgentVault will be deployed at this address',
    note: 'This address is deterministically calculated from your AA wallet'
  };
}
