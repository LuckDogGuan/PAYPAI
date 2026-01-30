import { BigNumberish } from "ethers";

// Wallet Types
export interface WalletConfig {
  network: string;
  rpcUrl: string;
  bundlerUrl: string;
}

// AA Wallet Types
export interface AAWallet {
  address: string;
  signerAddress: string;
  isDeployed: boolean;
}

// Vault Types
export interface SpendingRule {
  token: string;
  timeWindow: BigNumberish;
  budget: BigNumberish;
  initialWindowStartTime: BigNumberish;
  whitelist: string[];
  blacklist: string[];
}

export interface VaultConfig {
  settlementToken: string;
  admin: string;
  spendingRules: SpendingRule[];
}

// Transaction Types
export interface TransactionRequest {
  target: string;
  value: bigint;
  callData: string;
}

export interface BatchTransactionRequest {
  targets: string[];
  values: bigint[];
  callDatas: string[];
}

export interface TransactionResult {
  status: {
    status: 'success' | 'failed' | 'pending' | 'included' | 'reverted';
    transactionHash?: string;
    reason?: string;
  };
}

// AI Agent Types
export interface ParsedCommand {
  action: 'transfer' | 'approve' | 'purchase' | 'renew';
  token?: string;
  amount: string;
  recipient?: string;
  contract?: string;
}

export interface AgentResponse {
  success: boolean;
  parsedCommand?: ParsedCommand;
  error?: string;
  transactionRequest?: TransactionRequest | BatchTransactionRequest;
}

// Kite Testnet Contract Addresses
export const KITE_CONTRACTS = {
  SETTLEMENT_TOKEN:
    process.env.NEXT_PUBLIC_SETTLEMENT_TOKEN_ADDRESS ||
    '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63',
  SETTLEMENT_CONTRACT:
    process.env.NEXT_PUBLIC_SETTLEMENT_CONTRACT_ADDRESS ||
    '0x8d9FaD78d5Ce247aA01C140798B9558fd64a63E3',
  VAULT_IMPLEMENTATION:
    process.env.NEXT_PUBLIC_VAULT_IMPLEMENTATION_ADDRESS ||
    process.env.NEXT_PUBLIC_VAULT_IMPLEMENTATION ||
    '0x0000000000000000000000000000000000000000',
  VAULT_FACTORY:
    process.env.NEXT_PUBLIC_VAULT_FACTORY ||
    '0x0000000000000000000000000000000000000000',
  SETTLEMENT_TOKEN_DECIMALS:
    Number(process.env.NEXT_PUBLIC_SETTLEMENT_TOKEN_DECIMALS || '18'),
} as const;

const HAS_DEFAULT_TOKEN = Boolean(process.env.NEXT_PUBLIC_DEFAULT_VAULT_TOKEN_ADDRESS);

export const DEFAULT_VAULT_TOKEN = {
  ADDRESS:
    process.env.NEXT_PUBLIC_DEFAULT_VAULT_TOKEN_ADDRESS ||
    KITE_CONTRACTS.SETTLEMENT_TOKEN,
  SYMBOL: HAS_DEFAULT_TOKEN
    ? (process.env.NEXT_PUBLIC_DEFAULT_VAULT_TOKEN_SYMBOL || 'PPT')
    : 'KITE',
  DECIMALS: Number(
    (HAS_DEFAULT_TOKEN
      ? process.env.NEXT_PUBLIC_DEFAULT_VAULT_TOKEN_DECIMALS
      : KITE_CONTRACTS.SETTLEMENT_TOKEN_DECIMALS) || KITE_CONTRACTS.SETTLEMENT_TOKEN_DECIMALS
  )
} as const;
