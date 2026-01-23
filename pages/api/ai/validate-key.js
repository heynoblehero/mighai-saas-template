import Anthropic from '@anthropic-ai/sdk';

/**
 * API endpoint to validate Claude API keys
 * Makes a minimal test request to verify the key works
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey } = req.body;

  // Validate input
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return res.status(400).json({ error: 'API key is required' });
  }

  // Validate key format
  if (!apiKey.trim().startsWith('sk-ant-')) {
    return res.status(200).json({
      valid: false,
      error: 'Invalid Claude API key format. Keys should start with "sk-ant-"',
      provider: 'claude'
    });
  }

  console.log('[API Key Validation] Testing Claude key...');

  try {
    const client = new Anthropic({ apiKey: apiKey.trim() });

    // Make minimal test request (10 tokens max)
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: 'Hi'
      }]
    });

    console.log('[API Key Validation] Claude key validation successful');

    return res.status(200).json({
      valid: true,
      provider: 'claude',
      model: 'Claude Sonnet 4.5',
      message: 'Claude API key is valid'
    });
  } catch (error) {
    console.error('[API Key Validation] Claude validation error:', error.message);

    // Check for authentication errors
    if (error.status === 401 || error.message?.includes('invalid_api_key') || error.message?.includes('Unauthorized')) {
      return res.status(200).json({
        valid: false,
        error: 'Invalid API key. Please check your key and try again.',
        provider: 'claude'
      });
    }

    // Check for quota/billing errors
    if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('billing')) {
      return res.status(200).json({
        valid: false,
        error: 'API key is valid but has exceeded quota or has billing issues.',
        provider: 'claude'
      });
    }

    // Generic error
    return res.status(500).json({
      valid: false,
      error: `Validation failed: ${error.message}`,
      provider: 'claude'
    });
  }
}
