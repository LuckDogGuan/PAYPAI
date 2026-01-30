import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getVaultSalt } from '@/lib/vault-utils';
import { getKiteManager } from '@/lib/kite';

const FACTORY_ABI = [
  'function deployDeterministic(address admin, address spendingAccount, bytes32 userSalt) external returns (address)',
  'function getVaultAddress(address admin, address spendingAccount, bytes32 userSalt) external view returns (address)'
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signerAddress, privateKey, factoryAddress } = body;

    if (!signerAddress || !privateKey || !factoryAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(signerAddress) || !ethers.isAddress(factoryAddress)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_KITE_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const factoryInterface = new ethers.Interface(FACTORY_ABI);
    const salt = getVaultSalt(signerAddress);
    const sdk = getKiteManager().getSDK();
    const aaWalletAddress = sdk.getAccountAddress(signerAddress);
    const callData = factoryInterface.encodeFunctionData('deployDeterministic', [
      signerAddress,
      aaWalletAddress,
      salt
    ]);

    const tx = await wallet.sendTransaction({
      to: factoryAddress,
      data: callData,
      value: 0n
    });

    const receipt = await tx.wait();
    if (!receipt) {
      return NextResponse.json(
        { success: false, error: 'Transaction not confirmed' },
        { status: 500 }
      );
    }

    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
    const vaultAddress = await factory.getVaultAddress(signerAddress, aaWalletAddress, salt);

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      vaultAddress,
      aaWalletAddress
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
