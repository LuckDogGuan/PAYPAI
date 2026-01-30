import { ethers } from 'ethers';
import { getKiteManager } from './kite';
import { createSignFunction } from './wallet';
import { SpendingRule, KITE_CONTRACTS } from '@/types';

/**
 * ClientAgentVault ABI for contract interactions
 */
const VAULT_ABI = [
  // View functions
  'function getSpendingRules() external view returns (tuple(address token, uint256 timeWindow, uint256 budget, uint256 initialWindowStartTime, address[] whitelist, address[] blacklist)[])',
  'function settlementToken() external view returns (address)',
  'function owner() external view returns (address)',
  'function isExecutor(address executor) external view returns (bool)',
  'function checkSpendAllowed(uint256 amount, address provider) external view returns (bool)',

  // Write functions
  'function configureSpendingRules((address token, uint256 timeWindow, uint256 budget, uint256 initialWindowStartTime, address[] whitelist, address[] blacklist)[] calldata rules) external',
  'function withdraw(address token, uint256 amount, address recipient) external',
  'function setExecutor(address executor, bool allowed) external',
  'function executeSpend(uint256 amount, address recipient) external'
];

/**
 * ClientAgentVault Implementation ABI (for deployment)
 */
const IMPLEMENTATION_ABI = [
  'function initialize(address settlementToken_, address admin_, address spendingAccount_) external'
];

/**
 * Minimal Proxy Factory ABI (for deploying vaults)
 */
const ERC1967_PROXY_ABI = [
  'function initialize(address _logic, bytes calldata _data) external'
];

/**
 * ClientAgentVault Service
 * Handles vault deployment and configuration
 */

export class VaultService {
  private kiteManager = getKiteManager();
  private sdk = this.kiteManager.getSDK();
  private provider: ethers.JsonRpcProvider;

  constructor() {
    const config = this.kiteManager.getConfig();
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
  }

  /**
   * Deploy a new ClientAgentVault proxy
   * Using the implementation contract and UUPS pattern
   */
  async deployVault(
    aaWalletAddress: string,
    signerAddress: string,
    privateKey: string
  ): Promise<{ success: boolean; vaultAddress?: string; error?: string }> {
    try {
      const signFunction = createSignFunction(privateKey);

      // Use the settlement token from KITE_CONTRACTS
      const settlementToken = KITE_CONTRACTS.SETTLEMENT_TOKEN;

      // Encode the initialize call data
      // This will be passed to the proxy to initialize the implementation
      const implementationInterface = new ethers.Interface(IMPLEMENTATION_ABI);
      const initData = implementationInterface.encodeFunctionData('initialize', [
        settlementToken,
        signerAddress, // EOA admin
        aaWalletAddress // AA wallet payer
      ]);

      // Deploy vault using sendUserOperationAndWait
      // The target is the implementation contract, but we need to use a factory
      // For now, we'll deploy through the AA wallet's execute function
      const deployRequest = {
        target: aaWalletAddress, // Call the AA wallet
        value: 0n,
        callData: '0x' // TODO: Encode the actual deployment call
      };

      // Note: This is a simplified version. In production, you'd use a factory contract
      // or directly deploy using ethers.Contract and then fund it via the AA wallet

      return {
        success: false,
        error: 'Vault deployment requires factory contract. Please use Kite\'s deployment tools.'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Configure spending rules for an existing vault
   */
  async configureSpendingRules(
    vaultAddress: string,
    aaWalletAddress: string,
    privateKey: string,
    rules: SpendingRule[]
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      const signFunction = createSignFunction(privateKey);

      // Encode the configureSpendingRules call
      const vaultInterface = new ethers.Interface(VAULT_ABI);

      // Convert rules to the format expected by the contract
      const rulesArray = rules.map(rule => ({
        token: rule.token,
        timeWindow: rule.timeWindow,
        budget: rule.budget,
        initialWindowStartTime: rule.initialWindowStartTime,
        whitelist: rule.whitelist,
        blacklist: rule.blacklist
      }));

      const callData = vaultInterface.encodeFunctionData('configureSpendingRules', [rulesArray]);

      const result = await this.sdk.sendUserOperationAndWait(
        aaWalletAddress,
        {
          target: vaultAddress,
          value: 0n,
          callData
        },
        signFunction
      );

      if (result.status.status === 'success') {
        return {
          success: true,
          transactionHash: result.status.transactionHash
        };
      } else {
        return {
          success: false,
          error: result.status.reason || 'Configuration failed'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get spending rules from a vault
   */
  async getSpendingRules(vaultAddress: string): Promise<SpendingRule[]> {
    try {
      const contract = new ethers.Contract(vaultAddress, VAULT_ABI, this.provider);
      const rules = await contract.getSpendingRules();

      return rules.map((rule: any) => ({
        token: rule.token,
        timeWindow: rule.timeWindow,
        budget: rule.budget,
        initialWindowStartTime: rule.initialWindowStartTime,
        whitelist: rule.whitelist || [],
        blacklist: rule.blacklist || []
      }));
    } catch (error) {
      console.error('Error fetching spending rules:', error);
      return [];
    }
  }

  /**
   * Get vault information
   */
  async getVaultInfo(vaultAddress: string): Promise<{
    settlementToken: string;
    admin: string;
    balance: bigint;
  }> {
    try {
      const contract = new ethers.Contract(vaultAddress, VAULT_ABI, this.provider);

      const [settlementToken, admin, balance] = await Promise.all([
        contract.settlementToken(),
        contract.owner(),
        this.provider.getBalance(vaultAddress)
      ]);

      return {
        settlementToken,
        admin,
        balance
      };
    } catch (error) {
      console.error('Error fetching vault info:', error);
      throw error;
    }
  }

  /**
   * Get token balance in vault
   */
  async getTokenBalance(vaultAddress: string, tokenAddress: string): Promise<bigint> {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider
      );

      return await tokenContract.balanceOf(vaultAddress);
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return 0n;
    }
  }

  /**
   * Withdraw funds from vault
   */
  async withdraw(
    vaultAddress: string,
    aaWalletAddress: string,
    privateKey: string,
    tokenAddress: string,
    amount: bigint,
    recipient: string
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      const signFunction = createSignFunction(privateKey);

      const vaultInterface = new ethers.Interface(VAULT_ABI);
      const callData = vaultInterface.encodeFunctionData('withdraw', [
        tokenAddress,
        amount,
        recipient
      ]);

      const result = await this.sdk.sendUserOperationAndWait(
        aaWalletAddress,
        {
          target: vaultAddress,
          value: 0n,
          callData
        },
        signFunction
      );

      if (result.status.status === 'success') {
        return {
          success: true,
          transactionHash: result.status.transactionHash
        };
      } else {
        return {
          success: false,
          error: result.status.reason || 'Withdrawal failed'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a simple spending rule configuration
   */
  createDefaultRule(budget: string, timeWindowHours: number = 24): SpendingRule {
    const now = Math.floor(Date.now() / 1000);
    const timeWindow = BigInt(timeWindowHours * 3600); // Convert hours to seconds

    return {
      token: KITE_CONTRACTS.SETTLEMENT_TOKEN,
      timeWindow,
      budget: ethers.parseUnits(budget, 18), // Assuming 18 decimals
      initialWindowStartTime: BigInt(now),
      whitelist: [], // Empty means all recipients allowed
      blacklist: []
    };
  }
}

// Singleton instance
let vaultService: VaultService | null = null;

export function getVaultService(): VaultService {
  if (!vaultService) {
    vaultService = new VaultService();
  }
  return vaultService;
}
