import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

/**
 * API endpoint to validate user-provided AI provider API keys
 * Makes a minimal test request to verify the key works
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { provider, apiKey } = req.body;

  // Validate input
  if (!provider) {
    return res.status(400).json({ error: 'Provider is required' });
  }

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return res.status(400).json({ error: 'API key is required' });
  }

  console.log(`[API Key Validation] Testing ${provider} key...`);

  try {
    switch (provider.toLowerCase()) {
      case 'claude':
        return await validateClaudeKey(apiKey, res);

      case 'gemini':
        return await validateGeminiKey(apiKey, res);

      case 'openai':
        return await validateOpenAIKey(apiKey, res);

      default:
        return res.status(400).json({
          valid: false,
          error: `Unknown provider: ${provider}. Supported providers are: claude, gemini, openai`
        });
    }
  } catch (error) {
    console.error(`[API Key Validation] Error testing ${provider} key:`, error);

    // Check for authentication errors
    if (error.status === 401 || error.message?.includes('invalid_api_key') || error.message?.includes('Unauthorized')) {
      return res.status(200).json({
        valid: false,
        error: 'Invalid API key. Please check your key and try again.',
        provider
      });
    }

    // Check for quota/billing errors
    if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('billing')) {
      return res.status(200).json({
        valid: false,
        error: 'API key is valid but has exceeded quota or billing issues.',
        provider
      });
    }

    // Generic error
    return res.status(500).json({
      valid: false,
      error: `Validation failed: ${error.message}`,
      provider
    });
  }
}

/**
 * Validate Claude (Anthropic) API key
 */
async function validateClaudeKey(apiKey, res) {
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
      model: 'claude-sonnet-4-5-20250929',
      message: 'Claude API key is valid'
    });
  } catch (error) {
    console.error('[API Key Validation] Claude validation error:', error.message);
    throw error;
  }
}

/**
 * Validate Gemini (Google) API key
 */
async function validateGeminiKey(apiKey, res) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Make minimal test request
    const result = await model.generateContent('Hi');
    const response = await result.response;
    const text = response.text();

    console.log('[API Key Validation] Gemini key validation successful');

    return res.status(200).json({
      valid: true,
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      message: 'Gemini API key is valid'
    });
  } catch (error) {
    console.error('[API Key Validation] Gemini validation error:', error.message);
    throw error;
  }
}

/**
 * Validate OpenAI API key
 */
async function validateOpenAIKey(apiKey, res) {
  try {
    const client = new OpenAI({ apiKey: apiKey.trim() });

    // Make minimal test request
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: 'Hi'
      }],
      max_tokens: 10
    });

    console.log('[API Key Validation] OpenAI key validation successful');

    return res.status(200).json({
      valid: true,
      provider: 'openai',
      model: 'gpt-4o',
      message: 'OpenAI API key is valid'
    });
  } catch (error) {
    console.error('[API Key Validation] OpenAI validation error:', error.message);
    throw error;
  }
}
