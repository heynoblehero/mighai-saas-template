/**
 * Multi-Provider AI Service
 * Supports: Claude, Gemini (free)
 */

import fetch from 'node-fetch';

class AIProviderService {
  constructor(settings) {
    this.settings = settings;
    this.provider = settings.ai_provider || 'gemini'; // Default to free Gemini
  }

  /**
   * Generate content using the configured AI provider
   */
  async generate(prompt, options = {}) {
    const provider = options.provider || this.provider;

    console.log(`🤖 Using AI provider: ${provider}`);

    switch (provider) {
      case 'gemini':
      case 'gemini-pro':
      case 'gemini-flash':
        return await this.generateWithGemini(prompt, options);
      case 'claude':
      case 'claude-sonnet':
      case 'claude-haiku':
        return await this.generateWithClaude(prompt, options);
      default:
        throw new Error(`Unsupported AI provider: ${provider}. Supported: claude, gemini`);
    }
  }

  /**
   * Google Gemini API (FREE TIER - 15 RPM, 1M tokens/day)
   */
  async generateWithGemini(prompt, options = {}) {
    const apiKey = this.settings.gemini_api_key;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const model = this.settings.gemini_model || 'gemini-2.0-flash'; // Free tier model
    const maxTokens = options.maxTokens || this.settings.max_tokens || 8192;
    const temperature = options.temperature !== undefined ? options.temperature : (this.settings.temperature || 1);

    console.log('🔷 Gemini API Request:');
    console.log('  - Model:', model);
    console.log('  - Max tokens:', maxTokens);
    console.log('  - Temperature:', temperature);
    console.log('  - Prompt length:', prompt.length);

    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: maxTokens,
          topP: 0.95,
          topK: 40
        }
      })
    });

    const data = await response.json();
    console.log('🔷 Gemini API Response Status:', response.status);

    if (!response.ok) {
      console.error('❌ Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to generate content with Gemini');
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tokensUsed = data.usageMetadata?.candidatesTokenCount || 0;
    const inputTokens = data.usageMetadata?.promptTokenCount || 0;

    console.log('🔷 Gemini Generation Results:');
    console.log('  - Generated text length:', generatedText.length);
    console.log('  - Input tokens:', inputTokens);
    console.log('  - Output tokens:', tokensUsed);

    // Gemini is free, so cost is $0
    return {
      content: generatedText,
      tokens_used: tokensUsed,
      input_tokens: inputTokens,
      estimated_cost: 0, // FREE!
      provider: 'gemini',
      model: model
    };
  }

  /**
   * Anthropic Claude API (PAID)
   */
  async generateWithClaude(prompt, options = {}) {
    const apiKey = this.settings.claude_api_key;
    if (!apiKey) {
      throw new Error('Claude API key not configured');
    }

    const model = this.settings.claude_model || 'claude-sonnet-4-5-20250929';
    const maxTokens = options.maxTokens || this.settings.max_tokens || 8192;
    const temperature = options.temperature !== undefined ? options.temperature : (this.settings.temperature || 1);

    console.log('🔵 Claude API Request:');
    console.log('  - Model:', model);
    console.log('  - Max tokens:', maxTokens);
    console.log('  - Temperature:', temperature);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
        temperature: temperature,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    const data = await response.json();
    console.log('🔵 Claude API Response Status:', response.status);

    if (!response.ok) {
      console.error('❌ Claude API error:', data);
      throw new Error(data.error?.message || 'Failed to generate content with Claude');
    }

    const generatedText = data.content?.[0]?.text || '';
    const tokensUsed = data.usage?.output_tokens || 0;
    const inputTokens = data.usage?.input_tokens || 0;

    // Claude pricing (approximate for Sonnet)
    const estimatedCost = (tokensUsed / 1000) * 0.015;

    console.log('🔵 Claude Generation Results:');
    console.log('  - Generated text length:', generatedText.length);
    console.log('  - Tokens used:', tokensUsed);
    console.log('  - Estimated cost: $', estimatedCost);

    return {
      content: generatedText,
      tokens_used: tokensUsed,
      input_tokens: inputTokens,
      estimated_cost: estimatedCost,
      provider: 'claude',
      model: model
    };
  }

}

export default AIProviderService;
