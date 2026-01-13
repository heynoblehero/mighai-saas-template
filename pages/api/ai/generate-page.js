import fs from 'fs';
import path from 'path';
import AIProviderService from '../../../services/ai-provider.js';
import { quickValidate, generateValidationReport } from '../../../lib/ai-code-validator.js';
import { saveConversation, addMessage, initializeAIConversationTables } from '../../../lib/ai-conversation-init.js';
import { getAIPromptInstructions } from '../../../lib/frontend-features-injector.js';
import crypto from 'crypto';
import db from '../../../lib/database';

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
    const month = new Date().toISOString().slice(0, 7);

    db.run(`INSERT INTO ai_usage_logs (tokens_used, estimated_cost, usage_type, model, provider, month)
            VALUES (?, ?, ?, ?, ?, ?)`,
      [tokensUsed, estimatedCost, 'page-generation', model, provider, month],
      function(err) {
        if (err) {
          console.error('Error tracking usage in database:', err);
        } else {
          console.log('✅ Usage tracked in database with ID:', this.lastID);
        }
      });
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
}

const PAGE_GENERATION_PROMPT = `You are an elite web developer creating pages for a SaaS platform. Generate a COMPLETE, PRODUCTION-READY web page that matches our design system EXACTLY.

═══════════════════════════════════════════════════════════════════════
                    MANDATORY DESIGN SYSTEM (USE THESE EXACT VALUES)
═══════════════════════════════════════════════════════════════════════

🎨 COLOR PALETTE (DARK THEME WITH EMERALD ACCENTS):
• Primary/Accent: #00d084 (emerald green)
• Primary Hover: #00b372
• Background: #111111 (page), #1a1a1a (surfaces/cards)
• Surface Subdued: #2a2a2a
• Text Primary: #f0f0f0
• Text Secondary: #b5b5b5
• Text Subdued: #8a8a8a
• Borders: #303030
• Success: #00d084 | Warning: #f59e0b | Error: #ff6d6d | Info: #3b82f6

📝 TYPOGRAPHY:
• Font: Inter (include: <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">)
• Sizes: 12px(xs), 14px(sm), 16px(base), 20px(lg), 24px(xl), 32px(2xl), 40px(3xl), 48px(4xl)
• Weights: 400(normal), 500(medium), 600(semibold), 700(bold)

📏 SPACING (8px BASE SCALE):
4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px

🔲 BORDER RADIUS:
• Buttons/Inputs: 6px
• Cards: 12px
• Modals: 16px
• Badges: 9999px (pill)

🌟 SHADOWS (DARK-OPTIMIZED):
• Cards: 0 0 0 1px rgba(255,255,255,0.05), 0 1px 3px 0 rgba(0,0,0,0.4)
• Elevated: 0 0 0 1px rgba(255,255,255,0.05), 0 10px 15px -3px rgba(0,0,0,0.5)

═══════════════════════════════════════════════════════════════════════
                              COMPONENT PATTERNS
═══════════════════════════════════════════════════════════════════════

BUTTONS:
• Primary: bg #00d084, text white, hover #00b372
• Secondary: bg #2a2a2a, border #404040, text #f0f0f0, hover bg #303030
• Ghost: transparent, text #b5b5b5, hover bg rgba(255,255,255,0.1)

CARDS:
• Background: #1a1a1a, border: 1px solid #303030, border-radius: 12px
• Padding: 24px (1.5rem)
• Hover effect: transform translateY(-4px), shadow-lg

INPUTS:
• Background: #1a1a1a, border: #303030, border-radius: 6px
• Focus: border #00d084, ring 2px rgba(0,208,132,0.3)
• Placeholder: #6a6a6a

BADGES:
• Success: bg rgba(0,208,132,0.15), text #00d084
• Warning: bg rgba(245,158,11,0.15), text #f59e0b
• Error: bg rgba(255,109,109,0.15), text #ff6d6d

═══════════════════════════════════════════════════════════════════════

🚫 CRITICAL - DO NOT ADD (ALREADY GLOBAL):
• Analytics tracking code (/analytics.js is auto-loaded)
• Heatmap tracking (/heatmap.js is auto-loaded)
• Chat widgets (SupportWidget is global)
• These are injected at app level - NEVER duplicate!

📋 REQUIREMENTS:
✓ Complete HTML with inline <style> and <script> tags
✓ Semantic HTML5 (header, nav, main, section, footer)
✓ WCAG 2.1 accessible (ARIA labels, 4.5:1 contrast)
✓ Fully responsive (mobile-first): 640px, 768px, 1024px, 1280px
✓ Smooth 200ms transitions, hover effects, scroll animations
✓ Use CSS variables for colors
✓ Wrap JS in DOMContentLoaded

🎯 USER REQUEST: {userPrompt}

📝 CONTEXT: {context}

Generate ONLY complete HTML code (no markdown). Include all CSS in <style> and JS in <script>. Make it stunning and production-ready!`;

const SEPARATED_GENERATION_PROMPT = `You are an elite web developer creating pages for a SaaS platform. Generate SEPARATED HTML, CSS, and JavaScript that matches our design system EXACTLY.

═══════════════════════════════════════════════════════════════════════
                           OUTPUT FORMAT (MANDATORY)
═══════════════════════════════════════════════════════════════════════

===HTML===
[Clean semantic HTML - NO <style> or <script> tags]
===CSS===
[All styles - use CSS variables]
===JS===
[JavaScript wrapped in DOMContentLoaded, or empty if not needed]

═══════════════════════════════════════════════════════════════════════
                    MANDATORY DESIGN SYSTEM (USE EXACTLY)
═══════════════════════════════════════════════════════════════════════

🎨 COLOR PALETTE (DARK THEME WITH EMERALD ACCENTS):
--color-primary: #00d084;
--color-primary-hover: #00b372;
--color-bg: #111111;
--color-surface: #1a1a1a;
--color-surface-subdued: #2a2a2a;
--color-text: #f0f0f0;
--color-text-secondary: #b5b5b5;
--color-text-subdued: #8a8a8a;
--color-border: #303030;
--color-success: #00d084;
--color-warning: #f59e0b;
--color-error: #ff6d6d;
--color-info: #3b82f6;

📝 TYPOGRAPHY:
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
Font sizes: 0.75rem(xs), 0.875rem(sm), 1rem(base), 1.25rem(lg), 1.5rem(xl), 2rem(2xl), 2.5rem(3xl)
Include Google Font: <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

📏 SPACING: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px

🔲 BORDER RADIUS:
--radius-sm: 4px; --radius-base: 6px; --radius-lg: 12px; --radius-xl: 16px;

🌟 SHADOWS:
--shadow-card: 0 0 0 1px rgba(255,255,255,0.05), 0 1px 3px 0 rgba(0,0,0,0.4);
--shadow-elevated: 0 0 0 1px rgba(255,255,255,0.05), 0 10px 15px -3px rgba(0,0,0,0.5);

═══════════════════════════════════════════════════════════════════════
                              COMPONENT PATTERNS
═══════════════════════════════════════════════════════════════════════

BUTTONS:
.btn-primary { background: var(--color-primary); color: white; border-radius: 6px; padding: 0.75rem 1.5rem; }
.btn-primary:hover { background: var(--color-primary-hover); }
.btn-secondary { background: var(--color-surface-subdued); border: 1px solid var(--color-border); color: var(--color-text); }

CARDS:
.card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 1.5rem; }
.card:hover { transform: translateY(-4px); box-shadow: var(--shadow-elevated); }

INPUTS:
input, textarea { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 6px; padding: 0.75rem 1rem; color: var(--color-text); }
input:focus { border-color: var(--color-primary); outline: none; box-shadow: 0 0 0 3px rgba(0,208,132,0.2); }

HERO SECTIONS:
.hero { min-height: 80vh; background: linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%); }

GLASS EFFECT:
.glass { background: rgba(26, 26, 26, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }

═══════════════════════════════════════════════════════════════════════

🚫 DO NOT ADD (ALREADY GLOBAL):
• Analytics (/analytics.js) • Heatmaps (/heatmap.js) • Chat widgets

📋 REQUIREMENTS:
✓ Semantic HTML5, WCAG 2.1 accessible
✓ Responsive: 640px, 768px, 1024px, 1280px breakpoints
✓ Smooth 200ms transitions, scroll animations
✓ CSS variables for all colors
✓ JS wrapped in: document.addEventListener('DOMContentLoaded', function() { ... });

🎯 USER REQUEST: {userPrompt}

📝 CONTEXT: {context}

Generate ONLY in ===HTML===, ===CSS===, ===JS=== format. Make it stunning!`;

export default async function handler(req, res) {
  console.log('🤖 AI Generate Page API called');
  console.log('🤖 Method:', req.method);
  console.log('🤖 Request body:', JSON.stringify(req.body, null, 2));
  
  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    prompt,
    context = '',
    iteration_type = 'new',
    separate_assets = false,
    // NEW: User-provided API key and provider
    userApiKey,
    provider: userProvider,
    conversationId
  } = req.body;

  console.log('🤖 Extracted params:');
  console.log('  - prompt:', prompt);
  console.log('  - context length:', typeof context === 'string' ? context?.length : JSON.stringify(context).length);
  console.log('  - iteration_type:', iteration_type);
  console.log('  - separate_assets:', separate_assets);
  console.log('  - userApiKey provided:', !!userApiKey);
  console.log('  - user provider:', userProvider);

  if (!prompt) {
    console.log('❌ Missing prompt');
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Determine which provider and key to use
  let provider, apiKey, usingUserKey = false;
  const settings = getSettings() || {};

  if (userApiKey && userProvider) {
    // User provided their own API key
    provider = userProvider;
    apiKey = userApiKey;
    usingUserKey = true;
    console.log(`🤖 Using user-provided ${provider} API key`);
  } else {
    // Fallback to server settings
    console.log('🤖 Loading AI settings from:', SETTINGS_FILE);

    if (!settings || Object.keys(settings).length === 0) {
      console.log('❌ AI settings not configured');
      return res.status(400).json({
        error: 'API key required. Please configure your AI provider key in the settings modal.'
      });
    }

    provider = settings.ai_provider || 'gemini';

    // Validate provider-specific API key (Claude and Gemini only)
    const providerKeys = {
      'gemini': 'gemini_api_key',
      'claude': 'claude_api_key'
    };

    const requiredKey = providerKeys[provider];
    if (!settings[requiredKey]) {
      console.log(`❌ ${provider} API key not configured`);
      return res.status(400).json({
        error: `API key required. Please configure your ${provider.toUpperCase()} API key in the settings modal.`
      });
    }

    apiKey = settings[requiredKey];
    console.log(`🤖 Using server ${provider} API key (fallback)`);
  }

  console.log('🤖 Using AI provider:', provider);
  console.log('🤖 Max tokens:', settings.max_tokens || 8192);
  console.log('🤖 Temperature:', settings.temperature || 0.7);

  try {
    // Check cost limits
    const currentMonth = new Date().toISOString().slice(0, 7);
    console.log('🤖 Cost check:');
    console.log('  - Current month:', currentMonth);
    console.log('  - Monthly usage: $', settings.current_month_usage);
    console.log('  - Cost limit: $', settings.cost_limit_monthly);
    
    if (settings.current_month_usage >= settings.cost_limit_monthly) {
      console.log('❌ Monthly cost limit exceeded');
      return res.status(400).json({ 
        error: `Monthly cost limit of $${settings.cost_limit_monthly} reached. Current usage: $${settings.current_month_usage}` 
      });
    }

    // Prepare the prompt based on iteration type and asset separation
    console.log('🤖 Preparing prompt for iteration type:', iteration_type);
    console.log('🤖 Separate assets requested:', separate_assets);

    let finalPrompt;
    let contextString = typeof context === 'string' ? context : JSON.stringify(context);

    if (separate_assets) {
      finalPrompt = SEPARATED_GENERATION_PROMPT
        .replace('{userPrompt}', prompt)
        .replace('{context}', contextString || 'None');

      if (iteration_type === 'modify' && context) {
        console.log('🤖 Using modification prompt with existing context (separated assets)');
        const htmlContext = typeof context === 'object' ? context.html || '' : context;
        const cssContext = typeof context === 'object' ? context.css || '' : '';
        const jsContext = typeof context === 'object' ? context.js || '' : '';

        finalPrompt = `You are modifying an existing web page with separated assets. Here is the current code:

CURRENT HTML:
${htmlContext}

CURRENT CSS:
${cssContext}

CURRENT JAVASCRIPT:
${jsContext}

USER MODIFICATION REQUEST: ${prompt}

Please modify the code according to the user's request. Return the updated code in this EXACT format:

===HTML===
[Updated HTML code]
===CSS===
[Updated CSS code]
===JS===
[Updated JavaScript code]`;
      }
    } else {
      finalPrompt = PAGE_GENERATION_PROMPT
        .replace('{userPrompt}', prompt)
        .replace('{context}', contextString);

      if (iteration_type === 'modify' && context) {
        console.log('🤖 Using modification prompt with existing context');
        finalPrompt = `You are modifying an existing web page. Here is the current HTML code:

${contextString}

USER MODIFICATION REQUEST: ${prompt}

Please modify the existing code according to the user's request. Maintain the overall structure but make the requested changes. Return the complete modified HTML code.

Generate ONLY the complete HTML code. Do not include markdown code blocks or explanations.`;
      }
    }
    
    console.log('🤖 Final prompt length:', finalPrompt.length);

    // Call AI provider service
    console.log('🤖 Calling AI provider service...');

    // Create settings object with user's provider and key if provided
    const providerSettings = {
      ...settings,
      ai_provider: provider,
      [`${provider}_api_key`]: apiKey,
      max_tokens: settings.max_tokens || 8192,
      temperature: settings.temperature || 0.7
    };

    const aiProvider = new AIProviderService(providerSettings);
    const result = await aiProvider.generate(finalPrompt, {
      maxTokens: providerSettings.max_tokens,
      temperature: providerSettings.temperature
    });

    const generatedCode = result.content;
    const tokensUsed = result.tokens_used;
    const estimatedCost = result.estimated_cost;

    console.log('🤖 Generation results:');
    console.log('  - Generated code length:', generatedCode.length);
    console.log('  - Tokens used:', tokensUsed);

    // Parse separated assets if requested
    let html_code = generatedCode;
    let css_code = '';
    let js_code = '';

    if (separate_assets) {
      console.log('🤖 Parsing separated assets...');
      const htmlMatch = generatedCode.match(/===HTML===\s*([\s\S]*?)(?====CSS===|$)/);
      const cssMatch = generatedCode.match(/===CSS===\s*([\s\S]*?)(?====JS===|$)/);
      const jsMatch = generatedCode.match(/===JS===\s*([\s\S]*?)$/);

      html_code = htmlMatch ? htmlMatch[1].trim() : '';
      css_code = cssMatch ? cssMatch[1].trim() : '';
      js_code = jsMatch ? jsMatch[1].trim() : '';

      console.log('  - HTML length:', html_code.length);
      console.log('  - CSS length:', css_code.length);
      console.log('  - JS length:', js_code.length);
    }

    console.log('  - Estimated cost: $', estimatedCost);
    console.log('  - Provider:', result.provider);

    // ============ VALIDATION PIPELINE ============
    console.log('🔒 Running validation pipeline...');
    let validationResult;
    try {
      validationResult = await quickValidate({
        html: html_code,
        css: css_code,
        js: js_code,
        mode: 'permissive' // Don't block deployment for minor issues
      });

      console.log('🔒 Validation complete:');
      console.log('  - Valid:', validationResult.valid);
      console.log('  - Errors:', validationResult.errors.length);
      console.log('  - Warnings:', validationResult.warnings.length);
      console.log('  - Processing time:', validationResult.processingTime + 'ms');

      // Use sanitized code instead of raw AI output
      if (validationResult.sanitizedCode) {
        html_code = validationResult.sanitizedCode.html || html_code;
        css_code = validationResult.sanitizedCode.css || css_code;
        js_code = validationResult.sanitizedCode.js || js_code;
        console.log('✅ Using sanitized code');
      }

      // Log validation report
      if (validationResult.errors.length > 0 || validationResult.warnings.length > 0) {
        const report = generateValidationReport(validationResult);
        console.log('\n' + report + '\n');
      }
    } catch (validationError) {
      console.error('⚠️ Validation error (non-blocking):', validationError.message);
      validationResult = {
        valid: true,
        errors: [],
        warnings: [`Validation skipped: ${validationError.message}`],
        sanitizedCode: { html: html_code, css: css_code, js: js_code }
      };
    }
    // ============================================

    // Track usage (only if using server key)
    if (!usingUserKey) {
      console.log('🤖 Tracking server usage...');
      trackUsage(tokensUsed, estimatedCost, result.model, result.provider);

      // Update monthly usage in settings
      const newMonthlyUsage = (settings.current_month_usage || 0) + estimatedCost;
      settings.current_month_usage = newMonthlyUsage;
      console.log('🤖 Updated monthly usage to: $', newMonthlyUsage);

      try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        console.log('✅ Settings file updated successfully');
      } catch (error) {
        console.error('❌ Failed to update settings file:', error);
      }
    }

    // ============ CONVERSATION PERSISTENCE ============
    const finalConversationId = conversationId || `conv_${crypto.randomBytes(16).toString('hex')}`;

    try {
      await saveConversation({
        conversationId: finalConversationId,
        userId: req.session?.user?.id || null,
        title: prompt.substring(0, 100),
        provider,
        metadata: {
          generatedCode: { html: html_code, css: css_code, js: js_code },
          validation: validationResult,
          separate_assets,
          usingUserKey
        }
      });

      await addMessage({
        conversationId: finalConversationId,
        role: 'user',
        content: prompt,
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
      console.error('⚠️ Error saving conversation (non-blocking):', convError);
    }
    // ================================================

    const responseData = {
      success: true,
      conversationId: finalConversationId,
      html_code: html_code,
      html_content: html_code,
      css_code: css_code,
      css_content: css_code,
      js_code: js_code,
      js_content: js_code,
      tokens_used: tokensUsed,
      estimated_cost: estimatedCost,
      monthly_usage: usingUserKey ? 0 : settings.current_month_usage,
      iteration_type,
      separated: separate_assets,
      provider: result.provider,
      model: result.model,
      usingUserKey,
      validation: {
        valid: validationResult?.valid || true,
        errors: validationResult?.errors || [],
        warnings: validationResult?.warnings || [],
        processingTime: validationResult?.processingTime || 0
      }
    };

    console.log('✅ Sending successful response');
    res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Page generation failed:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate page: ' + error.message 
    });
  }
}