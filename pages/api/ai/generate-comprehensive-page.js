import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { quickValidate, generateValidationReport } from '../../../lib/ai-code-validator.js';
import { saveConversation, addMessage, initializeAIConversationTables } from '../../../lib/ai-conversation-init.js';
import { getAIPromptInstructions } from '../../../lib/frontend-features-injector.js';
import { fixGeneratedCode, removeAnalyticsDuplicates } from '../../../lib/post-generation-fixer.js';
import crypto from 'crypto';
import db from '../../../lib/database';

// Initialize conversation tables on first load
initializeAIConversationTables();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    userPrompt,
    layoutAnalysis,
    iteration_type = 'new',
    context,
    imagePath,
    // NEW: User-provided API key and provider
    userApiKey,
    provider = 'claude',
    conversationId
  } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: 'User prompt is required' });
  }

  try {
    // Load settings for model preferences
    const settingsPath = path.join(process.cwd(), 'data', 'ai-settings.json');
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }

    // Determine which API key to use (user's key or server's key)
    let apiKey;
    let usingUserKey = false;

    if (userApiKey) {
      // User provided their own API key
      apiKey = userApiKey;
      usingUserKey = true;
      console.log('[Comprehensive Page] Using user-provided Claude API key');
    } else {
      // Fallback to server settings (backward compatibility)
      if (!settings.claude_api_key) {
        return res.status(400).json({
          error: 'API key required. Please configure your Claude API key in the settings modal.'
        });
      }

      apiKey = settings.claude_api_key;
      console.log('[Comprehensive Page] Using server Claude API key (fallback)');
    }

    const anthropic = new Anthropic({ apiKey });

    // Prepare image data if provided
    let imageData = null;
    if (imagePath) {
      try {
        const fullImagePath = path.join(process.cwd(), 'public', imagePath.replace(/^\//, ''));
        if (fs.existsSync(fullImagePath)) {
          const imageBuffer = fs.readFileSync(fullImagePath);
          const imageBase64 = imageBuffer.toString('base64');
          const ext = path.extname(fullImagePath).toLowerCase();
          const mediaTypeMap = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
          };
          imageData = {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaTypeMap[ext] || 'image/jpeg',
              data: imageBase64
            }
          };
        }
      } catch (err) {
        console.error('Error loading image:', err);
      }
    }

    // Step 1: Planning Phase - AI thinks through the page structure
    console.log('🧠 Step 1: Planning page structure...');

    // Build planning message content
    const planningContent = [];
    if (imageData) {
      planningContent.push(imageData);
    }
    planningContent.push({
      type: 'text',
      text: `You are an expert web designer planning a page for a SaaS platform with a DARK THEME and EMERALD GREEN accents.

${imageData ? 'LAYOUT REFERENCE IMAGE: See the attached image for visual reference.\n\n' : ''}${layoutAnalysis ? `LAYOUT ANALYSIS:\n${layoutAnalysis}\n\n` : ''}

═══════════════════════════════════════════════════════════════════════
                         MANDATORY DESIGN SYSTEM
═══════════════════════════════════════════════════════════════════════

COLORS (MUST USE):
• Primary: #00d084 (emerald green) | Hover: #00b372
• Background: #111111 (page) | #1a1a1a (cards/surfaces) | #2a2a2a (subdued)
• Text: #f0f0f0 (primary) | #b5b5b5 (secondary) | #8a8a8a (subdued)
• Borders: #303030 | Status: success #00d084, warning #f59e0b, error #ff6d6d

TYPOGRAPHY:
• Font: Inter (Google Font)
• Sizes: 12px, 14px, 16px, 20px, 24px, 32px, 40px

SPACING: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
BORDER RADIUS: buttons 6px, cards 12px

═══════════════════════════════════════════════════════════════════════

USER REQUEST:
${userPrompt}

${iteration_type === 'modify' && context ? `CURRENT PAGE CONTEXT:\nHTML: ${context.html?.substring(0, 500)}...\nCSS: ${context.css?.substring(0, 500)}...\n\n` : ''}

Create a detailed plan following our dark theme design system:

1. **Page Purpose & Goal**
2. **Sections Needed** (Hero, Features, Testimonials, Pricing, CTA, Footer, etc.)
3. **How to apply the design system** (specific colors for each section)
4. **Key Interactions** (hover effects, animations, transitions - all using emerald green accent)
5. **Layout Structure** (responsive breakpoints: 640px, 768px, 1024px, 1280px)
6. **Special Features** (glassmorphism, gradients, parallax effects)

Be thorough - this plan guides the implementation!`
    });

    const planningResponse = await anthropic.messages.create({
      model: settings.claude_model || 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: planningContent
      }],
    });

    const plan = planningResponse.content[0].text;
    console.log('✅ Planning complete');

    // Step 2: Generation Phase - Create the actual code
    console.log('🎨 Step 2: Generating page code...');

    const generationPrompt = `You are an elite frontend developer. Based on the following plan, create a complete, production-ready web page.

PLAN:
${plan}

═══════════════════════════════════════════════════════════════════════
                    MANDATORY DESIGN SYSTEM - FOLLOW EXACTLY
═══════════════════════════════════════════════════════════════════════

🎨 COLOR PALETTE (DARK THEME WITH EMERALD ACCENTS):
├─ Primary/Accent: #00d084 (emerald green) | Hover: #00b372 | Glow: rgba(0,208,132,0.3)
├─ Backgrounds: #111111 (page) | #1a1a1a (cards/surfaces) | #2a2a2a (subdued)
├─ Text: #f0f0f0 (primary) | #b5b5b5 (secondary) | #8a8a8a (subdued)
├─ Borders: #303030 (default) | #404040 (hover) | #262626 (subtle)
└─ Status: success #00d084 | warning #f59e0b | error #ff6d6d | info #3b82f6

📝 TYPOGRAPHY:
├─ Font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
├─ Load from: https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap
├─ Sizes: 0.75rem (xs) | 0.875rem (sm) | 1rem (base) | 1.25rem (lg) | 1.5rem (xl) | 2rem (2xl) | 2.5rem (3xl) | 3rem (4xl)
└─ Weights: 300 light | 400 regular | 500 medium | 600 semibold | 700 bold

📐 SPACING & LAYOUT:
├─ Scale: 0.25rem | 0.5rem | 0.75rem | 1rem | 1.5rem | 2rem | 3rem | 4rem | 5rem
├─ Container: max-width 1280px, padding 1.5rem horizontal
├─ Section padding: 5rem vertical
└─ Card padding: 1.5rem

🔲 BORDER RADIUS:
├─ Small (inputs, chips): 6px
├─ Medium (buttons): 6px
├─ Large (cards, modals): 12px
└─ Full (avatars, pills): 9999px

🎭 EFFECTS & SHADOWS:
├─ Card shadow: 0 0 0 1px rgba(255,255,255,0.05), 0 1px 3px 0 rgba(0,0,0,0.4)
├─ Elevated shadow: 0 0 0 1px rgba(255,255,255,0.05), 0 10px 15px -3px rgba(0,0,0,0.5)
├─ Primary glow: 0 0 20px rgba(0, 208, 132, 0.3)
├─ Glassmorphism: background rgba(26,26,26,0.8), backdrop-filter blur(12px), border rgba(255,255,255,0.1)
└─ Hover lift: transform translateY(-4px)

⏱️ TRANSITIONS:
├─ Fast: 100ms ease (micro-interactions)
├─ Base: 200ms ease (most interactions)
└─ Slow: 300ms ease (reveals, modals)

📱 RESPONSIVE BREAKPOINTS:
├─ sm: 640px | md: 768px | lg: 1024px | xl: 1280px
└─ Use mobile-first approach (min-width media queries)

═══════════════════════════════════════════════════════════════════════

COMPONENT PATTERNS:

🔘 PRIMARY BUTTON:
background: #00d084; color: #fff; padding: 0.75rem 1.5rem;
border-radius: 6px; font-weight: 600; border: none;
hover: background #00b372, transform translateY(-1px);

🔘 SECONDARY BUTTON:
background: #2a2a2a; color: #f0f0f0; border: 1px solid #404040;
hover: background #303030;

📦 CARD:
background: #1a1a1a; border: 1px solid #303030; border-radius: 12px;
padding: 1.5rem; box-shadow: 0 0 0 1px rgba(255,255,255,0.05), 0 1px 3px 0 rgba(0,0,0,0.4);

📝 INPUT:
background: #1a1a1a; border: 1px solid #303030; border-radius: 6px;
padding: 0.75rem 1rem; color: #f0f0f0;
focus: border-color #00d084, outline none, box-shadow 0 0 0 3px rgba(0,208,132,0.1);

🏷️ BADGE:
padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500;
success: bg rgba(0,208,132,0.15), color #00d084, border rgba(0,208,132,0.3);
warning: bg rgba(245,158,11,0.15), color #f59e0b;
error: bg rgba(255,109,109,0.15), color #ff6d6d;

═══════════════════════════════════════════════════════════════════════

🚫 CRITICAL - DO NOT ADD (ALREADY GLOBAL VIA _app.js):
• Analytics tracking (/analytics.js) - window.Analytics handles page views, clicks, forms
• Heatmap recording (/heatmap.js) - window.HeatmapIntegration records all interactions
• Chat widget (SupportWidget component) - already rendered on all pages
• Do NOT create custom tracking, duplicate analytics, or conflicting floating buttons

═══════════════════════════════════════════════════════════════════════

REQUIREMENTS:
1. Generate complete, semantic HTML5
2. Follow the design system EXACTLY - use the colors, typography, and patterns above
3. Create responsive layouts (mobile-first)
4. Add smooth animations and hover effects
5. Include all sections from the plan
6. Ensure accessibility (ARIA labels, proper headings, focus states)
7. Use CSS variables for theming consistency

CSS VARIABLE SETUP (include in your CSS):
:root {
  --color-primary: #00d084;
  --color-primary-hover: #00b372;
  --color-bg: #111111;
  --color-surface: #1a1a1a;
  --color-surface-subdued: #2a2a2a;
  --color-text: #f0f0f0;
  --color-text-secondary: #b5b5b5;
  --color-border: #303030;
  --font-family: 'Inter', -apple-system, sans-serif;
  --radius-base: 6px;
  --radius-lg: 12px;
  --transition: 200ms ease;
}

IMPORTANT OUTPUT FORMAT:
Your response must contain THREE code blocks in this EXACT format:

\`\`\`html
<!-- Complete HTML here -->
\`\`\`

\`\`\`css
/* Complete CSS here - include :root variables */
\`\`\`

\`\`\`javascript
// Complete JavaScript here (if needed)
\`\`\`

Generate a complete, beautiful, theme-consistent page now!`;

    const generationResponse = await anthropic.messages.create({
      model: settings.claude_model || 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: generationPrompt
      }],
    });

    const generatedCode = generationResponse.content[0].text;

    // Parse the generated code blocks
    const htmlMatch = generatedCode.match(/```html\n([\s\S]*?)```/);
    const cssMatch = generatedCode.match(/```css\n([\s\S]*?)```/);
    const jsMatch = generatedCode.match(/```javascript\n([\s\S]*?)```/);

    let html = htmlMatch ? htmlMatch[1].trim() : '';
    let css = cssMatch ? cssMatch[1].trim() : '';
    let js = jsMatch ? jsMatch[1].trim() : '';

    if (!html && !css) {
      throw new Error('Failed to extract code from AI response');
    }

    // ============ POST-GENERATION FIXES ============
    console.log('🔧 Applying post-generation fixes...');
    const fixResult = fixGeneratedCode({ html, css, js });
    html = fixResult.html;
    css = fixResult.css;
    js = fixResult.js;

    if (fixResult.appliedFixes.length > 0) {
      console.log(`✅ Applied ${fixResult.appliedFixes.length} fixes:`, fixResult.appliedFixes);
    }

    // Remove duplicate analytics code
    const cleanedCode = removeAnalyticsDuplicates({ html, js });
    html = cleanedCode.html;
    js = cleanedCode.js;
    // =============================================

    // ============ VALIDATION PIPELINE ============
    console.log('🔒 Running validation pipeline for comprehensive page...');
    let validationResult;
    try {
      validationResult = await quickValidate({
        html: html,
        css: css,
        js: js,
        mode: 'permissive'
      });

      console.log('🔒 Validation complete:');
      console.log('  - Valid:', validationResult.valid);
      console.log('  - Errors:', validationResult.errors.length);
      console.log('  - Warnings:', validationResult.warnings.length);
      console.log('  - Processing time:', validationResult.processingTime + 'ms');

      // Use sanitized code
      if (validationResult.sanitizedCode) {
        html = validationResult.sanitizedCode.html || html;
        css = validationResult.sanitizedCode.css || css;
        js = validationResult.sanitizedCode.js || js;
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
        sanitizedCode: { html, css, js }
      };
    }
    // ============================================

    // Update AI usage (only if using server key)
    const totalUsage = {
      input_tokens: planningResponse.usage.input_tokens + generationResponse.usage.input_tokens,
      output_tokens: planningResponse.usage.output_tokens + generationResponse.usage.output_tokens,
    };

    if (!usingUserKey) {
      // Only track server usage, not user's usage
      updateAIUsage(settings, totalUsage);
    }

    // ============ CONVERSATION PERSISTENCE ============
    // Generate or use provided conversation ID
    const finalConversationId = conversationId || `conv_${crypto.randomBytes(16).toString('hex')}`;

    // Save conversation to database
    try {
      await saveConversation({
        conversationId: finalConversationId,
        userId: req.session?.user?.id || null,
        title: userPrompt.substring(0, 100), // Use first 100 chars of prompt as title
        provider: 'claude',
        metadata: {
          plan: plan,
          generatedCode: { html, css, js },
          validation: validationResult,
          layoutAnalysis,
          usingUserKey
        }
      });

      // Add user message
      await addMessage({
        conversationId: finalConversationId,
        role: 'user',
        content: userPrompt,
        metadata: { imagePath, iteration_type }
      });

      // Add assistant message
      await addMessage({
        conversationId: finalConversationId,
        role: 'assistant',
        content: generationResponse.content[0].text,
        metadata: {
          plan,
          code: { html, css, js },
          tokens: totalUsage
        }
      });

      console.log(`✅ Conversation ${finalConversationId} saved to database`);
    } catch (convError) {
      console.error('⚠️ Error saving conversation (non-blocking):', convError);
    }
    // ================================================

    console.log('✅ Page generation complete');

    res.status(200).json({
      success: true,
      conversationId: finalConversationId,
      plan: plan,
      html_code: html,
      css_code: css,
      js_code: js,
      usage: totalUsage,
      validation: {
        valid: validationResult?.valid || true,
        errors: validationResult?.errors || [],
        warnings: validationResult?.warnings || [],
        processingTime: validationResult?.processingTime || 0
      },
      usingUserKey,
      message: 'Page generated successfully with comprehensive planning'
    });

  } catch (error) {
    console.error('❌ Page generation error:', error);

    // Check for API key authentication errors
    if (error.status === 401 || error.message?.includes('invalid_api_key') || error.message?.includes('authentication')) {
      return res.status(401).json({
        error: 'Invalid API key',
        details: 'Your API key is invalid or expired. Please update it in the settings modal.',
        needsKeyReconfiguration: true
      });
    }

    // Check for quota/billing errors
    if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('overloaded')) {
      return res.status(429).json({
        error: 'API quota exceeded',
        details: 'Your API key has exceeded its quota or the service is overloaded. Please try again later.',
        needsKeyReconfiguration: false
      });
    }

    // Generic error
    res.status(500).json({
      error: 'Failed to generate page',
      details: error.message
    });
  }
}

function updateAIUsage(settings, usage) {
  try {
    const tokensUsed = (usage.input_tokens || 0) + (usage.output_tokens || 0);
    const month = new Date().toISOString().slice(0, 7);

    // Calculate estimated cost (this is a simplified calculation - you might want to adjust based on actual pricing)
    const estimatedCost = tokensUsed * 0.00002; // Example: $0.02 per 1000 tokens

    db.run(`INSERT INTO ai_usage_logs (tokens_used, estimated_cost, usage_type, model, provider, month)
            VALUES (?, ?, ?, ?, ?, ?)`,
      [tokensUsed, estimatedCost, 'comprehensive-page-generation', usage.model || null, usage.provider || null, month],
      function(err) {
        if (err) {
          console.error('Error tracking usage in database:', err);
        } else {
          console.log('✅ Comprehensive page generation usage tracked in database with ID:', this.lastID);
        }
      });
  } catch (error) {
    console.error('Error updating AI usage:', error);
  }
}
