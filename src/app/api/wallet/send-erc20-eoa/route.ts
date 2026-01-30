import { NextRequest, NextResponse } from 'next/server';
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
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_KITE_RPC_URL);
    const signer = new ethers.Wallet(privateKey, provider);
    const erc20 = new ethers.Interface(['function transfer(address to, uint256 amount)']);
    const callData = erc20.encodeFunctionData('transfer', [
      recipient,
      ethers.parseUnits(amount, decimals)
    ]);

    const tx = await signer.sendTransaction({
      to: tokenAddress,
      data: callData
    });

    const receipt = await tx.wait();
    return NextResponse.json({
      success: true,
      transactionHash: receipt?.hash
    });
  } catch (error) {
    console.error('Error sending ERC20 from EOA:', error);
    return NextResponse.json(
      {
        error: 'Failed to send ERC20',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
