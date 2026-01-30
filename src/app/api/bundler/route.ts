import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const bundlerUrl = process.env.KITE_BUNDLER_URL || process.env.NEXT_PUBLIC_KITE_BUNDLER_URL;
    if (!bundlerUrl) {
      return NextResponse.json(
        { error: 'Bundler URL not configured' },
        { status: 500 }
      );
    }

    const payload = await request.json();
    const response = await fetch(bundlerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Bundler proxy error'
      },
      { status: 500 }
    );
  }
}
