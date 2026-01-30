import { ethers } from 'ethers';

/**
 * Wallet Utilities for PayPai
 */

/**
 * Create a sign function from a private key
 * This is for development/testing purposes only
 */
export function createSignFunction(privateKey: string) {
  const wallet = new ethers.Wallet(privateKey);

  return async (userOpHash: string): Promise<string> => {
    return wallet.signMessage(ethers.getBytes(userOpHash));
  };
}

/**
 * Validate an Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Format address for display (truncate middle)
 */
export function formatAddress(address: string, chars = 6): string {
  if (!isValidAddress(address)) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`;
}

/**
 * Parse token amount to BigNumber
 */
export function parseTokenAmount(amount: string, decimals = 18): bigint {
  return ethers.parseUnits(amount, decimals);
}

/**
 * Format token amount from BigNumber
 */
export function formatTokenAmount(amount: bigint, decimals = 18): string {
  return ethers.formatUnits(amount, decimals);
}

/**
 * Get a random private key for testing (DO NOT USE IN PRODUCTION)
 */
export function generateTestPrivateKey(): string {
  const wallet = ethers.Wallet.createRandom();
  return wallet.privateKey;
}

/**
 * Get address from private key
 */
export function getAddressFromPrivateKey(privateKey: string): string {
  const wallet = new ethers.Wallet(privateKey);
  return wallet.address;
}

/**
 * Create an ethers JsonRpcProvider
 */
export function createProvider(rpcUrl: string) {
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Get wallet balance
 */
export async function getBalance(
  address: string,
  rpcUrl: string
): Promise<bigint> {
  const provider = createProvider(rpcUrl);
  return provider.getBalance(address);
}

/**
 * Get ERC-20 token balance
 */
export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  rpcUrl: string
): Promise<bigint> {
  const provider = createProvider(rpcUrl);
  const tokenContract = new ethers.Contract(
    tokenAddress,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
  return tokenContract.balanceOf(walletAddress);
}
