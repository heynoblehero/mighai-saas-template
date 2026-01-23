import { requireAdminAuth } from '../../../../lib/auth-middleware';
import { getWizardState, updateWizardState } from '../../../../lib/setup-wizard-db';
import AIProviderService from '../../../../services/ai-provider.js';
import {
  detectDesignStyle,
  generateStyleSection,
  MODERN_DESIGN_PATTERNS,
  QUALITY_BENCHMARKS,
  CONTENT_GENERATION_RULES
} from '../../../../lib/ai-prompt-utils.js';
import fs from 'fs';
import path from 'path';

const RESERVED_PAGES_DIR = path.join(process.cwd(), 'data', 'reserved-pages');
const RULES_FILE = path.join(process.cwd(), 'data', 'reserved-page-rules.json');
const AI_SETTINGS_FILE = path.join(process.cwd(), 'data', 'ai-settings.json');

function getAISettings() {
  try {
    if (fs.existsSync(AI_SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(AI_SETTINGS_FILE, 'utf8'));
    }
    return null;
  } catch (error) {
    console.error('Error reading AI settings:', error);
    return null;
  }
}

// Ensure directory exists
if (!fs.existsSync(RESERVED_PAGES_DIR)) {
  fs.mkdirSync(RESERVED_PAGES_DIR, { recursive: true });
}

function getRules() {
  try {
    if (fs.existsSync(RULES_FILE)) {
      return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
    }
    return {};
  } catch (error) {
    console.error('Error reading rules:', error);
    return {};
  }
}

function buildWizardPrompt(wizardState, pageType, pageConfig) {
  const {
    site_name, site_tagline, site_description,
    target_audience, key_features, problem_solved,
    pricing_tier_descriptions,
    primary_color, secondary_color, accent_color,
    style_analysis
  } = wizardState;

  const primaryCol = primary_color || '#10B981';
  const secondaryCol = secondary_color || '#059669';
  const accentCol = accent_color || '#34D399';

  // Detect design style based on site info
  const styleDetection = detectDesignStyle(site_description || '', {
    site_name: site_name,
    site_description: site_description
  });

  // Generate dynamic style section with brand colors
  const styleSection = generateStyleSection(styleDetection, {
    primary: primaryCol,
    secondary: secondaryCol,
    accent: accentCol
  });

  return `You are creating a ${pageConfig.name} for "${site_name || 'a modern SaaS'}" that should look like it belongs on a $100M startup's website - think Linear, Vercel, Stripe quality.

## BUSINESS CONTEXT
Site Name: ${site_name || 'My SaaS'}
Tagline: ${site_tagline || 'Build something amazing'}
Description: ${site_description || 'A powerful SaaS platform'}

## TARGET AUDIENCE
${Array.isArray(target_audience) ? target_audience.join(', ') : 'Professionals and businesses'}

## KEY VALUE PROPOSITIONS
${Array.isArray(key_features) ? key_features.map((f, i) => `${i + 1}. ${f}`).join('\n') : '1. Streamline your workflow\n2. Save time and money\n3. Scale effortlessly'}

## PROBLEM WE SOLVE
${problem_solved || 'We help users accomplish their goals faster and more efficiently'}

## BRAND COLORS (USE THESE EXACTLY)
Primary: ${primaryCol}
Secondary: ${secondaryCol}
Accent: ${accentCol}

## USER'S STYLE PREFERENCES
${style_analysis || 'Modern, professional design with clean typography and ample white space'}

## PRICING TIERS (If applicable to this page)
${pricing_tier_descriptions ? `
- Free Tier: ${pricing_tier_descriptions.free || 'Perfect for getting started - $0'}
- Pro Tier: ${pricing_tier_descriptions.pro || 'For growing teams and professionals'}
- Enterprise Tier: ${pricing_tier_descriptions.enterprise || 'Custom solutions for large organizations'}
` : 'Standard pricing tiers available'}

## PAGE TO GENERATE: ${pageConfig.name}
${pageConfig.description}

${styleSection}

${MODERN_DESIGN_PATTERNS}

${QUALITY_BENCHMARKS}

${CONTENT_GENERATION_RULES}

## CONTENT CUSTOMIZATION RULES (CRITICAL)
1. Replace ALL generic text with content specific to "${site_name || 'this SaaS'}"
2. Headlines should reference the actual product/service and its benefits
3. Features should reflect the actual key_features provided above
4. CTAs should be action-oriented and specific to the offering
5. If generating a login/signup page, make it feel premium and trustworthy
6. If generating a pricing page, highlight value propositions clearly
7. NEVER use "Lorem ipsum" or obvious placeholder text
8. Use specific numbers and outcomes when possible
`;
}

// Page configurations for wizard-generated pages
const PAGE_CONFIGS = {
  'landing-page': {
    name: 'Landing Page',
    description: 'Hero section with CTA, features grid, testimonials, and pricing preview. Should showcase the SaaS value proposition prominently.',
    fileName: 'landing-page.json'
  },
  'pricing-page': {
    name: 'Pricing Page',
    description: 'Pricing tiers comparison with feature lists, CTA buttons linking to checkout. Should clearly differentiate between plans.',
    fileName: 'pricing-page.json'
  },
  'about-page': {
    name: 'About Page',
    description: 'Company/product story, mission, team section (optional), and contact info. Should build trust and credibility.',
    fileName: 'about-page.json'
  },
  'contact-page': {
    name: 'Contact Page',
    description: 'Contact form with name, email, subject, message fields. Include company contact info and possibly a map.',
    fileName: 'contact-page.json'
  },
  'customer-login': {
    name: 'Customer Login',
    description: 'Login form with email and password, forgot password link, and signup link. Clean and trustworthy design.',
    fileName: 'customer-login.json'
  },
  'customer-signup': {
    name: 'Customer Signup',
    description: 'Registration form with username, email, password, confirm password, and OTP verification step.',
    fileName: 'customer-signup.json'
  },
  'customer-dashboard': {
    name: 'Customer Dashboard',
    description: 'Dashboard content area showing welcome message, subscription info, usage stats, and quick actions.',
    fileName: 'customer-dashboard.json'
  },
  'blog-homepage': {
    name: 'Blog Homepage',
    description: 'Blog listing page with featured posts, categories, search, and pagination. Grid or list layout.',
    fileName: 'blog-homepage.json'
  }
};

async function generatePage(pageType, wizardState, aiSettings, perPageConfig = {}) {
  const pageConfig = PAGE_CONFIGS[pageType];
  if (!pageConfig) {
    throw new Error(`Unknown page type: ${pageType}`);
  }

  const rules = getRules();
  const pageRules = rules[pageType] || {};

  const prompt = buildWizardPrompt(wizardState, pageType, pageConfig);

  // Build per-page customization section
  let customSection = '';

  if (perPageConfig.customPrompt && perPageConfig.customPrompt.trim()) {
    customSection += `
## ADDITIONAL INSTRUCTIONS FOR THIS PAGE
The user has provided specific instructions for this page. IMPORTANT: Follow these instructions carefully:
${perPageConfig.customPrompt}
`;
  }

  if (perPageConfig.screenshots && perPageConfig.screenshots.length > 0) {
    customSection += `
## INSPIRATION REFERENCES
The user has provided ${perPageConfig.screenshots.length} reference screenshot(s) specifically for this page.
Please incorporate design elements, layout patterns, or visual styles inspired by these references.
Make the page visually aligned with the provided inspiration while maintaining the brand colors and overall SaaS theme.
`;
  }

  // Build the full prompt with rules context and per-page customization
  const fullPrompt = `
${prompt}

${customSection}

${pageRules.required_elements ? `
## REQUIRED ELEMENTS (Must include all)
${JSON.stringify(pageRules.required_elements, null, 2)}
` : ''}

${pageRules.required_functionality ? `
## REQUIRED FUNCTIONALITY (Must implement all)
${JSON.stringify(pageRules.required_functionality, null, 2)}
` : ''}

## CRITICAL OUTPUT REQUIREMENTS (MUST FOLLOW EXACTLY)

Generate a COMPLETE, PREMIUM-QUALITY HTML document:

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Compelling Page Title] - ${wizardState.site_name || 'SaaS'}</title>
    <meta name="description" content="[Benefit-focused description]">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root {
            --primary: ${wizardState.primary_color || '#10B981'};
            --primary-dark: ${wizardState.secondary_color || '#059669'};
            --primary-rgb: [RGB values for rgba()];
            --accent: ${wizardState.accent_color || '#34D399'};
            /* Additional modern CSS variables */
        }
        /* Modern effects: glassmorphism, gradients, animations */
        /* Micro-interactions: hover states, transitions */
        /* Scroll animations: fade-up effects */
    </style>
</head>
<body>
    <!-- Premium page content with visual depth -->
    <!-- Bento grids, glassmorphism, floating elements where appropriate -->
    <script>
        // Scroll-triggered animations
        // Required functionality from above
        // NO analytics/chat code (already global)
    </script>
</body>
</html>

### MANDATORY QUALITY REQUIREMENTS:
1. MUST start with <!DOCTYPE html> - NO EXCEPTIONS
2. MUST include Inter font from Google Fonts
3. MUST include Tailwind CDN script
4. MUST include modern CSS (glassmorphism, gradients, animations)
5. MUST include hover micro-interactions on buttons/cards
6. MUST include scroll-triggered fade-up animations
7. MUST be fully responsive (mobile-first)
8. MUST look premium - rival Linear/Vercel/Stripe quality
9. NEVER use generic placeholder content
10. NEVER create boring/plain designs

### DO NOT:
- Return partial HTML
- Use generic "Feature 1, Feature 2" text
- Skip modern effects (make it visually stunning)
- Add analytics/chat code (already handled globally)

Return ONLY the complete HTML code. No markdown blocks. Make it absolutely premium!
`;

  // Use global AI settings with Claude
  const aiService = new AIProviderService(aiSettings);

  // Generate the page
  const response = await aiService.generate(fullPrompt, {
    maxTokens: aiSettings.max_tokens || 8000,
    temperature: aiSettings.temperature || 0.7
  });

  // Extract HTML from response
  let htmlContent = response.content || response.text || response;

  // Clean up the response - extract HTML if wrapped in markdown
  if (htmlContent.includes('```html')) {
    const match = htmlContent.match(/```html\n?([\s\S]*?)\n?```/);
    if (match) {
      htmlContent = match[1];
    }
  } else if (htmlContent.includes('```')) {
    const match = htmlContent.match(/```\n?([\s\S]*?)\n?```/);
    if (match) {
      htmlContent = match[1];
    }
  }

  // Post-generation validation and repair
  htmlContent = ensureCompleteHTML(htmlContent.trim(), wizardState);

  return htmlContent;
}

/**
 * Ensure the generated HTML is complete with all required elements
 * If the AI returned partial HTML, wrap it in a proper document structure
 */
function ensureCompleteHTML(html, wizardState) {
  const primaryColor = wizardState.primary_color || '#10B981';
  const secondaryColor = wizardState.secondary_color || '#059669';
  const accentColor = wizardState.accent_color || '#34D399';
  const siteName = wizardState.site_name || 'My SaaS';

  // Check if it's already a complete HTML document
  const hasDoctype = html.toLowerCase().includes('<!doctype html');
  const hasTailwindCDN = html.includes('cdn.tailwindcss.com');
  const hasStyleBlock = html.includes('<style');

  // If it has all required elements, return as-is
  if (hasDoctype && hasTailwindCDN && hasStyleBlock) {
    console.log('✅ Generated HTML is complete');
    return html;
  }

  console.log('⚠️ Generated HTML is incomplete, wrapping in proper structure...');
  console.log(`   - Has DOCTYPE: ${hasDoctype}`);
  console.log(`   - Has Tailwind CDN: ${hasTailwindCDN}`);
  console.log(`   - Has Style block: ${hasStyleBlock}`);

  // Extract body content if it's a partial document
  let bodyContent = html;

  // If it has <body> tags, extract just the body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    bodyContent = bodyMatch[1];
  }

  // If it starts with <html> but no doctype, extract everything inside
  if (!hasDoctype && html.toLowerCase().includes('<html')) {
    const htmlMatch = html.match(/<html[^>]*>([\s\S]*?)<\/html>/i);
    if (htmlMatch) {
      const innerContent = htmlMatch[1];
      const innerBodyMatch = innerContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (innerBodyMatch) {
        bodyContent = innerBodyMatch[1];
      }
    }
  }

  // Build complete HTML document with modern patterns
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${siteName}</title>
    <meta name="description" content="${wizardState.site_description || 'Welcome to ' + siteName}">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root {
            --primary: ${primaryColor};
            --primary-dark: ${secondaryColor};
            --primary-rgb: 16, 185, 129;
            --accent: ${accentColor};
            --background: #ffffff;
            --surface: #fafafa;
            --text: #18181b;
            --text-secondary: #52525b;
            --border: #e4e4e7;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--text);
            background: var(--background);
        }

        /* Brand colors */
        .bg-primary { background-color: var(--primary); }
        .text-primary { color: var(--primary); }
        .border-primary { border-color: var(--primary); }

        /* Modern animations */
        .fade-up {
            opacity: 0;
            transform: translateY(40px);
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .fade-up.visible {
            opacity: 1;
            transform: translateY(0);
        }

        /* Glassmorphism */
        .glass {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(0, 0, 0, 0.05);
        }

        /* Gradient text */
        .text-gradient {
            background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        /* Button glow */
        .btn-glow:hover {
            box-shadow: 0 20px 40px -10px rgba(var(--primary-rgb), 0.4);
            transform: translateY(-2px);
        }

        /* Card hover */
        .card-hover {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover:hover {
            transform: translateY(-8px);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
        }
    </style>
</head>
<body class="min-h-screen">
    ${bodyContent}
    <script>
        // Scroll-triggered animations
        document.addEventListener('DOMContentLoaded', function() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
            document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
        });
    </script>
</body>
</html>`;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await requireAdminAuth(req, res);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = authResult.user?.id || 1;
  const { pages, pageConfigs = {} } = req.body;

  // Get wizard state
  const wizardState = getWizardState(userId);

  // Get global AI settings
  const aiSettings = getAISettings();

  if (!aiSettings || !aiSettings.claude_api_key) {
    return res.status(400).json({
      error: 'Claude API key not configured. Please configure your API key in Settings > AI Settings.'
    });
  }

  console.log('🤖 Page generation using global Claude API key');

  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    return res.status(400).json({ error: 'Please specify which pages to generate' });
  }

  const results = {};
  const errors = {};

  for (const pageType of pages) {
    if (!PAGE_CONFIGS[pageType]) {
      errors[pageType] = `Unknown page type: ${pageType}`;
      continue;
    }

    try {
      // Get per-page config if provided
      const perPageConfig = pageConfigs[pageType] || {};
      console.log(`Generating ${pageType}...`, perPageConfig.customPrompt ? '(with custom prompt)' : '');
      const htmlContent = await generatePage(pageType, wizardState, aiSettings, perPageConfig);

      // Save to reserved-pages directory
      const pageConfig = PAGE_CONFIGS[pageType];
      const filePath = path.join(RESERVED_PAGES_DIR, pageConfig.fileName);

      const pageData = {
        pageType,
        title: pageConfig.name,
        html_code: htmlContent,  // Use html_code to match what page loaders expect
        chatHistory: [],
        version: 1,
        deployed: true,  // Auto-deploy wizard-generated pages
        deployedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        generatedByWizard: true
      };

      fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));
      results[pageType] = {
        success: true,
        fileName: pageConfig.fileName
      };
    } catch (error) {
      console.error(`Error generating ${pageType}:`, error);
      errors[pageType] = error.message || 'Generation failed';
    }
  }

  // Update wizard state with generated pages
  const generatedPages = { ...wizardState.generated_pages };
  for (const pageType of Object.keys(results)) {
    generatedPages[pageType] = {
      generated: true,
      timestamp: new Date().toISOString()
    };
  }

  updateWizardState(userId, {
    generated_pages: generatedPages,
    pages_generated: Object.keys(results).length > 0
  });

  return res.status(200).json({
    success: true,
    results,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
    generatedCount: Object.keys(results).length,
    failedCount: Object.keys(errors).length
  });
}

export default handler;
