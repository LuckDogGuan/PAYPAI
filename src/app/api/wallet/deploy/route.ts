import { NextRequest, NextResponse } from 'next/server';
import { getWalletService } from '@/lib/wallet-service';
import { ethers } from 'ethers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signerAddress, privateKey, useMetaMask } = body;

    if (!signerAddress) {
      return NextResponse.json(
        { error: 'Missing signer address' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!ethers.isAddress(signerAddress)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Check if we have either private key or MetaMask flag
    if (!privateKey && !useMetaMask) {
      return NextResponse.json(
        { error: 'Missing signer address or private key' },
        { status: 400 }
      );
    }

    const walletService = getWalletService();

    // For MetaMask, we'll need to handle signing differently
    // For now, return a message that client-side signing is needed
    if (useMetaMask) {
      return NextResponse.json(
        {
          error: 'MetaMask deployment requires client-side signing',
          requiresClientSigning: true,
          signerAddress
        },
        { status: 400 }
      );
    }

    const result = await walletService.deployWallet(signerAddress, privateKey);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deploying wallet:', error);
    return NextResponse.json(
      {
        error: 'Failed to deploy wallet',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
