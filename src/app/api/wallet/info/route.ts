import { NextRequest, NextResponse } from 'next/server';
import { getWalletService } from '@/lib/wallet-service';
import { ethers } from 'ethers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const signerAddress = searchParams.get('address');

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

    const walletService = getWalletService();
    const walletInfo = await walletService.getWalletInfo(signerAddress);
    const balance = await walletService.getBalance(walletInfo.address);
    const signerBalance = await walletService.getSignerBalance(signerAddress);

    return NextResponse.json({
      wallet: walletInfo,
      balance: ethers.formatEther(balance),
      signerBalance: ethers.formatEther(signerBalance)
    });
  } catch (error) {
    console.error('Error fetching wallet info:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch wallet info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
