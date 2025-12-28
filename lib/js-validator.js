import { ESLint } from 'eslint';

/**
 * JavaScript validator for AI-generated code
 * Prevents dangerous patterns while allowing creative functionality
 */

/**
 * Validate JavaScript code for security and runtime safety
 * @param {string} code - JavaScript code to validate
 * @returns {Promise<Object>} - Validation result with errors and warnings
 */
export async function validateJavaScript(code) {
  if (!code || typeof code !== 'string') {
    return {
      valid: true,
      errors: [],
      warnings: [],
      sanitizedCode: ''
    };
  }

  const result = {
    valid: true,
    errors: [],
    warnings: [],
    sanitizedCode: code
  };

  try {
    // Step 1: Check for explicitly forbidden patterns
    const forbiddenPatterns = checkForbiddenPatterns(code);
    if (!forbiddenPatterns.valid) {
      result.valid = false;
      result.errors.push(...forbiddenPatterns.errors);
    }
    result.warnings.push(...forbiddenPatterns.warnings);

    // Step 2: ESLint validation for code quality and security
    const eslintResult = await runESLintValidation(code);
    if (!eslintResult.valid) {
      result.valid = false;
      result.errors.push(...eslintResult.errors);
    }
    result.warnings.push(...eslintResult.warnings);

    // Step 3: Check for common runtime errors
    const runtimeChecks = checkRuntimeSafety(code);
    if (!runtimeChecks.valid) {
      result.warnings.push(...runtimeChecks.warnings);
    }

    return result;
  } catch (error) {
    console.error('[JS-VALIDATOR] Error validating JavaScript:', error);
    return {
      valid: false,
      errors: [`Validation error: ${error.message}`],
      warnings: [],
      sanitizedCode: code
    };
  }
}

/**
 * Check for forbidden JavaScript patterns
 */
function checkForbiddenPatterns(code) {
  const errors = [];
  const warnings = [];

  // Dangerous patterns that should block code
  const dangerousPatterns = [
    {
      pattern: /eval\s*\(/gi,
      message: 'eval() is forbidden - it allows arbitrary code execution'
    },
    {
      pattern: /Function\s*\(\s*['"`]/gi,
      message: 'Dynamic function creation (new Function) is forbidden'
    },
    {
      pattern: /document\.write\s*\(/gi,
      message: 'document.write() is forbidden - it can break the page'
    },
    {
      pattern: /innerHTML\s*=(?![^<]*<)/gi, // Allow if setting to static strings only
      message: 'Direct innerHTML assignment with dynamic content is dangerous - use textContent or sanitize first'
    },
    {
      pattern: /__proto__|constructor\s*\[|prototype\s*\[/gi,
      message: 'Prototype pollution patterns detected'
    },
    {
      pattern: /import\s+.*\s+from|require\s*\(/gi,
      message: 'Module imports are not allowed in inline scripts - use CDN scripts instead'
    },
    {
      pattern: /fetch\s*\(\s*[`'"]/gi,
      message: 'Direct fetch calls detected - ensure you\'re using approved API endpoints only'
    }
  ];

  for (const { pattern, message } of dangerousPatterns) {
    const matches = code.match(pattern);
    if (matches) {
      // For fetch, make it a warning instead of error (allow API calls but warn)
      if (pattern.source.includes('fetch')) {
        warnings.push(`${message} (Found ${matches.length} occurrence(s))`);
      } else {
        errors.push(`${message} (Found ${matches.length} occurrence(s))`);
      }
    }
  }

  // Suspicious patterns (warnings only)
  const suspiciousPatterns = [
    {
      pattern: /localStorage|sessionStorage/gi,
      message: 'Storage API usage detected - ensure sensitive data is not stored'
    },
    {
      pattern: /document\.cookie/gi,
      message: 'Cookie access detected - ensure security best practices'
    },
    {
      pattern: /window\.location|window\.open/gi,
      message: 'Navigation/redirect detected - ensure user intent is clear'
    },
    {
      pattern: /XMLHttpRequest|\.ajax\(/gi,
      message: 'Legacy AJAX detected - consider using fetch() instead'
    },
    {
      pattern: /setInterval\s*\(/gi,
      message: 'setInterval detected - ensure proper cleanup to prevent memory leaks'
    },
    {
      pattern: /setTimeout\s*\(\s*['"`]/gi,
      message: 'setTimeout with string argument detected - use function instead'
    }
  ];

  for (const { pattern, message } of suspiciousPatterns) {
    if (pattern.test(code)) {
      warnings.push(message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Run ESLint validation programmatically
 */
async function runESLintValidation(code) {
  const errors = [];
  const warnings = [];

  try {
    const eslint = new ESLint({
      useEslintrc: false,
      overrideConfig: {
        env: {
          browser: true,
          es2021: true
        },
        parserOptions: {
          ecmaVersion: 2021,
          sourceType: 'script'
        },
        rules: {
          // Security rules (errors)
          'no-eval': 'error',
          'no-implied-eval': 'error',
          'no-new-func': 'error',
          'no-script-url': 'error',
          'no-proto': 'error',

          // Code quality rules (warnings)
          'no-unused-vars': 'warn',
          'no-undef': 'warn',
          'no-redeclare': 'warn',
          'no-unreachable': 'warn',

          // Best practices
          'no-debugger': 'warn',
          'no-console': 'off', // Allow console for debugging
          'no-alert': 'warn',

          // Prevent common errors
          'no-dupe-keys': 'error',
          'no-duplicate-case': 'error',
          'no-empty': 'warn',
          'no-ex-assign': 'error',
          'no-func-assign': 'error',
          'no-invalid-regexp': 'error',
          'no-irregular-whitespace': 'warn',
          'no-obj-calls': 'error',
          'no-sparse-arrays': 'warn',
          'no-unexpected-multiline': 'error',
          'use-isnan': 'error',
          'valid-typeof': 'error'
        }
      }
    });

    const results = await eslint.lintText(code);

    if (results && results[0]) {
      const messages = results[0].messages;

      for (const msg of messages) {
        const location = msg.line ? ` (line ${msg.line}:${msg.column})` : '';
        const message = `${msg.message}${location}`;

        if (msg.severity === 2) {
          // Error
          errors.push(message);
        } else if (msg.severity === 1) {
          // Warning
          warnings.push(message);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    // If ESLint fails, log but don't block (syntax errors will be caught at runtime)
    console.error('[JS-VALIDATOR] ESLint error:', error.message);
    return {
      valid: true,
      errors: [],
      warnings: [`ESLint validation skipped: ${error.message}`]
    };
  }
}

/**
 * Check for common runtime safety issues
 */
function checkRuntimeSafety(code) {
  const warnings = [];

  // Check for undefined variable access patterns
  const commonUndefinedPatterns = [
    {
      pattern: /\$\(/g,
      message: 'jQuery ($) detected but may not be loaded - ensure jQuery is included'
    },
    {
      pattern: /React\.|useState|useEffect/g,
      message: 'React detected but may not be loaded - ensure React is included'
    },
    {
      pattern: /Vue\.|ref\(|computed\(/g,
      message: 'Vue detected but may not be loaded - ensure Vue is included'
    }
  ];

  for (const { pattern, message } of commonUndefinedPatterns) {
    if (pattern.test(code)) {
      warnings.push(message);
    }
  }

  // Check for potential null reference errors
  if (/\.querySelector\(/.test(code) && !/null|undefined/.test(code)) {
    warnings.push('querySelector detected without null checks - ensure elements exist before accessing');
  }

  // Check for event listener cleanup
  if (/addEventListener/.test(code) && !/removeEventListener/.test(code)) {
    warnings.push('Event listeners added without cleanup - may cause memory leaks');
  }

  return {
    valid: true,
    warnings
  };
}

/**
 * Clean JavaScript code (remove markdown, comments if needed)
 */
export function cleanJavaScriptCode(jsCode) {
  if (!jsCode || typeof jsCode !== 'string') {
    return '';
  }

  let cleaned = jsCode;

  // Remove markdown code fences
  cleaned = cleaned.replace(/^```javascript?\n?/gm, '');
  cleaned = cleaned.replace(/^```js?\n?/gm, '');
  cleaned = cleaned.replace(/^```\n?/gm, '');
  cleaned = cleaned.replace(/```$/gm, '');

  // Trim
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Wrap code in error boundary to prevent page crashes
 */
export function wrapInErrorBoundary(code) {
  return `
(function() {
  'use strict';
  try {
    ${code}
  } catch (error) {
    console.error('[AI-Generated Code Error]:', error);
    // Optionally show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding: 20px; margin: 10px; background: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c00;';
    errorDiv.textContent = 'An error occurred in the page functionality. Please refresh the page.';
    document.body.insertBefore(errorDiv, document.body.firstChild);
  }
})();
`.trim();
}

export default {
  validateJavaScript,
  cleanJavaScriptCode,
  wrapInErrorBoundary
};
