import { NextRequest, NextResponse } from 'next/server';
import { KITE_CONTRACTS } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const factoryAddress = KITE_CONTRACTS.VAULT_FACTORY;

    if (!factoryAddress || factoryAddress === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json(
        { success: false, error: 'Vault factory not configured' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${request.nextUrl.origin}/api/vault/deploy-factory`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          factoryAddress
        })
      }
    );

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
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
