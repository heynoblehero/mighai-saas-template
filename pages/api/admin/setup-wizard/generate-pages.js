import { requireAdminAuth } from '../../../../lib/auth-middleware';
import { getWizardState, updateWizardState } from '../../../../lib/setup-wizard-db';
import AIProviderService from '../../../../services/ai-provider.js';
import fs from 'fs';
import path from 'path';

const RESERVED_PAGES_DIR = path.join(process.cwd(), 'data', 'reserved-pages');
const RULES_FILE = path.join(process.cwd(), 'data', 'reserved-page-rules.json');

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

  return `
## SAAS CONFIGURATION
Site Name: ${site_name || 'My SaaS'}
Tagline: ${site_tagline || 'Build something amazing'}
Description: ${site_description || 'A powerful SaaS platform'}

## TARGET AUDIENCE
${Array.isArray(target_audience) ? target_audience.join(', ') : 'Professionals and businesses'}

## KEY FEATURES
${Array.isArray(key_features) ? key_features.map((f, i) => `${i + 1}. ${f}`).join('\n') : '1. Feature 1\n2. Feature 2\n3. Feature 3'}

## PROBLEM SOLVED
${problem_solved || 'Helps users accomplish their goals more efficiently'}

## BRAND COLORS
Primary: ${primary_color || '#10B981'}
Secondary: ${secondary_color || '#059669'}
Accent: ${accent_color || '#34D399'}

## STYLE PREFERENCES
${style_analysis || 'Modern, professional design with clean typography and ample white space'}

## PRICING TIERS
${pricing_tier_descriptions ? `
Free: ${pricing_tier_descriptions.free || 'Perfect for getting started'}
Pro: ${pricing_tier_descriptions.pro || 'For growing teams'}
Enterprise: ${pricing_tier_descriptions.enterprise || 'Custom solutions at scale'}
` : 'Standard pricing tiers available'}

## PAGE TO GENERATE: ${pageConfig.name}
${pageConfig.description}

## REQUIREMENTS
Generate a complete, responsive HTML page that:
1. Uses the brand colors consistently throughout
2. Reflects the style preferences in layout and typography
3. Incorporates the SaaS messaging and value proposition
4. Is optimized for conversion and user engagement
5. Works seamlessly on mobile and desktop
6. Uses modern CSS (Tailwind utility classes where appropriate)
7. Includes proper meta tags and semantic HTML

Generate the complete HTML code for this page. Use the brand colors as CSS variables:
--primary: ${primary_color || '#10B981'}
--secondary: ${secondary_color || '#059669'}
--accent: ${accent_color || '#34D399'}
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

async function generatePage(pageType, wizardState, apiKey, provider, model) {
  const pageConfig = PAGE_CONFIGS[pageType];
  if (!pageConfig) {
    throw new Error(`Unknown page type: ${pageType}`);
  }

  const rules = getRules();
  const pageRules = rules[pageType] || {};

  const prompt = buildWizardPrompt(wizardState, pageType, pageConfig);

  // Build the full prompt with rules context
  const fullPrompt = `
You are an expert web developer creating a page for a SaaS application.

${prompt}

${pageRules.required_elements ? `
## REQUIRED ELEMENTS
${JSON.stringify(pageRules.required_elements, null, 2)}
` : ''}

${pageRules.required_functionality ? `
## REQUIRED FUNCTIONALITY
${JSON.stringify(pageRules.required_functionality, null, 2)}
` : ''}

## OUTPUT FORMAT
Return ONLY the HTML code, starting with <!DOCTYPE html> or the main content div.
Use inline styles or Tailwind classes. Include the brand color CSS variables.
Make the page fully responsive and visually polished.
`;

  // Create AI provider instance with settings object
  const settings = {
    ai_provider: provider,
    claude_api_key: provider === 'claude' ? apiKey : null,
    gemini_api_key: provider === 'gemini' ? apiKey : null,
    claude_model: model || 'claude-sonnet-4-5-20250929',
    gemini_model: model || 'gemini-2.0-flash',
    max_tokens: 8000,
    temperature: 0.7
  };
  const aiService = new AIProviderService(settings);

  // Generate the page
  const response = await aiService.generate(fullPrompt, {
    maxTokens: 8000,
    temperature: 0.7
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

  return htmlContent.trim();
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
  const { pages, apiKey, provider = 'gemini', model } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required for page generation' });
  }

  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    return res.status(400).json({ error: 'Please specify which pages to generate' });
  }

  const wizardState = getWizardState(userId);
  const results = {};
  const errors = {};

  for (const pageType of pages) {
    if (!PAGE_CONFIGS[pageType]) {
      errors[pageType] = `Unknown page type: ${pageType}`;
      continue;
    }

    try {
      console.log(`Generating ${pageType}...`);
      const htmlContent = await generatePage(pageType, wizardState, apiKey, provider, model);

      // Save to reserved-pages directory
      const pageConfig = PAGE_CONFIGS[pageType];
      const filePath = path.join(RESERVED_PAGES_DIR, pageConfig.fileName);

      const pageData = {
        pageType,
        title: pageConfig.name,
        html: htmlContent,
        chatHistory: [],
        version: 1,
        deployed: false,
        deployedAt: null,
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
