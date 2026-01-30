import { ethers } from 'ethers';

/**
 * AI Agent Service
 * Integrates with Qwen API for natural language processing
 */

/**
 * Parse natural language command into transaction parameters
 */
export async function parseNaturalCommand(
  command: string,
  apiKey: string,
  apiUrl: string,
  model: string
): Promise<{
  action: string;
  recipient?: string;
  amount: string;
  token?: string;
  error?: string;
}> {
  try {
    const systemPrompt = `You are a blockchain transaction assistant. Parse the user's natural language command into a JSON object.

Available actions:
- "send" or "transfer": Send ETH or tokens to an address

Output format (strict JSON):
{
  "action": "send",
  "recipient": "0x...",
  "amount": "0.01",
  "token": "ETH" (optional, defaults to ETH)
}

Examples:
- "Send 0.01 ETH to 0x1234567890123456789012345678901234567890" -> {"action": "send", "recipient": "0x1234567890123456789012345678901234567890", "amount": "0.01"}
- "Transfer 100 tokens to 0xabcd..." -> {"action": "send", "recipient": "0xabcd...", "amount": "100", "token": "tokens"}
- "Pay 0x5 to Alice" -> {"action": "send", "recipient": "0x5...", "amount": "5", "token": "ETH"}

Only output the JSON object, nothing else.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: command }
    ];

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: {
          messages
        },
        parameters: {
          temperature: 0.3,
          max_tokens: 500,
          result_format: 'message'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Qwen API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Qwen API returns: data.output.choices[0].message.content
    let content = '';

    if (data.output?.choices?.[0]?.message?.content) {
      content = data.output.choices[0].message.content;
    } else if (data.output?.text) {
      content = data.output.text;
    } else if (data.choices?.[0]?.message?.content) {
      content = data.choices[0].message.content;
    } else {
      throw new Error('Unexpected API response format. Expected data.output.choices[0].message.content');
    }

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response. Content: ' + content);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and return
    if (!parsed.action || !parsed.amount) {
      throw new Error('Invalid AI response: missing required fields');
    }

    // Validate address if provided
    if (parsed.recipient && !ethers.isAddress(parsed.recipient)) {
      throw new Error('Invalid recipient address');
    }

    return {
      action: parsed.action,
      recipient: parsed.recipient,
      amount: parsed.amount.toString(),
      token: parsed.token || 'ETH'
    };

  } catch (error) {
    console.error('Error parsing command:', error);
    return {
      action: 'error',
      amount: '0',
      error: error instanceof Error ? error.message : 'Failed to parse command'
    };
  }
}

/**
 * Generate transaction from parsed command
 */
export function generateTransaction(parsed: {
  action: string;
  recipient?: string;
  amount: string;
  token?: string;
  error?: string;
}) {
  if (parsed.error || !parsed.recipient) {
    return null;
  }

  // Convert amount to bigint
  const decimals = parsed.token === 'ETH' ? 18 : 18;
  const amountBigInt = ethers.parseUnits(parsed.amount, decimals);

  return {
    target: parsed.recipient,
    value: parsed.token === 'ETH' ? amountBigInt.toString() : '0',
    callData: '0x', // Simple ETH transfer
    token: parsed.token
  };
}

/**
 * Format transaction for display
 */
export function formatTransaction(tx: {
  target: string;
  value: bigint;
  callData: string;
  token: string;
}) {
  if (tx.token === 'ETH') {
    return {
      type: 'ETH Transfer',
      to: tx.target,
      value: ethers.formatEther(tx.value),
      unit: 'ETH'
    };
  }

  return {
    type: 'Token Transfer',
    to: tx.target,
    value: tx.value.toString(),
    token: tx.token
  };
}
