/**
 * CSS validator for AI-generated code
 * Prevents CSS conflicts, security exploits, and layout-breaking styles
 */

/**
 * Validate CSS code for security and compatibility
 * @param {string} css - CSS code to validate
 * @returns {Object} - Validation result with errors and warnings
 */
export function validateCSS(css) {
  if (!css || typeof css !== 'string') {
    return {
      valid: true,
      errors: [],
      warnings: [],
      sanitizedCSS: ''
    };
  }

  const result = {
    valid: true,
    errors: [],
    warnings: [],
    sanitizedCSS: css
  };

  // Step 1: Check for dangerous CSS patterns
  const securityCheck = checkCSSSecurity(css);
  if (!securityCheck.valid) {
    result.valid = false;
    result.errors.push(...securityCheck.errors);
  }

  // Step 2: Check for Tailwind conflicts
  const tailwindCheck = checkTailwindConflicts(css);
  result.warnings.push(...tailwindCheck.warnings);

  // Step 3: Check for layout-breaking styles
  const layoutCheck = checkLayoutSafety(css);
  result.warnings.push(...layoutCheck.warnings);

  // Step 4: Check for performance issues
  const performanceCheck = checkCSSPerformance(css);
  result.warnings.push(...performanceCheck.warnings);

  return result;
}

/**
 * Check for CSS security vulnerabilities
 */
function checkCSSSecurity(css) {
  const errors = [];

  // Dangerous patterns that can lead to XSS or code execution
  const dangerousPatterns = [
    {
      pattern: /javascript:/gi,
      message: 'JavaScript protocol in CSS is forbidden (XSS risk)'
    },
    {
      pattern: /vbscript:/gi,
      message: 'VBScript protocol in CSS is forbidden (XSS risk)'
    },
    {
      pattern: /data:text\/html/gi,
      message: 'Data URLs with HTML are forbidden (XSS risk)'
    },
    {
      pattern: /expression\s*\(/gi,
      message: 'CSS expressions are forbidden (IE vulnerability, XSS risk)'
    },
    {
      pattern: /behavior\s*:/gi,
      message: 'CSS behavior property is forbidden (IE vulnerability)'
    },
    {
      pattern: /-moz-binding/gi,
      message: '-moz-binding is forbidden (Firefox vulnerability)'
    },
    {
      pattern: /@import\s+url\s*\(/gi,
      message: '@import with external URLs can load malicious styles - use inline styles instead'
    },
    {
      pattern: /url\s*\(\s*['"]*javascript:/gi,
      message: 'JavaScript URLs in CSS are forbidden'
    }
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(css)) {
      errors.push(message);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check for potential Tailwind CSS conflicts
 */
function checkTailwindConflicts(css) {
  const warnings = [];

  // Patterns that might conflict with Tailwind utility classes
  const conflictPatterns = [
    {
      pattern: /\.(?:flex|grid|block|inline|hidden|absolute|relative|fixed|sticky)\s*\{/gi,
      message: 'Global utility class detected - may conflict with Tailwind. Consider using more specific selectors.'
    },
    {
      pattern: /\*\s*\{[^}]*(?:margin|padding|box-sizing)/gi,
      message: 'Universal selector (*) with layout properties detected - may interfere with Tailwind base styles'
    },
    {
      pattern: /!important/gi,
      message: '!important detected - may override Tailwind utilities. Use sparingly.'
    },
    {
      pattern: /@tailwind\s+(?:base|components|utilities)/gi,
      message: '@tailwind directives detected - these should only be in globals.css, not generated styles'
    }
  ];

  for (const { pattern, message } of conflictPatterns) {
    const matches = css.match(pattern);
    if (matches && matches.length > 3) { // Only warn if many conflicts
      warnings.push(`${message} (${matches.length} occurrences)`);
    }
  }

  // Check for hardcoded colors that might break dark mode
  const colorPattern = /#(?:[0-9a-fA-F]{3}){1,2}\b|rgb\(|rgba\(/g;
  const colorMatches = css.match(colorPattern);
  if (colorMatches && colorMatches.length > 10) {
    warnings.push(
      `Many hardcoded colors detected (${colorMatches.length}). Consider using Tailwind color classes or CSS variables for theme consistency.`
    );
  }

  return { warnings };
}

/**
 * Check for layout-breaking CSS patterns
 */
function checkLayoutSafety(css) {
  const warnings = [];

  // Patterns that commonly break responsive layouts
  const layoutIssues = [
    {
      pattern: /min-width\s*:\s*\d{4,}px/gi,
      message: 'Very large min-width detected - may break mobile layouts'
    },
    {
      pattern: /width\s*:\s*\d{4,}px/gi,
      message: 'Very large fixed width detected - may break responsive design'
    },
    {
      pattern: /height\s*:\s*100vh/gi,
      message: '100vh height detected - may cause issues on mobile browsers with address bars'
    },
    {
      pattern: /position\s*:\s*fixed/gi,
      message: 'position: fixed detected - ensure proper mobile behavior'
    },
    {
      pattern: /overflow\s*:\s*hidden/gi,
      message: 'overflow: hidden detected - may clip content unexpectedly'
    },
    {
      pattern: /z-index\s*:\s*\d{4,}/gi,
      message: 'Very high z-index detected - may conflict with existing modals/dropdowns'
    }
  ];

  for (const { pattern, message } of layoutIssues) {
    if (pattern.test(css)) {
      warnings.push(message);
    }
  }

  // Check for missing responsive design
  const hasMediaQueries = /@media/.test(css);
  const hasFixedWidths = /width\s*:\s*\d+px/gi.test(css);

  if (hasFixedWidths && !hasMediaQueries) {
    warnings.push(
      'Fixed pixel widths detected without media queries - design may not be responsive'
    );
  }

  return { warnings };
}

/**
 * Check for CSS performance issues
 */
function checkCSSPerformance(css) {
  const warnings = [];

  // Performance anti-patterns
  const performanceIssues = [
    {
      pattern: /\*\s+\*/gi,
      message: 'Universal descendant selector (*) detected - can impact performance'
    },
    {
      pattern: /\[[^\]]*=["'][^"']*\*[^"']*["']\]/gi,
      message: 'Attribute substring selectors detected - can be slow on large DOMs'
    },
    {
      pattern: /:not\([^)]*:not\(/gi,
      message: 'Nested :not() selectors detected - can impact performance'
    }
  ];

  for (const { pattern, message } of performanceIssues) {
    if (pattern.test(css)) {
      warnings.push(message);
    }
  }

  // Check for excessive animations
  const animationCount = (css.match(/@keyframes/gi) || []).length;
  if (animationCount > 10) {
    warnings.push(
      `Many animations detected (${animationCount} @keyframes) - may impact performance`
    );
  }

  // Check for large base64 images
  const base64Pattern = /url\s*\(\s*['"]?data:image\/[^)]{1000,}/gi;
  const base64Matches = css.match(base64Pattern);
  if (base64Matches) {
    warnings.push(
      `Large base64 images detected (${base64Matches.length}) - consider using external image files for better performance`
    );
  }

  return { warnings };
}

/**
 * Clean CSS code (remove markdown, minify if needed)
 */
export function cleanCSSCode(cssCode) {
  if (!cssCode || typeof cssCode !== 'string') {
    return '';
  }

  let cleaned = cssCode;

  // Remove markdown code fences
  cleaned = cleaned.replace(/^```css?\n?/gm, '');
  cleaned = cleaned.replace(/^```\n?/gm, '');
  cleaned = cleaned.replace(/```$/gm, '');

  // Trim
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Scope CSS to prevent global conflicts
 * Wraps all selectors with a unique scope class
 * Properly handles @media, @keyframes, @font-face, etc.
 */
export function scopeCSS(css, scopeClass = 'ai-generated-content') {
  if (!css || typeof css !== 'string') {
    return '';
  }

  // Store @keyframes and @font-face separately (don't scope them)
  const keyframes = [];
  const fontFaces = [];
  let processedCSS = css;

  // Extract @keyframes
  processedCSS = processedCSS.replace(/@keyframes\s+[\w-]+\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/g, (match) => {
    keyframes.push(match);
    return `/* __KEYFRAMES_${keyframes.length - 1}__ */`;
  });

  // Extract @font-face
  processedCSS = processedCSS.replace(/@font-face\s*\{[^}]+\}/g, (match) => {
    fontFaces.push(match);
    return `/* __FONTFACE_${fontFaces.length - 1}__ */`;
  });

  // Handle @media queries by scoping their contents
  processedCSS = processedCSS.replace(/@media[^{]+\{([\s\S]*?)\}\s*\}/g, (match, mediaContent) => {
    const scopedContent = scopeSelectors(mediaContent, scopeClass);
    return match.replace(mediaContent, scopedContent);
  });

  // Scope remaining regular selectors
  processedCSS = scopeSelectors(processedCSS, scopeClass);

  // Restore @keyframes
  keyframes.forEach((kf, i) => {
    processedCSS = processedCSS.replace(`/* __KEYFRAMES_${i}__ */`, kf);
  });

  // Restore @font-face
  fontFaces.forEach((ff, i) => {
    processedCSS = processedCSS.replace(`/* __FONTFACE_${i}__ */`, ff);
  });

  return processedCSS;
}

/**
 * Helper to scope individual selectors
 */
function scopeSelectors(css, scopeClass) {
  // Match selector blocks (selector { declarations })
  return css.replace(/([^{}@]+)\{([^{}]*)\}/g, (match, selector, declarations) => {
    // Skip if already handled or is an @-rule
    if (selector.trim().startsWith('@') || selector.includes('__KEYFRAMES_') || selector.includes('__FONTFACE_')) {
      return match;
    }

    // Split multiple selectors
    const selectors = selector.split(',').map(s => s.trim()).filter(Boolean);

    const scopedSelectors = selectors.map(sel => {
      // Skip :root, already scoped, or special selectors
      if (sel === ':root' || sel.includes(scopeClass) || sel.startsWith('@')) {
        return sel;
      }

      // Handle html, body, * special cases
      if (sel === 'html' || sel === 'body' || sel === '*') {
        return `.${scopeClass}`;
      }

      // Handle selectors starting with html/body
      if (sel.startsWith('html ') || sel.startsWith('body ')) {
        return `.${scopeClass} ${sel.replace(/^(html|body)\s+/, '')}`;
      }

      // Normal scoping
      return `.${scopeClass} ${sel}`;
    });

    return `${scopedSelectors.join(', ')} {${declarations}}`;
  });
}

/**
 * Add mobile-first responsive wrappers to CSS
 */
export function ensureResponsiveCSS(css) {
  // Check if already has mobile responsiveness
  if (/@media.*max-width|@media.*min-width/.test(css)) {
    return css; // Already responsive
  }

  // If no media queries, add a warning comment
  return `/* Generated CSS - add media queries for mobile responsiveness */\n${css}`;
}

/**
 * Design system CSS variables for dark theme with emerald accents
 */
const DESIGN_SYSTEM_VARIABLES = `
:root {
  /* Primary Colors */
  --color-primary: #00d084;
  --color-primary-hover: #00b372;
  --color-primary-light: #1ad692;
  --color-primary-surface: rgba(0, 208, 132, 0.08);
  --color-primary-glow: rgba(0, 208, 132, 0.3);

  /* Background Colors */
  --color-bg: #111111;
  --color-bg-secondary: #181818;
  --color-surface: #1a1a1a;
  --color-surface-neutral: #202020;
  --color-surface-subdued: #2a2a2a;

  /* Text Colors */
  --color-text: #f0f0f0;
  --color-text-secondary: #b5b5b5;
  --color-text-subdued: #8a8a8a;
  --color-text-disabled: #6a6a6a;

  /* Border Colors */
  --color-border: #303030;
  --color-border-subdued: #262626;
  --color-border-hover: #404040;

  /* Status Colors */
  --color-success: #00d084;
  --color-warning: #f59e0b;
  --color-error: #ff6d6d;
  --color-info: #3b82f6;

  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 2rem;
  --font-size-4xl: 2.5rem;

  /* Spacing */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-12: 3rem;
  --spacing-16: 4rem;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-base: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-base: 0 0 0 1px rgba(255, 255, 255, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.4);
  --shadow-md: 0 0 0 1px rgba(255, 255, 255, 0.05), 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 0 0 1px rgba(255, 255, 255, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 20px var(--color-primary-glow);

  /* Transitions */
  --transition-fast: 100ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}
`;

/**
 * Inject design system CSS variables if not present
 */
export function injectDesignSystemVariables(css) {
  if (!css || typeof css !== 'string') return DESIGN_SYSTEM_VARIABLES;

  // Check if :root block already exists with our variables
  if (css.includes('--color-primary:') && css.includes('--color-bg:')) {
    return css;
  }

  // Prepend design system variables
  return DESIGN_SYSTEM_VARIABLES + '\n\n' + css;
}

/**
 * Check if CSS follows the design system theme
 */
export function checkThemeConsistency(css) {
  const warnings = [];

  if (!css || typeof css !== 'string') return { consistent: true, warnings };

  // Check for off-theme colors (non-dark backgrounds, non-emerald accents)
  const offThemePatterns = [
    {
      pattern: /background(?:-color)?\s*:\s*(?:#f|#e|#d|#c|white|#fff)/gi,
      message: 'Light background color detected - use dark theme colors (--color-bg, --color-surface)'
    },
    {
      pattern: /(?:^|[^-])color\s*:\s*(?:#[0-3]|#000|black)/gim,
      message: 'Dark text color detected - use light text colors (--color-text, --color-text-secondary)'
    },
    {
      pattern: /(?:background|border)(?:-color)?\s*:\s*(?:#(?:3b82f6|ef4444|f59e0b|22c55e|8b5cf6)[^;]*;)/gi,
      message: 'Non-emerald accent color detected - primary accent should be #00d084'
    }
  ];

  for (const { pattern, message } of offThemePatterns) {
    const matches = css.match(pattern);
    if (matches && matches.length > 2) {
      warnings.push(`${message} (${matches.length} occurrences)`);
    }
  }

  // Check if using CSS variables
  const usesVariables = /var\(--color-/.test(css);
  const hasHardcodedColors = /#[0-9a-fA-F]{3,6}/.test(css);

  if (hasHardcodedColors && !usesVariables) {
    warnings.push('Hardcoded colors used without CSS variables - consider using var(--color-*) for theme consistency');
  }

  return {
    consistent: warnings.length === 0,
    warnings
  };
}

/**
 * Add base reset styles for AI-generated content
 */
export function addBaseResets(css, scopeClass = 'ai-generated-content') {
  const resets = `
/* Base resets for AI-generated content */
.${scopeClass} {
  font-family: var(--font-family, 'Inter', sans-serif);
  color: var(--color-text, #f0f0f0);
  line-height: 1.5;
}

.${scopeClass} *, .${scopeClass} *::before, .${scopeClass} *::after {
  box-sizing: border-box;
}

.${scopeClass} a {
  color: var(--color-primary, #00d084);
  text-decoration: none;
  transition: color var(--transition-base, 200ms ease);
}

.${scopeClass} a:hover {
  color: var(--color-primary-hover, #00b372);
}

.${scopeClass} button {
  cursor: pointer;
  font-family: inherit;
}

.${scopeClass} img {
  max-width: 100%;
  height: auto;
}
`;

  return resets + '\n\n' + css;
}

/**
 * Full CSS processing pipeline for AI-generated CSS
 */
export function processAIGeneratedCSS(css, options = {}) {
  const {
    scopeClass = 'ai-generated-content',
    injectVariables = true,
    addResets = true,
    scopeSelectors = true
  } = options;

  if (!css || typeof css !== 'string') return '';

  let processed = cleanCSSCode(css);

  // Inject design system variables
  if (injectVariables) {
    processed = injectDesignSystemVariables(processed);
  }

  // Add base resets
  if (addResets) {
    processed = addBaseResets(processed, scopeClass);
  }

  // Scope selectors to prevent conflicts
  if (scopeSelectors) {
    processed = scopeCSS(processed, scopeClass);
  }

  return processed;
}

export default {
  validateCSS,
  cleanCSSCode,
  scopeCSS,
  ensureResponsiveCSS,
  injectDesignSystemVariables,
  checkThemeConsistency,
  addBaseResets,
  processAIGeneratedCSS,
  DESIGN_SYSTEM_VARIABLES
};
