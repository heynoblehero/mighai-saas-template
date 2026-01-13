/**
 * Post-Generation Code Fixer
 * Automatically fixes common AI generation errors to prevent runtime issues
 */

/**
 * Main fixer function - applies all fixes to generated code
 * @param {Object} code - { html, css, js }
 * @returns {Object} - Fixed code with applied fixes list
 */
export function fixGeneratedCode({ html = '', css = '', js = '' }) {
  const appliedFixes = [];

  // Fix HTML
  const fixedHTML = fixHTML(html, appliedFixes);

  // Fix CSS
  const fixedCSS = fixCSS(css, appliedFixes);

  // Fix JavaScript
  const fixedJS = fixJS(js, appliedFixes);

  return {
    html: fixedHTML,
    css: fixedCSS,
    js: fixedJS,
    appliedFixes
  };
}

/**
 * Fix common HTML issues
 */
function fixHTML(html, fixes) {
  if (!html || typeof html !== 'string') return '';

  let fixed = html;

  // Remove markdown code blocks if present
  if (fixed.includes('```html')) {
    fixed = fixed.replace(/```html\s*/gi, '').replace(/```\s*$/gi, '');
    fixes.push('Removed markdown code blocks from HTML');
  }

  // Fix self-closing tags that aren't properly closed
  const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
  selfClosingTags.forEach(tag => {
    const regex = new RegExp(`<${tag}([^>]*[^/])>`, 'gi');
    const before = fixed;
    fixed = fixed.replace(regex, `<${tag}$1 />`);
    if (before !== fixed) {
      fixes.push(`Fixed self-closing <${tag}> tags`);
    }
  });

  // Remove dangerous inline event handlers (onclick, onload, etc.)
  const beforeInline = fixed;
  fixed = fixed.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  if (beforeInline !== fixed) {
    fixes.push('Removed inline event handlers for security');
  }

  // Ensure viewport meta tag exists for responsive design
  if (!fixed.includes('viewport') && fixed.includes('<head')) {
    fixed = fixed.replace(/<head([^>]*)>/i, '<head$1>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    fixes.push('Added viewport meta tag');
  }

  // Ensure charset is specified
  if (!fixed.includes('charset') && fixed.includes('<head')) {
    fixed = fixed.replace(/<head([^>]*)>/i, '<head$1>\n  <meta charset="UTF-8">');
    fixes.push('Added charset meta tag');
  }

  // Fix unclosed tags (basic check for common elements)
  const elementsToCheck = ['div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside', 'span', 'p', 'ul', 'ol', 'li'];
  elementsToCheck.forEach(tag => {
    const openCount = (fixed.match(new RegExp(`<${tag}[^>]*>`, 'gi')) || []).length;
    const closeCount = (fixed.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
    if (openCount > closeCount) {
      // Add missing closing tags at the end
      for (let i = 0; i < openCount - closeCount; i++) {
        fixed += `</${tag}>`;
      }
      fixes.push(`Added ${openCount - closeCount} missing </${tag}> tags`);
    }
  });

  return fixed.trim();
}

/**
 * Fix common CSS issues
 */
function fixCSS(css, fixes) {
  if (!css || typeof css !== 'string') return '';

  let fixed = css;

  // Remove markdown code blocks
  if (fixed.includes('```css')) {
    fixed = fixed.replace(/```css\s*/gi, '').replace(/```\s*$/gi, '');
    fixes.push('Removed markdown code blocks from CSS');
  }

  // Fix missing semicolons before closing braces
  const beforeSemicolon = fixed;
  fixed = fixed.replace(/([a-z0-9%"')]+)\s*\}/gi, '$1;\n}');
  // Clean up double semicolons
  fixed = fixed.replace(/;;\s*\}/g, ';\n}');
  if (beforeSemicolon !== fixed) {
    fixes.push('Fixed missing semicolons in CSS');
  }

  // Ensure root variables block exists for the design system
  if (!fixed.includes(':root') && !fixed.includes('--color-')) {
    const rootVars = `:root {
  --color-primary: #00d084;
  --color-primary-hover: #00b372;
  --color-bg: #111111;
  --color-surface: #1a1a1a;
  --color-surface-subdued: #2a2a2a;
  --color-text: #f0f0f0;
  --color-text-secondary: #b5b5b5;
  --color-border: #303030;
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --radius-base: 6px;
  --radius-lg: 12px;
  --transition-base: 200ms ease;
}

`;
    fixed = rootVars + fixed;
    fixes.push('Added design system CSS variables');
  }

  // Add box-sizing reset if not present
  if (!fixed.includes('box-sizing')) {
    fixed = `*, *::before, *::after { box-sizing: border-box; }\n\n` + fixed;
    fixes.push('Added box-sizing reset');
  }

  // Fix font-family to use Inter if not specified
  if (!fixed.includes('font-family') && !fixed.includes('Inter')) {
    fixed = `body { font-family: var(--font-family, 'Inter', sans-serif); }\n\n` + fixed;
    fixes.push('Added default font-family');
  }

  return fixed.trim();
}

/**
 * Fix common JavaScript issues
 */
function fixJS(js, fixes) {
  if (!js || typeof js !== 'string') return '';

  let fixed = js.trim();

  // Remove markdown code blocks
  if (fixed.includes('```javascript') || fixed.includes('```js')) {
    fixed = fixed.replace(/```(?:javascript|js)\s*/gi, '').replace(/```\s*$/gi, '');
    fixes.push('Removed markdown code blocks from JS');
  }

  // If empty or trivial, return as-is
  if (fixed.length < 10) return fixed;

  // Wrap in DOMContentLoaded if not already wrapped
  const hasDOMContentLoaded = fixed.includes('DOMContentLoaded') || fixed.includes('window.onload') || fixed.includes('$(document).ready');
  if (!hasDOMContentLoaded) {
    fixed = `document.addEventListener('DOMContentLoaded', function() {\n${fixed}\n});`;
    fixes.push('Wrapped JS in DOMContentLoaded');
  }

  // Add try-catch wrapper for error handling
  if (!fixed.includes('try {') && !fixed.includes('try{')) {
    // Wrap the inner content (not the DOMContentLoaded wrapper)
    if (fixed.includes('DOMContentLoaded')) {
      fixed = fixed.replace(
        /(DOMContentLoaded['"]?,\s*function\s*\(\)\s*\{)([\s\S]*?)(\}\s*\);?\s*$)/,
        (match, start, content, end) => {
          return `${start}\n  try {\n${content}\n  } catch (error) {\n    console.error('[Page Error]:', error);\n  }\n${end}`;
        }
      );
    } else {
      fixed = `try {\n${fixed}\n} catch (error) {\n  console.error('[Page Error]:', error);\n}`;
    }
    fixes.push('Added try-catch error handling');
  }

  // Add null checks for querySelector calls
  fixed = addNullChecks(fixed, fixes);

  // Fix common patterns that cause errors
  fixed = fixCommonJSErrors(fixed, fixes);

  return fixed.trim();
}

/**
 * Add null checks for DOM queries
 */
function addNullChecks(js, fixes) {
  let fixed = js;
  let addedChecks = false;

  // Pattern: const/let/var x = document.querySelector(...) followed by x.something
  // This is complex, so we'll use a simpler approach: add a helper function

  // Check if helper already exists
  if (!fixed.includes('function safeQuery')) {
    // Add safe query helper at the beginning (after DOMContentLoaded if present)
    const safeQueryHelper = `
  // Safe DOM query helper
  function safeQuery(selector) {
    const el = document.querySelector(selector);
    if (!el) console.warn('Element not found:', selector);
    return el;
  }
  function safeQueryAll(selector) {
    return document.querySelectorAll(selector);
  }
`;

    if (fixed.includes('DOMContentLoaded')) {
      fixed = fixed.replace(
        /(DOMContentLoaded['"]?,\s*function\s*\(\)\s*\{)/,
        `$1\n${safeQueryHelper}`
      );
    } else {
      fixed = safeQueryHelper + '\n' + fixed;
    }

    addedChecks = true;
  }

  // Replace direct querySelector calls with safeQuery (optional - might be too aggressive)
  // For now, just add optional chaining where possible
  const beforeChaining = fixed;
  fixed = fixed.replace(
    /(\w+)\.addEventListener\(/g,
    '$1?.addEventListener('
  );
  fixed = fixed.replace(
    /(\w+)\.classList\./g,
    '$1?.classList.'
  );
  fixed = fixed.replace(
    /(\w+)\.style\./g,
    '$1?.style.'
  );

  if (beforeChaining !== fixed || addedChecks) {
    fixes.push('Added null-safety checks for DOM operations');
  }

  return fixed;
}

/**
 * Fix common JavaScript errors
 */
function fixCommonJSErrors(js, fixes) {
  let fixed = js;

  // Fix forEach on potentially null NodeList
  const beforeNodeList = fixed;
  fixed = fixed.replace(
    /document\.querySelectorAll\(['"]([^'"]+)['"]\)\.forEach/g,
    'Array.from(document.querySelectorAll("$1")).forEach'
  );
  if (beforeNodeList !== fixed) {
    fixes.push('Fixed NodeList.forEach compatibility');
  }

  // Remove any eval() calls (security)
  if (fixed.includes('eval(')) {
    fixed = fixed.replace(/eval\s*\([^)]+\)/g, '/* eval removed for security */');
    fixes.push('Removed eval() calls for security');
  }

  // Remove document.write (breaks page)
  if (fixed.includes('document.write')) {
    fixed = fixed.replace(/document\.write\s*\([^)]+\)/g, '/* document.write removed */');
    fixes.push('Removed document.write calls');
  }

  return fixed;
}

/**
 * Scope CSS to prevent conflicts with global styles
 * @param {string} css - CSS to scope
 * @param {string} scopeClass - Class to prefix selectors with
 * @returns {string} - Scoped CSS
 */
export function scopeCSS(css, scopeClass = 'ai-generated-page') {
  if (!css || typeof css !== 'string') return '';

  // Extract and preserve @keyframes (don't scope animation names)
  const keyframes = [];
  let scopedCSS = css.replace(/@keyframes\s+([\w-]+)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g, (match, name, content) => {
    keyframes.push(match);
    return `/* @keyframes ${name} preserved */`;
  });

  // Extract and preserve @font-face
  const fontFaces = [];
  scopedCSS = scopedCSS.replace(/@font-face\s*\{[^}]+\}/g, (match) => {
    fontFaces.push(match);
    return `/* @font-face preserved */`;
  });

  // Process @media queries
  scopedCSS = scopedCSS.replace(/@media[^{]+\{([\s\S]*?)\}\s*\}/g, (match, content) => {
    const scopedContent = scopeSelectors(content, scopeClass);
    return match.replace(content, scopedContent);
  });

  // Scope remaining selectors
  scopedCSS = scopeSelectors(scopedCSS, scopeClass);

  // Restore @keyframes
  keyframes.forEach((kf, i) => {
    scopedCSS = scopedCSS.replace(`/* @keyframes ${kf.match(/@keyframes\s+([\w-]+)/)?.[1]} preserved */`, kf);
  });

  // Restore @font-face
  fontFaces.forEach((ff, i) => {
    scopedCSS = scopedCSS.replace(`/* @font-face preserved */`, ff);
  });

  return scopedCSS;
}

/**
 * Scope individual selectors
 */
function scopeSelectors(css, scopeClass) {
  return css.replace(/([^{}@]+)\{/g, (match, selectors) => {
    // Skip @rules, :root, and already scoped selectors
    if (selectors.trim().startsWith('@') ||
        selectors.trim().startsWith(':root') ||
        selectors.includes(scopeClass)) {
      return match;
    }

    const scopedSelectors = selectors.split(',').map(selector => {
      selector = selector.trim();
      if (!selector) return selector;

      // Handle html, body, * selectors
      if (selector === 'html' || selector === 'body' || selector === '*') {
        return `.${scopeClass}`;
      }

      // Handle selectors starting with html or body
      if (selector.startsWith('html ') || selector.startsWith('body ')) {
        return `.${scopeClass} ${selector.replace(/^(html|body)\s+/, '')}`;
      }

      return `.${scopeClass} ${selector}`;
    }).join(', ');

    return `${scopedSelectors} {`;
  });
}

/**
 * Remove duplicate analytics/tracking code
 * @param {Object} code - { html, js }
 * @returns {Object} - Cleaned code
 */
export function removeAnalyticsDuplicates({ html, js }) {
  const analyticsPatterns = [
    /window\.Analytics\s*=/,
    /window\.Heatmap\s*=/,
    /["']\/analytics\.js["']/,
    /["']\/heatmap\.js["']/,
    /gtag\s*\(/,
    /ga\s*\(/,
    /dataLayer\.push/,
    /hotjar/i,
    /clarity\s*\(/i,
    /mixpanel/i
  ];

  let cleanedHTML = html || '';
  let cleanedJS = js || '';

  analyticsPatterns.forEach(pattern => {
    // Remove script tags containing analytics
    cleanedHTML = cleanedHTML.replace(
      new RegExp(`<script[^>]*>[\\s\\S]*?${pattern.source}[\\s\\S]*?<\\/script>`, 'gi'),
      '<!-- Analytics code removed (global) -->'
    );

    // Remove from JS
    if (pattern.test(cleanedJS)) {
      cleanedJS = cleanedJS.replace(
        new RegExp(`[^;\\n]*${pattern.source}[^;\\n]*;?`, 'g'),
        '/* Analytics code removed (global) */'
      );
    }
  });

  return { html: cleanedHTML, js: cleanedJS };
}

export default {
  fixGeneratedCode,
  scopeCSS,
  removeAnalyticsDuplicates
};
