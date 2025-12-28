import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { quickValidate, generateValidationReport } from '../../../lib/ai-code-validator.js';
import { saveConversation, addMessage, initializeAIConversationTables } from '../../../lib/ai-conversation-init.js';
import crypto from 'crypto';

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
      const settingsPath = path.join(process.cwd(), 'data', 'ai-settings.json');
      let settings = {};

      if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      }

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
      text: `You are an expert web designer and developer. You need to plan a comprehensive web page.

${imageData ? 'LAYOUT REFERENCE IMAGE: See the attached image for visual reference.\n\n' : ''}${layoutAnalysis ? `LAYOUT ANALYSIS:\n${layoutAnalysis}\n\n` : ''}

USER REQUEST:
${userPrompt}

${iteration_type === 'modify' && context ? `CURRENT PAGE CONTEXT:\nHTML: ${context.html?.substring(0, 500)}...\nCSS: ${context.css?.substring(0, 500)}...\n\n` : ''}

Please think step-by-step and create a comprehensive plan for this page:

1. **Page Purpose & Goal**: What is the main purpose of this page?
2. **Target Audience**: Who is this page for?
3. **Sections Needed**: List all sections that should be included (e.g., Hero, Features, Testimonials, Pricing, CTA, Footer)
4. **Design Style**: What visual style fits best? (Modern, Minimal, Corporate, Creative, etc.)
5. **Color Palette**: Suggest a cohesive color scheme (primary, secondary, accent, backgrounds)
6. **Typography**: Font choices and hierarchy
7. **Key Interactions**: Buttons, forms, animations, hover effects
8. **Layout Structure**: Grid/flexbox approach, spacing system
9. **Special Features**: Any unique elements, animations, or effects

Be thorough and detailed in your plan. This will guide the actual implementation.`
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

    const generationPrompt = `You are an expert frontend developer. Based on the following plan, create a complete, production-ready web page.

PLAN:
${plan}

REQUIREMENTS:
1. Generate complete, semantic HTML
2. Create beautiful, modern CSS with:
   - Responsive design (mobile-first)
   - Smooth animations and transitions
   - Proper spacing and typography
   - Professional color scheme
   - Modern effects (gradients, shadows, hover states)
3. Add interactive JavaScript for:
   - Smooth scrolling
   - Animations on scroll
   - Form validation
   - Interactive elements
4. Make it visually stunning and professional
5. Include ALL sections mentioned in the plan
6. Use best practices (accessibility, SEO, performance)

IMPORTANT OUTPUT FORMAT:
Your response must contain THREE code blocks in this EXACT format:

\`\`\`html
<!-- Complete HTML here -->
\`\`\`

\`\`\`css
/* Complete CSS here */
\`\`\`

\`\`\`javascript
// Complete JavaScript here (if needed)
\`\`\`

Generate a complete, beautiful, modern page now!`;

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
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const usagePath = path.join(dataDir, 'ai-usage.json');
    let usageData = {
      month: new Date().toISOString().slice(0, 7),
      total_tokens: 0,
      requests: 0
    };

    if (fs.existsSync(usagePath)) {
      try {
        usageData = JSON.parse(fs.readFileSync(usagePath, 'utf8'));
      } catch (e) {
        console.log('Creating new usage data');
      }
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    if (usageData.month !== currentMonth) {
      usageData = { month: currentMonth, total_tokens: 0, requests: 0 };
    }

    usageData.total_tokens += (usage.input_tokens + usage.output_tokens);
    usageData.requests += 1;

    fs.writeFileSync(usagePath, JSON.stringify(usageData, null, 2));
  } catch (error) {
    console.error('Error updating AI usage:', error);
  }
}
