import { NextRequest, NextResponse } from 'next/server';
import { parseNaturalCommand, generateTransaction } from '@/lib/ai-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command } = body;

    if (!command) {
      return NextResponse.json(
        { error: 'Missing command' },
        { status: 400 }
      );
    }

    // Get API configuration
    const apiKey = process.env.QWEN_API_KEY;
    const apiUrl = process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const model = process.env.QWEN_MODEL || 'qwen-plus';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Qwen API key not configured' },
        { status: 500 }
      );
    }

    // Parse the natural language command
    const parsed = await parseNaturalCommand(command, apiKey, apiUrl, model);

    if (parsed.error) {
      return NextResponse.json({
        success: false,
        error: parsed.error
      });
    }

    // Generate transaction
    const transaction = generateTransaction(parsed);

    if (!transaction) {
      return NextResponse.json({
        success: false,
        error: 'Could not generate transaction from command'
      });
    }

    return NextResponse.json({
      success: true,
      parsed,
      transaction
    });

  } catch (error) {
    console.error('Error processing AI command:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process command'
      },
      { status: 500 }
    );
  }
}
