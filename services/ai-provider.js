/**
 * Claude AI Provider Service
 * Uses Anthropic's Claude API for all AI generation
 */

import fetch from 'node-fetch';

class AIProviderService {
  constructor(settings) {
    this.settings = settings;
  }

  /**
   * Generate content using Claude API
   */
  async generate(prompt, options = {}) {
    console.log('🤖 Using AI provider: Claude');
    return await this.generateWithClaude(prompt, options);
  }

  /**
   * Anthropic Claude API
   */
  async generateWithClaude(prompt, options = {}) {
    const apiKey = this.settings.claude_api_key;
    if (!apiKey) {
      throw new Error('Claude API key not configured. Please configure your API key in Settings > AI Settings.');
    }

    // Mask API key for logging (show first 10 + last 4 chars)
    const maskedKey = apiKey ? `${apiKey.substring(0, 10)}...${apiKey.slice(-4)}` : 'NOT SET';
    console.log('🔑 API Key (masked):', maskedKey);

    const model = this.settings.claude_model || 'claude-sonnet-4-5-20250929';
    const maxTokens = options.maxTokens || this.settings.max_tokens || 16384;
    const temperature = options.temperature !== undefined ? options.temperature : (this.settings.temperature || 0.7);

    console.log('🔵 Claude API Request:');
    console.log('  - Model:', model);
    console.log('  - Max tokens:', maxTokens);
    console.log('  - Temperature:', temperature);

    // Log the prompt being sent
    console.log('📤 PROMPT SENT TO CLAUDE:');
    console.log('='.repeat(80));
    console.log(prompt.length > 2000 ? prompt.substring(0, 2000) + '\n... [TRUNCATED IN LOG - full length: ' + prompt.length + ' chars]' : prompt);
    console.log('='.repeat(80));

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
    const stopReason = data.stop_reason || 'unknown';

    // Claude pricing (approximate for Sonnet)
    const estimatedCost = (tokensUsed / 1000) * 0.015;

    // Detailed response logging
    console.log('📥 RESPONSE FROM CLAUDE:');
    console.log('='.repeat(80));
    console.log('  - Stop reason:', stopReason);
    console.log('  - Input tokens:', inputTokens);
    console.log('  - Output tokens:', tokensUsed);
    console.log('  - Max tokens limit:', maxTokens);

    if (stopReason === 'max_tokens') {
      console.warn('⚠️ WARNING: Response was TRUNCATED - hit max_tokens limit!');
      console.warn('⚠️ The generated code may be incomplete. Consider increasing max_tokens.');
    }

    console.log('📄 Generated content preview (first 1000 chars):');
    console.log(generatedText.substring(0, 1000));
    console.log('...');
    console.log('📄 Generated content end (last 500 chars):');
    console.log(generatedText.substring(generatedText.length - 500));
    console.log('='.repeat(80));

    console.log('🔵 Claude Generation Summary:');
    console.log('  - Generated text length:', generatedText.length, 'characters');
    console.log('  - Tokens used:', tokensUsed);
    console.log('  - Estimated cost: $', estimatedCost.toFixed(4));

    return {
      content: generatedText,
      tokens_used: tokensUsed,
      input_tokens: inputTokens,
      estimated_cost: estimatedCost,
      provider: 'claude',
      model: model
    };
  }

  /**
   * Generate content with full conversation history
   * @param {string} systemPrompt - System instructions
   * @param {Array} conversationHistory - Array of {role, content} messages
   * @param {string} userPrompt - Current user message
   * @param {Object} options - Generation options
   */
  async generateWithHistory(systemPrompt, conversationHistory = [], userPrompt, options = {}) {
    const apiKey = this.settings.claude_api_key;
    if (!apiKey) {
      throw new Error('Claude API key not configured. Please configure your API key in Settings > AI Settings.');
    }

    const maskedKey = apiKey ? `${apiKey.substring(0, 10)}...${apiKey.slice(-4)}` : 'NOT SET';
    console.log('🔑 API Key (masked):', maskedKey);

    const model = this.settings.claude_model || 'claude-sonnet-4-5-20250929';
    const maxTokens = options.maxTokens || this.settings.max_tokens || 16384;
    const temperature = options.temperature !== undefined ? options.temperature : (this.settings.temperature || 0.7);

    // Build messages array for Claude
    const messages = [];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      console.log(`📜 Including ${conversationHistory.length} previous messages in conversation`);
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      });
    }

    // Add current user prompt
    messages.push({
      role: 'user',
      content: userPrompt
    });

    console.log('🔵 Claude API Request (with history):');
    console.log('  - Model:', model);
    console.log('  - Max tokens:', maxTokens);
    console.log('  - Temperature:', temperature);
    console.log('  - Message count:', messages.length);
    console.log('📤 CURRENT PROMPT:');
    console.log('='.repeat(80));
    console.log(userPrompt.length > 1500 ? userPrompt.substring(0, 1500) + '\n... [TRUNCATED]' : userPrompt);
    console.log('='.repeat(80));

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
        system: systemPrompt,
        messages: messages
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
    const stopReason = data.stop_reason || 'unknown';

    const estimatedCost = (tokensUsed / 1000) * 0.015;

    console.log('📥 RESPONSE FROM CLAUDE:');
    console.log('='.repeat(80));
    console.log('  - Stop reason:', stopReason);
    console.log('  - Input tokens:', inputTokens);
    console.log('  - Output tokens:', tokensUsed);

    if (stopReason === 'max_tokens') {
      console.warn('⚠️ WARNING: Response was TRUNCATED - hit max_tokens limit!');
    }

    console.log('📄 Generated content preview (first 1000 chars):');
    console.log(generatedText.substring(0, 1000));
    console.log('='.repeat(80));

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
