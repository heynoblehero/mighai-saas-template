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
import { generateThemePromptSection } from '../../../utils/theme-context-builder.js';
import db from '../../../lib/database.js';
import crypto from 'crypto';

/**
 * Load site settings (colors, fonts) from database
 */
async function getSiteSettings() {
  try {
    const settings = await db.get(`
      SELECT primary_color, secondary_color, font_family
      FROM support_chat_settings
      LIMIT 1
    `);
    return settings || {};
  } catch (error) {
    console.log('Could not load site settings, using defaults');
    return {};
  }
}

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

// Pages with complete design freedom - only require login/signup links
const DESIGN_FREEDOM_PAGES = ['landing-page', 'pricing-page', 'about-page', 'blog-homepage'];

// Pages with flexible styling but must keep forms and API calls working
const FLEXIBLE_STYLING_PAGES = ['customer-login', 'customer-signup', 'password-reset', 'contact-page'];

/**
 * Generate system prompt for reserved pages
 * Handles different flexibility levels based on page type
 * Now includes mandatory theme context for consistency
 */
function generateSystemPrompt(pageType, rules, aiContext, siteSettings = {}) {
  const pageRules = rules[pageType];
  if (!pageRules) return MINIMAL_SYSTEM_PROMPT;

  const routes = aiContext.routes || {};
  const apis = aiContext.api_endpoints || {};

  // Get the theme prompt section for consistent styling
  const themeSection = generateThemePromptSection(siteSettings);

  // Full design freedom pages - only require login/signup links
  if (DESIGN_FREEDOM_PAGES.includes(pageType)) {
    let apiNote = '';
    if (pageRules.required_functionality?.length > 0) {
      const func = pageRules.required_functionality[0];
      apiNote = `\n\n## API INTEGRATION (if applicable):
- Fetch data from: ${func.api_endpoint || 'N/A'}
- Display the data creatively in your design`;
    }

    return `You are an expert web developer creating a ${pageRules.name} for a SaaS product.

${themeSection}

## LAYOUT FREEDOM
You have creative freedom for the LAYOUT and STRUCTURE. Create any sections, animations, and arrangements.
However, you MUST use the colors and fonts defined in the REQUIRED DESIGN SYSTEM above.
${apiNote}

## REQUIRED LINKS (must include somewhere on the page):
1. A link to the login page: href="/subscribe/login" (for existing customers)
2. A link to the signup page: href="/subscribe/signup" (for new customers)

These can be styled as buttons, nav links, CTAs, or any other element.

## AVAILABLE ROUTES:
${routes.route_mappings ? Object.entries(routes.route_mappings).map(([key, route]) => `- "${key}" → "${route}"`).join('\n') : ''}

## OUTPUT FORMAT:
Generate a complete HTML document with:
- <!DOCTYPE html>
- Tailwind CSS CDN
- Required font import from design system
- CSS variables from design system
- The two required links (login and signup)
- Responsive design
- Creative layout using ONLY the theme colors

## DO NOT INCLUDE (already handled globally):
- Analytics tracking
- Heatmap tracking
- Support chat widget

Follow the user's creative direction for LAYOUT while using the REQUIRED theme colors/fonts. No markdown code blocks - just HTML.`;
  }

  // Flexible styling pages - keep forms/APIs but allow creative design
  if (FLEXIBLE_STYLING_PAGES.includes(pageType)) {
    let formFields = '';
    pageRules.required_elements?.forEach(element => {
      if (element.type === 'input' || element.type === 'textarea') {
        formFields += `\n- ${element.type}: name="${element.name}" (${element.input_type || 'text'}) - ${element.description}`;
      }
    });

    let apiCalls = '';
    pageRules.required_functionality?.forEach(func => {
      if (func.api_endpoint) {
        apiCalls += `\n- ${func.name}(): ${func.method} ${func.api_endpoint}`;
        if (func.required_fields) apiCalls += ` (fields: ${func.required_fields.join(', ')})`;
        if (func.success_redirect) apiCalls += ` → redirect to ${func.success_redirect}`;
      }
    });

    return `You are an expert web developer creating a ${pageRules.name} for a SaaS product.

${themeSection}

## LAYOUT FREEDOM
You have COMPLETE FREEDOM for the layout structure, animations, and arrangement.
However, you MUST use the colors and fonts defined in the REQUIRED DESIGN SYSTEM above.

## FUNCTIONAL REQUIREMENTS (must work correctly):
The page must include a working form with these fields:${formFields}

## API INTEGRATION (must implement):${apiCalls}

## LINKS TO INCLUDE:
${pageRules.required_elements?.filter(el => el.type === 'link').map(el => `- Link to: ${el.href}`).join('\n') || '- Link to /subscribe/login or /subscribe/signup as appropriate'}

## AVAILABLE ROUTES:
${routes.route_mappings ? Object.entries(routes.route_mappings).map(([key, route]) => `- "${key}" → "${route}"`).join('\n') : ''}

## OUTPUT FORMAT:
Generate a complete HTML document with:
- <!DOCTYPE html>
- Tailwind CSS CDN
- Required font import from design system
- CSS variables from design system
- Working form with proper API integration
- Loading states and error handling
- Responsive design
- Creative layout using ONLY the theme colors

## DO NOT INCLUDE (already handled globally):
- Analytics tracking
- Heatmap tracking
- Support chat widget

Creative layout freedom, but use the REQUIRED theme colors/fonts. No markdown code blocks - just HTML.`;
  }

  // Standard handling for other page types (dashboard pages, etc.)
  let systemPrompt = `You are an expert web developer creating a ${pageRules.name}.

${themeSection}

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
- Required font import from design system
- CSS variables from design system
- All required elements and functions
- Responsive design
- Use ONLY the theme colors defined above

## DO NOT INCLUDE (already global):
- Analytics tracking
- Heatmap tracking
- Support chat widget

Use the REQUIRED theme colors/fonts from the design system. No markdown code blocks - just HTML.`;

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
    // Load site settings for consistent theming
    const siteSettings = await getSiteSettings();
    console.log('🎨 Site settings loaded:', siteSettings.primary_color || 'default', siteSettings.font_family || 'default');

    // System prompt with page requirements and theme context
    const systemPrompt = generateSystemPrompt(pageType, rules, aiContext, siteSettings);

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
