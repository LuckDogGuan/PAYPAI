import { NextRequest, NextResponse } from 'next/server';
import { getWalletService } from '@/lib/wallet-service';
import { ethers } from 'ethers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      signerAddress,
      recipient,
      amount,
      privateKey,
      tokenAddress,
      tokenDecimals
    } = body;

    if (!signerAddress || !recipient || !amount || !privateKey || !tokenAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(signerAddress) || !ethers.isAddress(recipient) || !ethers.isAddress(tokenAddress)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const decimals = Number.isFinite(Number(tokenDecimals)) ? Number(tokenDecimals) : 18;

    const walletService = getWalletService();
    const result = await walletService.sendERC20(
      signerAddress,
      tokenAddress,
      recipient,
      amount,
      privateKey,
      decimals
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error sending ERC20 transaction:', error);
    return NextResponse.json(
      {
        error: 'Failed to send ERC20 transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
