/**
 * Theme Context Builder
 * Builds consistent theme context from multiple sources for AI page generation
 */

const fs = require('fs');
const path = require('path');

const DESIGN_SYSTEM_PATH = path.join(process.cwd(), 'data', 'design-system-context.json');

/**
 * Load the base design system
 */
function loadDesignSystem() {
  try {
    if (fs.existsSync(DESIGN_SYSTEM_PATH)) {
      const content = fs.readFileSync(DESIGN_SYSTEM_PATH, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading design system:', error);
  }

  // Fallback to default design system
  return getDefaultDesignSystem();
}

/**
 * Default design system if file doesn't exist
 */
function getDefaultDesignSystem() {
  return {
    colors: {
      primary: { main: '#00d084', dark: '#00b372', light: '#1ad692' },
      background: { page: '#111111', surface: '#1a1a1a', card: '#1a1a1a' },
      text: { primary: '#f0f0f0', secondary: '#b5b5b5', subdued: '#8a8a8a' },
      border: { default: '#303030', subdued: '#262626', hover: '#404040' },
      status: { success: '#00d084', warning: '#f59e0b', error: '#ff6d6d', info: '#3b82f6' }
    },
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      googleFontUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
    },
    borderRadius: { sm: '4px', base: '6px', md: '8px', lg: '12px' },
    components: {
      button: {
        primary: { background: '#00d084', backgroundHover: '#00b372', text: '#ffffff' }
      },
      card: { background: '#1a1a1a', border: '1px solid #303030', borderRadius: '12px' },
      input: { background: '#1a1a1a', border: '1px solid #303030', text: '#f0f0f0' }
    }
  };
}

/**
 * Build theme context for AI generation
 * @param {Object} siteSettings - Optional site settings from database
 * @returns {Object} Theme context for AI prompts
 */
function buildThemeContext(siteSettings = {}) {
  const designSystem = loadDesignSystem();

  // Merge site settings with design system
  const theme = {
    colors: {
      primary: siteSettings.primary_color || designSystem.colors.primary.main,
      primaryDark: designSystem.colors.primary.dark,
      primaryLight: designSystem.colors.primary.light,
      secondary: siteSettings.secondary_color || designSystem.colors.status.info,
      background: designSystem.colors.background.page,
      surface: designSystem.colors.background.surface,
      card: designSystem.colors.background.card,
      text: designSystem.colors.text.primary,
      textSecondary: designSystem.colors.text.secondary,
      textSubdued: designSystem.colors.text.subdued,
      border: designSystem.colors.border.default,
      borderSubdued: designSystem.colors.border.subdued,
      success: designSystem.colors.status.success,
      warning: designSystem.colors.status.warning,
      error: designSystem.colors.status.error,
      info: designSystem.colors.status.info
    },
    typography: {
      fontFamily: siteSettings.font_family
        ? `'${siteSettings.font_family}', -apple-system, BlinkMacSystemFont, sans-serif`
        : designSystem.typography.fontFamily,
      googleFontUrl: designSystem.typography.googleFontUrl
    },
    borderRadius: designSystem.borderRadius,
    components: designSystem.components,
    effects: designSystem.effects,
    patterns: designSystem.patterns
  };

  return theme;
}

/**
 * Generate the theme prompt section for AI
 * @param {Object} siteSettings - Optional site settings from database
 * @returns {string} Theme section for AI system prompt
 */
function generateThemePromptSection(siteSettings = {}) {
  const theme = buildThemeContext(siteSettings);

  return `
## REQUIRED DESIGN SYSTEM (You MUST use these colors and fonts exactly)

### Required Font Import (Include in <head>)
<link href="${theme.typography.googleFontUrl}" rel="stylesheet">

### CSS Variables (Include in <style> tag)
:root {
  --color-primary: ${theme.colors.primary};
  --color-primary-dark: ${theme.colors.primaryDark};
  --color-secondary: ${theme.colors.secondary};
  --color-bg: ${theme.colors.background};
  --color-surface: ${theme.colors.surface};
  --color-card: ${theme.colors.card};
  --color-text: ${theme.colors.text};
  --color-text-secondary: ${theme.colors.textSecondary};
  --color-border: ${theme.colors.border};
  --color-success: ${theme.colors.success};
  --color-warning: ${theme.colors.warning};
  --color-error: ${theme.colors.error};
  --color-info: ${theme.colors.info};
  --font-family: ${theme.typography.fontFamily};
  --radius-sm: ${theme.borderRadius.sm};
  --radius-base: ${theme.borderRadius.base};
  --radius-lg: ${theme.borderRadius.lg};
}

body {
  font-family: var(--font-family);
  background-color: var(--color-bg);
  color: var(--color-text);
}

### Color Usage Rules (MUST FOLLOW)
- Page background: Use \`bg-[${theme.colors.background}]\` or \`var(--color-bg)\`
- Cards/sections: Use \`bg-[${theme.colors.surface}]\` or \`var(--color-surface)\`
- Primary buttons/accents: Use \`bg-[${theme.colors.primary}]\` with hover \`hover:bg-[${theme.colors.primaryDark}]\`
- Text: Use \`text-[${theme.colors.text}]\` for primary, \`text-[${theme.colors.textSecondary}]\` for secondary
- Borders: Use \`border-[${theme.colors.border}]\`

### Component Patterns
- **Buttons**: \`bg-[${theme.colors.primary}] hover:bg-[${theme.colors.primaryDark}] text-white font-semibold py-3 px-6 rounded-md transition-colors\`
- **Cards**: \`bg-[${theme.colors.surface}] border border-[${theme.colors.border}] rounded-xl p-6\`
- **Inputs**: \`bg-[${theme.colors.surface}] border border-[${theme.colors.border}] rounded-md px-4 py-3 text-[${theme.colors.text}] focus:border-[${theme.colors.primary}] focus:outline-none\`
- **Links**: \`text-[${theme.colors.primary}] hover:text-[${theme.colors.primaryDark}]\`

### Status Colors
- Success: \`${theme.colors.success}\`
- Warning: \`${theme.colors.warning}\`
- Error: \`${theme.colors.error}\`
- Info: \`${theme.colors.info}\`

**IMPORTANT**: Do NOT invent new colors. Use ONLY the colors defined above. All pages must look consistent.
`;
}

module.exports = {
  loadDesignSystem,
  buildThemeContext,
  generateThemePromptSection
};
