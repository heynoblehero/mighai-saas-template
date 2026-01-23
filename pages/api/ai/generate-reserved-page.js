import fs from 'fs';
import path from 'path';
import { withAdminAuth } from '../../../lib/auth-middleware';
import AIProviderService from '../../../services/ai-provider.js';
import { quickValidate, generateValidationReport } from '../../../lib/ai-code-validator.js';
import { saveConversation, addMessage, getConversation, initializeAIConversationTables } from '../../../lib/ai-conversation-init.js';
import {
  detectDesignStyle,
  generateStyleSection,
  MINIMAL_SYSTEM_PROMPT
} from '../../../lib/ai-prompt-utils.js';
import crypto from 'crypto';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'ai-settings.json');
const RULES_FILE = path.join(process.cwd(), 'data', 'reserved-page-rules.json');
const CONTEXT_FILE = path.join(process.cwd(), 'data', 'ai-context.json');

// Initialize conversation tables
initializeAIConversationTables();

function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
    return null;
  } catch (error) {
    console.error('Error reading AI settings:', error);
    return null;
  }
}

function getRules() {
  try {
    if (fs.existsSync(RULES_FILE)) {
      return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
    }
    return {};
  } catch (error) {
    console.error('Error reading reserved page rules:', error);
    return {};
  }
}

function getContext() {
  try {
    if (fs.existsSync(CONTEXT_FILE)) {
      return JSON.parse(fs.readFileSync(CONTEXT_FILE, 'utf8'));
    }
    return {};
  } catch (error) {
    console.error('Error reading AI context:', error);
    return {};
  }
}

function trackUsage(tokensUsed, estimatedCost, model = null, provider = null) {
  console.log('📊 Usage tracked:', { tokensUsed, estimatedCost, model, provider });
}

/**
 * Ensure the generated HTML is complete with all required elements
 */
function ensureCompleteHTML(html, pageTitle = 'Page') {
  const hasDoctype = html.toLowerCase().includes('<!doctype html');
  const hasTailwindCDN = html.includes('cdn.tailwindcss.com');
  const hasStyleBlock = html.includes('<style');

  if (hasDoctype && hasTailwindCDN && hasStyleBlock) {
    return html;
  }

  console.log('⚠️ Generated HTML is incomplete, wrapping in proper structure...');

  let bodyContent = html;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    bodyContent = bodyMatch[1];
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root {
            --primary: #10B981;
            --secondary: #059669;
            --accent: #34D399;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
        }
    </style>
</head>
<body class="min-h-screen">
    ${bodyContent}
</body>
</html>`;
}

/**
 * Generate system prompt for reserved pages
 * Simplified - only includes essential requirements, not style restrictions
 */
function generateSystemPrompt(pageType, rules, aiContext) {
  const pageRules = rules[pageType];
  if (!pageRules) return MINIMAL_SYSTEM_PROMPT;

  const routes = aiContext.routes || {};
  const apis = aiContext.api_endpoints || {};

  let systemPrompt = `You are an expert web developer creating a ${pageRules.name}.

## Page Description:
${pageRules.description}

## REQUIRED HTML ELEMENTS (must include):`;

  pageRules.required_elements?.forEach(element => {
    systemPrompt += `\n- ${element.type.toUpperCase()}`;
    if (element.id) systemPrompt += ` id="${element.id}"`;
    if (element.name) systemPrompt += ` name="${element.name}"`;
    systemPrompt += `: ${element.description}`;
  });

  systemPrompt += `\n\n## AVAILABLE ROUTES:`;
  if (routes.route_mappings) {
    Object.entries(routes.route_mappings).forEach(([key, route]) => {
      systemPrompt += `\n- "${key}" → "${route}"`;
    });
  }

  systemPrompt += `\n\n## API ENDPOINTS:`;
  Object.entries(apis).forEach(([category, endpoints]) => {
    Object.entries(endpoints).forEach(([endpoint, config]) => {
      systemPrompt += `\n- ${config.method} ${endpoint}`;
      if (config.required_fields) systemPrompt += ` (fields: ${config.required_fields.join(', ')})`;
    });
  });

  systemPrompt += `\n\n## REQUIRED JAVASCRIPT FUNCTIONS:`;
  pageRules.required_functionality?.forEach(func => {
    systemPrompt += `\n- ${func.name}(): ${func.description}`;
    if (func.api_endpoint) systemPrompt += `\n  API: ${func.method} ${func.api_endpoint}`;
  });

  systemPrompt += `\n\n## OUTPUT FORMAT:
Generate a complete HTML document with:
- <!DOCTYPE html>
- Tailwind CSS CDN
- All required elements and functions
- Responsive design

## DO NOT INCLUDE (already global):
- Analytics tracking
- Heatmap tracking
- Support chat widget

Follow the user's creative direction for styling. No markdown code blocks - just HTML.`;

  return systemPrompt;
}

async function handler(req, res) {
  console.log('🏠 Reserved Page Generation API called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    pageType,
    prompt,
    context = '',
    iteration_type = 'new',
    layoutAnalysis,
    conversationId
  } = req.body;

  console.log('🏠 Request params:');
  console.log('  - pageType:', pageType);
  console.log('  - prompt:', prompt?.substring(0, 100) + '...');
  console.log('  - conversationId:', conversationId || 'NEW');

  if (!pageType || !prompt) {
    return res.status(400).json({ error: 'pageType and prompt are required' });
  }

  const settings = getSettings() || {};

  if (!settings.claude_api_key) {
    return res.status(400).json({
      error: 'Claude API key not configured. Please configure your API key in Settings > AI Settings.'
    });
  }

  const rules = getRules();
  const aiContext = getContext();

  if (!rules[pageType]) {
    return res.status(400).json({
      error: `Unknown page type: ${pageType}`,
      availableTypes: Object.keys(rules)
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

    // ============ BUILD PROMPTS ============
    // System prompt with page requirements (simplified)
    const systemPrompt = generateSystemPrompt(pageType, rules, aiContext);

    // Style hint (suggestion only)
    const styleDetection = detectDesignStyle(prompt, {
      site_name: aiContext.site_name,
      site_description: aiContext.site_description
    });
    const styleHint = generateStyleSection(styleDetection);
    console.log('🎨 Style suggestion:', styleDetection.style, '(hint only)');

    // Build user prompt
    let userPrompt = prompt;

    // Include layout analysis if provided
    if (layoutAnalysis) {
      userPrompt = `Layout reference from image:\n${layoutAnalysis}\n\nUser request: ${prompt}`;
    }

    // If modifying existing code, include it
    if (iteration_type === 'modify' && context) {
      userPrompt = `Here is the current page code:

${context}

Please modify it based on this request: ${prompt}

Keep all previous changes and only modify what I'm asking for.`;
    }

    // Add style hint at the end
    userPrompt += `\n\n${styleHint}`;

    // ============ GENERATE WITH HISTORY ============
    console.log('🏠 Calling AI with conversation history...');
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

    let generatedCode = result.content;
    const tokensUsed = result.tokens_used;
    const estimatedCost = result.estimated_cost;

    console.log('🏠 Generation complete:', generatedCode.length, 'chars');

    // Clean up markdown if present
    if (generatedCode.includes('```html')) {
      const match = generatedCode.match(/```html\n?([\s\S]*?)\n?```/);
      if (match) generatedCode = match[1];
    } else if (generatedCode.includes('```')) {
      const match = generatedCode.match(/```\n?([\s\S]*?)\n?```/);
      if (match) generatedCode = match[1];
    }

    // Ensure complete HTML structure
    const pageTitle = rules[pageType]?.name || 'Page';
    generatedCode = ensureCompleteHTML(generatedCode.trim(), pageTitle);

    // ============ VALIDATION (permissive) ============
    let validationResult;
    try {
      validationResult = await quickValidate({
        html: generatedCode,
        css: '',
        js: '',
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
        title: `${rules[pageType].name}: ${prompt.substring(0, 100)}`,
        provider: 'claude',
        metadata: {
          pageType,
          generatedCode,
          layoutAnalysis,
          iteration_type
        }
      });

      await addMessage({
        conversationId: finalConversationId,
        role: 'user',
        content: userPrompt,
        metadata: { pageType, iteration_type }
      });

      await addMessage({
        conversationId: finalConversationId,
        role: 'assistant',
        content: generatedCode,
        metadata: { code: { html: generatedCode }, tokens: tokensUsed }
      });

      console.log(`✅ Conversation ${finalConversationId} saved`);
    } catch (convError) {
      console.error('⚠️ Error saving conversation:', convError);
    }

    // ============ RESPONSE ============
    res.status(200).json({
      success: true,
      conversationId: finalConversationId,
      html_code: generatedCode,
      page_type: pageType,
      tokens_used: tokensUsed,
      estimated_cost: estimatedCost,
      monthly_usage: settings.current_month_usage,
      iteration_type,
      rules_applied: rules[pageType].name,
      provider: result.provider,
      model: result.model,
      validation: {
        valid: validationResult?.valid || true,
        errors: validationResult?.errors || [],
        warnings: validationResult?.warnings || []
      }
    });

  } catch (error) {
    console.error('❌ Reserved page generation failed:', error);

    if (error.status === 401 || error.message?.includes('invalid_api_key')) {
      return res.status(401).json({
        error: 'Invalid API key',
        details: 'Your API key is invalid or expired.',
        needsKeyReconfiguration: true
      });
    }

    if (error.status === 429 || error.message?.includes('quota')) {
      return res.status(429).json({
        error: 'API quota exceeded',
        details: 'Please try again later.',
        needsKeyReconfiguration: false
      });
    }

    res.status(500).json({
      error: 'Failed to generate reserved page: ' + error.message
    });
  }
}

export default withAdminAuth(handler);
