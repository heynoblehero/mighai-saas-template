/**
 * AI Prompt Utilities for Page Generation
 *
 * Simplified version - provides hints and suggestions, not restrictions.
 * The AI has full creative freedom to follow user's vision.
 */

/**
 * Detects a suggested design style based on user prompt and context.
 * Returns as a HINT only - AI can override based on user's actual request.
 */
export function detectDesignStyle(userPrompt, context = {}) {
  const prompt = (userPrompt || '').toLowerCase();
  const siteName = (context.site_name || '').toLowerCase();
  const description = (context.site_description || '').toLowerCase();
  const combined = `${prompt} ${siteName} ${description}`;

  const styles = {
    dark_tech: {
      keywords: ['ai', 'tech', 'saas', 'developer', 'api', 'code', 'crypto', 'blockchain', 'startup', 'platform', 'devtool', 'infrastructure', 'dark', 'modern', 'automation', 'machine learning', 'data', 'analytics', 'cloud', 'software', 'app'],
      palette: {
        mode: 'dark',
        background: '#0a0a0a',
        surface: '#141414',
        primary: '#00d4ff',
        accent: '#8b5cf6',
        text: '#fafafa',
        textSecondary: '#a1a1aa'
      },
      description: 'Dark mode with cyan/purple accents, clean typography'
    },

    vibrant_creative: {
      keywords: ['creative', 'design', 'art', 'portfolio', 'studio', 'agency', 'brand', 'marketing', 'colorful', 'bold', 'playful', 'media', 'video', 'animation', 'graphics'],
      palette: {
        mode: 'light',
        background: '#ffffff',
        surface: '#fafafa',
        primary: '#ff6b35',
        accent: '#7c3aed',
        text: '#18181b',
        textSecondary: '#52525b'
      },
      description: 'Bold colors, playful, asymmetric layouts'
    },

    minimal_elegant: {
      keywords: ['minimal', 'clean', 'elegant', 'luxury', 'premium', 'boutique', 'fashion', 'simple', 'professional', 'sleek', 'refined', 'sophisticated'],
      palette: {
        mode: 'light',
        background: '#ffffff',
        surface: '#fafafa',
        primary: '#18181b',
        accent: '#a78bfa',
        text: '#18181b',
        textSecondary: '#52525b'
      },
      description: 'Generous whitespace, refined typography, subtle'
    },

    warm_friendly: {
      keywords: ['community', 'health', 'wellness', 'food', 'restaurant', 'cafe', 'family', 'education', 'kids', 'friendly', 'warm', 'organic', 'natural', 'lifestyle', 'fitness', 'yoga'],
      palette: {
        mode: 'light',
        background: '#fffbf5',
        surface: '#fff7ed',
        primary: '#f97316',
        accent: '#84cc16',
        text: '#292524',
        textSecondary: '#57534e'
      },
      description: 'Warm tones, rounded shapes, approachable'
    },

    corporate_professional: {
      keywords: ['enterprise', 'business', 'corporate', 'consulting', 'finance', 'legal', 'insurance', 'banking', 'b2b', 'services', 'solutions', 'industry'],
      palette: {
        mode: 'light',
        background: '#ffffff',
        surface: '#f8fafc',
        primary: '#2563eb',
        accent: '#0891b2',
        text: '#0f172a',
        textSecondary: '#475569'
      },
      description: 'Professional blue-based scheme, trust-building'
    }
  };

  // Score each style based on keyword matches
  let bestStyle = 'dark_tech'; // Default for SaaS
  let bestScore = 0;

  for (const [styleName, styleConfig] of Object.entries(styles)) {
    const score = styleConfig.keywords.reduce((acc, keyword) => {
      return acc + (combined.includes(keyword) ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestStyle = styleName;
    }
  }

  return {
    style: bestStyle,
    config: styles[bestStyle],
    confidence: bestScore > 2 ? 'high' : bestScore > 0 ? 'medium' : 'low',
    allStyles: styles
  };
}

/**
 * Generates a style SUGGESTION section (not requirement)
 */
export function generateStyleSection(styleDetection, brandColors = null) {
  const { style, config } = styleDetection;
  const palette = config.palette;

  // Override with brand colors if provided
  if (brandColors) {
    if (brandColors.primary) palette.primary = brandColors.primary;
    if (brandColors.accent) palette.accent = brandColors.accent;
  }

  return `
## STYLE SUGGESTION (optional - follow user's vision instead if they specify differently)
Based on the context, a "${style.replace('_', ' ')}" style might work well.
Suggested palette: ${palette.mode} mode, primary: ${palette.primary}, accent: ${palette.accent}
Description: ${config.description}

Note: This is just a suggestion. If the user describes a different style, follow their direction instead.
`;
}

/**
 * Minimal system prompt - gives AI freedom while maintaining security
 */
export const MINIMAL_SYSTEM_PROMPT = `You are an expert web developer and designer. Generate complete, production-ready web pages based on the user's request.

## YOUR ROLE
- Follow the user's creative direction - they know what they want
- Generate complete HTML with embedded CSS and JavaScript
- Make pages responsive and accessible
- Be creative and match the user's described style/aesthetic

## STRUCTURE
Generate a complete HTML document:
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title</title>
    <style>/* Your CSS */</style>
</head>
<body>
    <!-- Your HTML -->
    <script>/* Your JavaScript */</script>
</body>
</html>

## SECURITY (mandatory)
- No eval(), document.write(), or dangerous patterns
- No loading scripts from untrusted external sources
- Keep user data safe

## DO NOT INCLUDE (already handled globally)
- Analytics tracking (window.Analytics)
- Heatmap tracking
- Support chat widgets

Generate ONLY the complete HTML code. No markdown code blocks.`;

/**
 * Design pattern examples - available as reference, not requirements
 */
export const DESIGN_PATTERN_EXAMPLES = `
## DESIGN PATTERNS (use these if appropriate for the user's request)

### Glassmorphism
background: rgba(255, 255, 255, 0.1);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.2);

### Gradient Text
background: linear-gradient(135deg, #00d4ff, #8b5cf6);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;

### Hover Effects
transition: transform 0.3s ease, box-shadow 0.3s ease;
:hover { transform: translateY(-4px); box-shadow: 0 10px 40px rgba(0,0,0,0.2); }

### Scroll Animation (JS)
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => e.isIntersecting && e.target.classList.add('visible'));
});
document.querySelectorAll('.animate').forEach(el => observer.observe(el));
`;

/**
 * Generate the full system prompt for page generation
 */
export function getSystemPrompt(styleDetection = null) {
  let prompt = MINIMAL_SYSTEM_PROMPT;

  if (styleDetection) {
    prompt += '\n' + generateStyleSection(styleDetection);
  }

  prompt += '\n' + DESIGN_PATTERN_EXAMPLES;

  return prompt;
}

// Legacy exports for backward compatibility
export const MODERN_DESIGN_PATTERNS = DESIGN_PATTERN_EXAMPLES;
export const QUALITY_BENCHMARKS = ''; // Removed - no longer forcing requirements
export const CONTENT_GENERATION_RULES = ''; // Removed - AI has freedom

export default {
  detectDesignStyle,
  generateStyleSection,
  getSystemPrompt,
  MINIMAL_SYSTEM_PROMPT,
  DESIGN_PATTERN_EXAMPLES,
  MODERN_DESIGN_PATTERNS,
  QUALITY_BENCHMARKS,
  CONTENT_GENERATION_RULES
};
