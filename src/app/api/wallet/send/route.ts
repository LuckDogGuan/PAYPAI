import { NextRequest, NextResponse } from 'next/server';
import { getWalletService } from '@/lib/wallet-service';
import { ethers } from 'ethers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signerAddress, recipient, amount, privateKey } = body;

    if (!signerAddress || !recipient || !amount || !privateKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!ethers.isAddress(signerAddress) || !ethers.isAddress(recipient)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const walletService = getWalletService();
    const result = await walletService.sendETH(
      signerAddress,
      recipient,
      amount,
      privateKey
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error sending transaction:', error);
    return NextResponse.json(
      {
        error: 'Failed to send transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
