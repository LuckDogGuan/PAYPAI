import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function GET() {
  const executorPrivateKey = process.env.EXECUTOR_PRIVATE_KEY;
  const executorAddress = executorPrivateKey
    ? new ethers.Wallet(executorPrivateKey).address
    : process.env.NEXT_PUBLIC_EXECUTOR_ADDRESS || '';

  if (!executorAddress) {
    return NextResponse.json(
      { error: 'Executor not configured' },
      { status: 404 }
    );
  }

  return NextResponse.json({ address: executorAddress });
}
