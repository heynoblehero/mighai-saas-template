import fs from 'fs';
import path from 'path';
import AIProviderService from '../../../services/ai-provider.js';
import { quickValidate, generateValidationReport } from '../../../lib/ai-code-validator.js';
import { saveConversation, addMessage, initializeAIConversationTables } from '../../../lib/ai-conversation-init.js';
import crypto from 'crypto';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'ai-settings.json');
const USAGE_FILE = path.join(process.cwd(), 'data', 'ai-usage.json');

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

function trackUsage(tokensUsed, estimatedCost) {
  try {
    const usageData = {
      timestamp: new Date().toISOString(),
      tokens_used: tokensUsed,
      estimated_cost: estimatedCost,
      month: new Date().toISOString().slice(0, 7) // YYYY-MM format
    };

    let allUsage = [];
    if (fs.existsSync(USAGE_FILE)) {
      const existingData = fs.readFileSync(USAGE_FILE, 'utf8');
      allUsage = JSON.parse(existingData);
    }

    allUsage.push(usageData);

    // Keep only last 1000 entries
    if (allUsage.length > 1000) {
      allUsage = allUsage.slice(-1000);
    }

    fs.writeFileSync(USAGE_FILE, JSON.stringify(allUsage, null, 2));
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
}

const PAGE_GENERATION_PROMPT = `You are an elite web developer and designer specializing in creating stunning, modern web pages. Create a complete, beautiful, fully-functional web page with inline CSS and JavaScript.

🎨 DESIGN CAPABILITIES:
You can create ANY type of page: landing pages, portfolios, dashboards, ecommerce, blogs, SaaS marketing, corporate sites, creative showcases, documentation, and more.

Use modern design patterns:
• Glassmorphism, Neumorphism, Gradient meshes
• Hero sections with dynamic backgrounds
• Card-based layouts, Split-screen designs
• Parallax scrolling, Sticky navigation
• Testimonial carousels, Pricing tables
• Feature showcases, Timeline components
• Stats displays, Team grids, Portfolio galleries

Advanced CSS techniques:
• CSS Grid & Flexbox for layouts
• Custom CSS variables for theming
• Keyframe animations, Transform effects
• Gradient backgrounds, Box shadows
• Backdrop filters, Clip-path shapes
• Smooth transitions and micro-interactions

Interactive JavaScript:
• Form validation, Mobile menu toggle
• Scroll animations (fade-in, slide-in)
• Modal/popup functionality
• Carousels and sliders
• Tabs, accordions, Dark mode toggle
• Smooth scrolling, Counter animations

📋 REQUIREMENTS:
✓ Complete HTML with <style> and <script> tags inline
✓ Semantic HTML5 (header, nav, main, section, footer)
✓ WCAG 2.1 accessible (ARIA labels, contrast ratios)
✓ Fully responsive (mobile-first, breakpoints: 640px, 768px, 1024px)
✓ Modern aesthetics (harmonious colors, typography scale, proper spacing)
✓ Smooth animations and hover effects
✓ Production-ready code

🎯 USER REQUEST: {userPrompt}

📝 CONTEXT: {context}

🚀 INSTRUCTIONS:
1. Analyze the request and choose appropriate design patterns
2. Select a cohesive color palette
3. Implement modern, visually stunning design
4. Add smooth animations and interactions
5. Ensure pixel-perfect responsiveness
6. Make it visually impressive - wow the user!

Generate ONLY the complete HTML code (no markdown, no explanations). Include all CSS in <style> tags and all JavaScript in <script> tags. Make it production-ready and absolutely beautiful!`;

const SEPARATED_GENERATION_PROMPT = `You are an elite web developer and designer with expertise in creating stunning, modern web pages. Create a beautiful, fully-functional web page with SEPARATED HTML, CSS, and JavaScript.

CRITICAL OUTPUT FORMAT - Use this EXACT structure:

===HTML===
[Your HTML code here - clean semantic HTML without any <style> or <script> tags]
===CSS===
[Your CSS code here - all styles needed for the page]
===JS===
[Your JavaScript code here - all functionality, or leave empty if not needed]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎨 DESIGN SYSTEM & STYLE CAPABILITIES:

MODERN DESIGN PATTERNS YOU CAN USE:
• Glassmorphism (frosted glass effects with backdrop-filter)
• Neumorphism (soft 3D UI elements)
• Gradient meshes and color transitions
• Card-based layouts with depth
• Split-screen layouts
• Asymmetric grids
• Hero sections with dynamic backgrounds
• Parallax scrolling effects
• Sticky navigation bars
• Mega menus
• Testimonial carousels
• Pricing comparison tables
• Feature showcases with icons
• Timeline components
• Stats/metrics displays
• Team member grids
• Portfolio galleries
• Blog card layouts
• Newsletter signup forms
• Contact forms with validation

ADVANCED CSS TECHNIQUES:
• CSS Grid for complex layouts
• Flexbox for flexible components
• Custom CSS variables for theming
• Smooth scroll behavior
• Intersection Observer animations (using JS)
• Keyframe animations (@keyframes)
• Transform effects (scale, rotate, translate)
• Gradient backgrounds (linear, radial, conic)
• Box shadows and text shadows
• Border radius and custom shapes
• Backdrop filters for glassmorphism
• Clip-path for creative shapes
• CSS transitions for smooth interactions
• Pseudo-elements (::before, ::after) for decorative elements
• CSS filters (blur, brightness, contrast, etc.)

RESPONSIVE DESIGN:
• Mobile-first approach
• Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)
• Fluid typography with clamp()
• Responsive images and aspect ratios
• Touch-friendly interactive elements
• Hamburger menus for mobile

COLOR & TYPOGRAPHY:
• Use harmonious color palettes (complementary, analogous, or triadic)
• Implement proper contrast ratios for accessibility
• Typography scale (12px, 14px, 16px, 20px, 24px, 32px, 48px, 64px)
• Font pairings (headings + body text)
• Line height and letter spacing for readability
• Google Fonts or system font stacks

ANIMATIONS & INTERACTIONS:
• Hover effects on buttons and links
• Smooth page transitions
• Fade-in animations on scroll
• Loading states and spinners
• Modal/dialog animations
• Dropdown menus with transitions
• Image zoom on hover
• Parallax effects
• Typing animations
• Progress bars
• Skeleton loaders

JAVASCRIPT CAPABILITIES:
• Form validation
• Interactive navigation (mobile menu toggle)
• Scroll animations (fade-in, slide-in)
• Smooth scrolling to sections
• Modal/popup functionality
• Carousel/slider functionality
• Tabs and accordions
• Lazy loading images
• Dark mode toggle
• Dynamic content loading
• Search functionality
• Filtering and sorting
• Counter animations
• Parallax effects

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 TECHNICAL REQUIREMENTS:

HTML:
✓ Semantic HTML5 elements (<header>, <nav>, <main>, <section>, <article>, <footer>)
✓ Proper heading hierarchy (h1-h6)
✓ ARIA labels for accessibility
✓ Alt text for images
✓ Form labels and input associations
✓ Meta tags for responsiveness (<meta name="viewport">)
✓ No inline styles or scripts

CSS:
✓ Modern, production-ready CSS
✓ CSS custom properties (--variables) for consistency
✓ Mobile-first responsive design
✓ Smooth transitions and animations
✓ Proper z-index management
✓ Optimized selectors
✓ Cross-browser compatibility
✓ Print styles if applicable

JavaScript:
✓ Vanilla JavaScript (no framework dependencies)
✓ Event listeners for interactions
✓ DOM manipulation
✓ Form validation
✓ Intersection Observer for scroll animations
✓ Local storage for preferences
✓ Debounced/throttled event handlers
✓ Error handling

ACCESSIBILITY (WCAG 2.1):
✓ Color contrast ratios (4.5:1 for text)
✓ Keyboard navigation support
✓ Focus indicators
✓ Screen reader friendly
✓ ARIA roles and labels
✓ Skip links for navigation
✓ Form error messaging

PERFORMANCE:
✓ Optimized CSS (no redundant rules)
✓ Efficient JavaScript (no memory leaks)
✓ Lazy loading for images below fold
✓ Minimal DOM manipulation
✓ CSS animations (not JS when possible)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 USER REQUEST: {userPrompt}

📝 ADDITIONAL CONTEXT: {context}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 GENERATION INSTRUCTIONS:

1. Analyze the user request and determine the page type (landing, portfolio, dashboard, ecommerce, blog, etc.)
2. Choose appropriate design patterns and components
3. Select a cohesive color palette that matches the request
4. Implement modern, visually stunning design
5. Add smooth animations and micro-interactions
6. Ensure pixel-perfect responsiveness
7. Include meaningful placeholder content
8. Add interactive elements with JavaScript
9. Test for accessibility

IMPORTANT REMINDERS:
• Output MUST use the exact ===HTML===, ===CSS===, ===JS=== format
• Create production-ready, beautiful, modern code
• Make it visually impressive - wow the user!
• Include rich interactions and smooth animations
• Ensure everything works on mobile and desktop
• Use modern CSS features (Grid, Flexbox, custom properties)
• Add thoughtful micro-interactions and hover effects
• Make placeholder content realistic and relevant

Now create an absolutely stunning web page that exceeds expectations!`;

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

    // Validate provider-specific API key
    const providerKeys = {
      'gemini': 'gemini_api_key',
      'claude': 'claude_api_key',
      'openai': 'openai_api_key'
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
      trackUsage(tokensUsed, estimatedCost);

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