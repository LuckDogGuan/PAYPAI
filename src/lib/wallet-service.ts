import { ethers } from 'ethers';
import { getKiteManager } from './kite';
import { createSignFunction } from './wallet';
import { TransactionRequest, TransactionResult, AAWallet } from '@/types';

/**
 * AA Wallet Service
 * Handles Account Abstraction wallet operations
 */

export class AAWalletService {
  private kiteManager = getKiteManager();
  private sdk = this.kiteManager.getSDK();

  /**
   * Get AA wallet address for a signer
   */
  getAAWalletAddress(signerAddress: string): string {
    return this.sdk.getAccountAddress(signerAddress);
  }

  /**
   * Check if AA wallet is deployed
   */
  async isWalletDeployed(aaWalletAddress: string): Promise<boolean> {
    const config = this.kiteManager.getConfig();
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);

    try {
      const code = await provider.getCode(aaWalletAddress);
      return code !== '0x' && code !== '0x0';
    } catch (error) {
      console.error('Error checking wallet deployment:', error);
      return false;
    }
  }

  /**
   * Deploy AA wallet (first transaction deploys it automatically)
   */
  async deployWallet(
    signerAddress: string,
    privateKey: string
  ): Promise<TransactionResult> {
    try {
      const signFunction = createSignFunction(privateKey);

      // Send a minimal transaction to deploy the wallet
      // This will trigger the wallet deployment
      const deployRequest: TransactionRequest = {
        target: signerAddress, // Send to self
        value: 0n,
        callData: '0x'
      };

      console.log('Deploying wallet for signer:', signerAddress);
      console.log('Deploy request:', deployRequest);

      const result = await this.sdk.sendUserOperationAndWait(
        signerAddress,
        deployRequest,
        signFunction
      );

      console.log('Deploy result:', result);
      return result;
    } catch (error) {
      console.error('Deploy wallet error:', error);
      return {
        status: {
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Send ETH from AA wallet
   */
  async sendETH(
    signerAddress: string,
    recipient: string,
    amount: string,
    privateKey: string
  ): Promise<TransactionResult> {
    try {
      const signFunction = createSignFunction(privateKey);

      const request: TransactionRequest = {
        target: recipient,
        value: ethers.parseEther(amount),
        callData: '0x'
      };

      const result = await this.sdk.sendUserOperationAndWait(
        signerAddress,
        request,
        signFunction
      );

      return result;
    } catch (error) {
      return {
        status: {
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Send ERC20 from AA wallet
   */
  async sendERC20(
    signerAddress: string,
    tokenAddress: string,
    recipient: string,
    amount: string,
    privateKey: string,
    tokenDecimals = 18
  ): Promise<TransactionResult> {
    try {
      const signFunction = createSignFunction(privateKey);
      const erc20 = new ethers.Interface(['function transfer(address to, uint256 amount)']);
      const callData = erc20.encodeFunctionData('transfer', [
        recipient,
        ethers.parseUnits(amount, tokenDecimals)
      ]);

      const request: TransactionRequest = {
        target: tokenAddress,
        value: 0n,
        callData
      };

      const result = await this.sdk.sendUserOperationAndWait(
        signerAddress,
        request,
        signFunction
      );

      return result;
    } catch (error) {
      return {
        status: {
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Approve ERC20 spending from AA wallet
   */
  async approveERC20(
    signerAddress: string,
    tokenAddress: string,
    spender: string,
    amount: string,
    privateKey: string,
    tokenDecimals = 18,
    useMax = false
  ): Promise<TransactionResult> {
    try {
      const signFunction = createSignFunction(privateKey);
      const erc20 = new ethers.Interface(['function approve(address spender, uint256 amount)']);
      const approveAmount = useMax ? ethers.MaxUint256 : ethers.parseUnits(amount, tokenDecimals);
      const callData = erc20.encodeFunctionData('approve', [spender, approveAmount]);

      const request: TransactionRequest = {
        target: tokenAddress,
        value: 0n,
        callData
      };

      const result = await this.sdk.sendUserOperationAndWait(
        signerAddress,
        request,
        signFunction
      );

      return result;
    } catch (error) {
      return {
        status: {
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get wallet info
   */
  async getWalletInfo(signerAddress: string): Promise<AAWallet> {
    const aaWalletAddress = this.getAAWalletAddress(signerAddress);
    const isDeployed = await this.isWalletDeployed(aaWalletAddress);

    return {
      address: aaWalletAddress,
      signerAddress,
      isDeployed
    };
  }

  /**
   * Get ETH balance of AA wallet
   */
  async getBalance(aaWalletAddress: string): Promise<bigint> {
    const config = this.kiteManager.getConfig();
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);

    return provider.getBalance(aaWalletAddress);
  }

  /**
   * Get native token balance from EOA
   */
  async getSignerBalance(signerAddress: string): Promise<bigint> {
    const config = this.kiteManager.getConfig();
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);

    return provider.getBalance(signerAddress);
  }
}

// Singleton instance
let walletService: AAWalletService | null = null;

export function getWalletService(): AAWalletService {
  if (!walletService) {
    walletService = new AAWalletService();
  }
  return walletService;
}
