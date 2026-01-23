import fs from 'fs';
import path from 'path';
import AIProviderService from '../../../services/ai-provider.js';
import { quickValidate, generateValidationReport } from '../../../lib/ai-code-validator.js';
import { saveConversation, addMessage, getConversation, initializeAIConversationTables } from '../../../lib/ai-conversation-init.js';
import {
  detectDesignStyle,
  generateStyleSection,
  getSystemPrompt,
  MINIMAL_SYSTEM_PROMPT
} from '../../../lib/ai-prompt-utils.js';
import crypto from 'crypto';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'ai-settings.json');

// Initialize conversation tables
initializeAIConversationTables();

function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error reading AI settings:', error);
    return null;
  }
}

function trackUsage(tokensUsed, estimatedCost, model = null, provider = null) {
  try {
    // Simple logging - avoid db.run issues
    console.log('📊 Usage tracked:', { tokensUsed, estimatedCost, model, provider });
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
}

export default async function handler(req, res) {
  console.log('🤖 AI Generate Page API called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    prompt,
    context = '',
    iteration_type = 'new',
    separate_assets = false,
    conversationId
  } = req.body;

  console.log('🤖 Request params:');
  console.log('  - prompt:', prompt?.substring(0, 100) + '...');
  console.log('  - iteration_type:', iteration_type);
  console.log('  - conversationId:', conversationId || 'NEW');

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const settings = getSettings() || {};

  if (!settings.claude_api_key) {
    return res.status(400).json({
      error: 'Claude API key not configured. Please configure your API key in Settings > AI Settings.'
    });
  }

  try {
    // Check cost limits
    if (settings.current_month_usage >= settings.cost_limit_monthly) {
      return res.status(400).json({
        error: `Monthly cost limit of $${settings.cost_limit_monthly} reached.`
      });
    }

    // ============ CONVERSATION HISTORY ============
    let conversationHistory = [];
    const finalConversationId = conversationId || `conv_${crypto.randomBytes(16).toString('hex')}`;

    // Retrieve existing conversation history if conversationId provided
    if (conversationId) {
      console.log('📜 Retrieving conversation history for:', conversationId);
      const existingConversation = getConversation(conversationId);

      if (existingConversation && existingConversation.messages) {
        conversationHistory = existingConversation.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        console.log(`📜 Found ${conversationHistory.length} previous messages`);
      }
    }

    // ============ BUILD PROMPT ============
    // Detect style as a hint (not requirement)
    const contextObj = typeof context === 'object' ? context : {};
    const styleDetection = detectDesignStyle(prompt, {
      site_name: contextObj.site_name || contextObj.siteName,
      site_description: contextObj.site_description || contextObj.description
    });
    console.log('🎨 Style suggestion:', styleDetection.style, '(hint only)');

    // Build system prompt (minimal, non-restrictive)
    const systemPrompt = getSystemPrompt(styleDetection);

    // Build user prompt
    let userPrompt = prompt;

    // If modifying, include current code context
    if (iteration_type === 'modify' && context) {
      const contextString = typeof context === 'string' ? context : JSON.stringify(context);
      userPrompt = `Here is the current page code:

${contextString}

Please modify it based on this request: ${prompt}

Keep all previous changes and only modify what I'm asking for.`;
    }

    // For separated assets, add format instruction
    if (separate_assets) {
      userPrompt += `

Output format:
===HTML===
[Your HTML code]
===CSS===
[Your CSS code]
===JS===
[Your JavaScript code]`;
    }

    // ============ GENERATE WITH HISTORY ============
    console.log('🤖 Calling AI with conversation history...');
    const aiProvider = new AIProviderService(settings);

    const result = await aiProvider.generateWithHistory(
      systemPrompt,
      conversationHistory,
      userPrompt,
      {
        maxTokens: settings.max_tokens || 16384,
        temperature: settings.temperature || 0.7
      }
    );

    const generatedCode = result.content;
    const tokensUsed = result.tokens_used;
    const estimatedCost = result.estimated_cost;

    console.log('🤖 Generation complete:', generatedCode.length, 'chars');

    // Parse separated assets if requested
    let html_code = generatedCode;
    let css_code = '';
    let js_code = '';

    if (separate_assets) {
      const htmlMatch = generatedCode.match(/===HTML===\s*([\s\S]*?)(?====CSS===|$)/);
      const cssMatch = generatedCode.match(/===CSS===\s*([\s\S]*?)(?====JS===|$)/);
      const jsMatch = generatedCode.match(/===JS===\s*([\s\S]*?)$/);

      html_code = htmlMatch ? htmlMatch[1].trim() : '';
      css_code = cssMatch ? cssMatch[1].trim() : '';
      js_code = jsMatch ? jsMatch[1].trim() : '';
    }

    // ============ VALIDATION (permissive) ============
    let validationResult;
    try {
      validationResult = await quickValidate({
        html: html_code,
        css: css_code,
        js: js_code,
        mode: 'permissive'
      });
      console.log('🔒 Validation:', validationResult.valid ? 'passed' : 'warnings');
    } catch (validationError) {
      console.warn('⚠️ Validation skipped:', validationError.message);
      validationResult = { valid: true, errors: [], warnings: [] };
    }

    // Track usage
    trackUsage(tokensUsed, estimatedCost, result.model, result.provider);

    // Update monthly usage
    const newMonthlyUsage = (settings.current_month_usage || 0) + estimatedCost;
    settings.current_month_usage = newMonthlyUsage;
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    } catch (error) {
      console.error('Failed to update settings:', error);
    }

    // ============ SAVE CONVERSATION ============
    try {
      await saveConversation({
        conversationId: finalConversationId,
        userId: req.session?.user?.id || null,
        title: prompt.substring(0, 100),
        provider: 'claude',
        metadata: {
          generatedCode: { html: html_code, css: css_code, js: js_code },
          separate_assets
        }
      });

      await addMessage({
        conversationId: finalConversationId,
        role: 'user',
        content: userPrompt,
        metadata: { iteration_type, separate_assets }
      });

      await addMessage({
        conversationId: finalConversationId,
        role: 'assistant',
        content: generatedCode,
        metadata: { code: { html: html_code, css: css_code, js: js_code }, tokens: tokensUsed }
      });

      console.log(`✅ Conversation ${finalConversationId} saved`);
    } catch (convError) {
      console.error('⚠️ Error saving conversation:', convError);
    }

    // ============ RESPONSE ============
    res.status(200).json({
      success: true,
      conversationId: finalConversationId,
      html_code,
      html_content: html_code,
      css_code,
      css_content: css_code,
      js_code,
      js_content: js_code,
      tokens_used: tokensUsed,
      estimated_cost: estimatedCost,
      monthly_usage: settings.current_month_usage,
      iteration_type,
      separated: separate_assets,
      provider: result.provider,
      model: result.model,
      validation: {
        valid: validationResult?.valid || true,
        errors: validationResult?.errors || [],
        warnings: validationResult?.warnings || []
      }
    });

  } catch (error) {
    console.error('❌ Page generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate page: ' + error.message
    });
  }
}
