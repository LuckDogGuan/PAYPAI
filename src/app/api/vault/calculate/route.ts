import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getKiteManager } from '@/lib/kite';
import { getVaultSalt } from '@/lib/vault-utils';
import { KITE_CONTRACTS } from '@/types';

const FACTORY_ABI = [
  'function getVaultAddress(address admin, address spendingAccount, bytes32 userSalt) external view returns (address)'
];

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address');

    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid signer address' },
        { status: 400 }
      );
    }

    const kiteManager = getKiteManager();
    const sdk = kiteManager.getSDK();
    const aaWalletAddress = sdk.getAccountAddress(address);

    const factoryAddress = KITE_CONTRACTS.VAULT_FACTORY;
    const rpcUrl = process.env.NEXT_PUBLIC_KITE_RPC_URL;

    if (!factoryAddress || factoryAddress === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({
        signerAddress: address,
        aaWalletAddress,
        vaultAddress: '',
        deployed: false,
        factoryAddress: ''
      });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
    const salt = getVaultSalt(address);

    const vaultAddress = await factory.getVaultAddress(address, aaWalletAddress, salt);
    const code = await provider.getCode(vaultAddress);
    const deployed = code !== '0x' && code !== '0x0';

    return NextResponse.json({
      signerAddress: address,
      aaWalletAddress,
      vaultAddress,
      deployed,
      factoryAddress
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to calculate vault address',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
