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
 */
export function scopeCSS(css, scopeClass = 'ai-generated-content') {
  if (!css || typeof css !== 'string') {
    return '';
  }

  // Parse and scope CSS rules
  const rules = css.split('}').filter(rule => rule.trim());

  const scopedRules = rules.map(rule => {
    const [selector, ...declarationParts] = rule.split('{');
    if (!selector || !declarationParts.length) return rule;

    const declaration = declarationParts.join('{');

    // Split multiple selectors
    const selectors = selector.split(',').map(s => s.trim());

    // Scope each selector
    const scopedSelectors = selectors.map(sel => {
      // Skip @-rules, :root, and already scoped selectors
      if (sel.startsWith('@') || sel.startsWith(':root') || sel.includes(scopeClass)) {
        return sel;
      }

      // Add scope class
      return `.${scopeClass} ${sel}`;
    });

    return `${scopedSelectors.join(', ')} { ${declaration}`;
  });

  return scopedRules.join(' }\n') + ' }';
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

export default {
  validateCSS,
  cleanCSSCode,
  scopeCSS,
  ensureResponsiveCSS
};
