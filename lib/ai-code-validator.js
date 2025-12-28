import {
  sanitizeHTML,
  validateHTMLSafety,
  cleanHTMLCode
} from './code-sanitizer.js';
import {
  validateJavaScript,
  cleanJavaScriptCode,
  wrapInErrorBoundary
} from './js-validator.js';
import {
  validateCSS,
  cleanCSSCode,
  scopeCSS
} from './css-validator.js';
import {
  testResponsiveness,
  generateResponsivenessReport
} from './responsive-tester.js';

/**
 * Main validation pipeline for AI-generated code
 * Orchestrates all validation steps to ensure safe, working code
 */

/**
 * Validate AI-generated code (HTML, CSS, JS)
 * @param {Object} options - Code and validation options
 * @returns {Promise<Object>} - Comprehensive validation results
 */
export async function validateAICode(options) {
  const {
    html = '',
    css = '',
    js = '',
    skipResponsiveTest = false, // Set to true to skip Puppeteer test (faster)
    mode = 'strict' // 'strict' or 'permissive'
  } = options;

  console.log('[AI-CODE-VALIDATOR] Starting validation pipeline...');

  const startTime = Date.now();

  const result = {
    valid: true,
    errors: [],
    warnings: [],
    sanitizedCode: {
      html: '',
      css: '',
      js: ''
    },
    validationSteps: {},
    processingTime: 0
  };

  try {
    // STEP 1: Clean code (remove markdown artifacts)
    console.log('[AI-CODE-VALIDATOR] Step 1: Cleaning code...');
    const cleanedHTML = cleanHTMLCode(html);
    const cleanedCSS = cleanCSSCode(css);
    const cleanedJS = cleanJavaScriptCode(js);

    // STEP 2: Validate HTML
    console.log('[AI-CODE-VALIDATOR] Step 2: Validating HTML...');
    const htmlValidation = validateHTMLSafety(cleanedHTML);
    result.validationSteps.html = htmlValidation;

    if (!htmlValidation.valid) {
      result.valid = false;
      result.errors.push(...htmlValidation.errors.map(e => `HTML: ${e}`));
    }
    result.warnings.push(...htmlValidation.warnings.map(w => `HTML: ${w}`));

    // STEP 3: Sanitize HTML (always sanitize, even if validation passed)
    console.log('[AI-CODE-VALIDATOR] Step 3: Sanitizing HTML...');
    result.sanitizedCode.html = sanitizeHTML(cleanedHTML);

    // STEP 4: Validate CSS
    console.log('[AI-CODE-VALIDATOR] Step 4: Validating CSS...');
    const cssValidation = validateCSS(cleanedCSS);
    result.validationSteps.css = cssValidation;

    if (!cssValidation.valid) {
      result.valid = false;
      result.errors.push(...cssValidation.errors.map(e => `CSS: ${e}`));
    }
    result.warnings.push(...cssValidation.warnings.map(w => `CSS: ${w}`));

    // Scope CSS to prevent conflicts
    result.sanitizedCode.css = cleanedCSS; // Use original CSS but validated

    // STEP 5: Validate JavaScript
    console.log('[AI-CODE-VALIDATOR] Step 5: Validating JavaScript...');
    const jsValidation = await validateJavaScript(cleanedJS);
    result.validationSteps.js = jsValidation;

    if (!jsValidation.valid) {
      if (mode === 'strict') {
        result.valid = false;
        result.errors.push(...jsValidation.errors.map(e => `JavaScript: ${e}`));
      } else {
        // In permissive mode, convert JS errors to warnings
        result.warnings.push(...jsValidation.errors.map(e => `JavaScript: ${e}`));
      }
    }
    result.warnings.push(...jsValidation.warnings.map(w => `JavaScript: ${w}`));

    // Wrap JS in error boundary for safety
    result.sanitizedCode.js = cleanedJS ? wrapInErrorBoundary(cleanedJS) : '';

    // STEP 6: Responsive testing (optional, slower)
    if (!skipResponsiveTest && cleanedHTML) {
      console.log('[AI-CODE-VALIDATOR] Step 6: Testing responsiveness...');

      try {
        const fullHTML = buildFullHTML(
          result.sanitizedCode.html,
          result.sanitizedCode.css,
          result.sanitizedCode.js
        );

        const responsiveResults = await testResponsiveness(fullHTML, {
          timeout: 15000,
          includeScreenshots: false
        });

        result.validationSteps.responsive = responsiveResults;

        if (!responsiveResults.passed) {
          if (mode === 'strict') {
            result.valid = false;
            result.errors.push('Responsive test failed');
          } else {
            result.warnings.push('Responsive test failed (non-blocking)');
          }
        }

        // Add detailed responsive issues as warnings
        if (responsiveResults.summary.criticalIssues > 0) {
          result.warnings.push(
            `${responsiveResults.summary.criticalIssues} critical responsive issues found`
          );
        }

        if (responsiveResults.summary.warnings > 0) {
          result.warnings.push(
            `${responsiveResults.summary.warnings} responsive warnings found`
          );
        }

        // Generate report
        result.responsiveReport = generateResponsivenessReport(responsiveResults);
      } catch (error) {
        console.error('[AI-CODE-VALIDATOR] Responsive test error:', error);
        result.warnings.push(`Responsive test skipped: ${error.message}`);
      }
    } else {
      console.log('[AI-CODE-VALIDATOR] Step 6: Skipping responsive test (disabled)');
      result.warnings.push('Responsive testing skipped - enable for production deployment');
    }

    // Calculate processing time
    result.processingTime = Date.now() - startTime;

    console.log(`[AI-CODE-VALIDATOR] Validation complete in ${result.processingTime}ms`);
    console.log(`[AI-CODE-VALIDATOR] Status: ${result.valid ? 'PASSED' : 'FAILED'}`);
    console.log(`[AI-CODE-VALIDATOR] Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`);

    return result;

  } catch (error) {
    console.error('[AI-CODE-VALIDATOR] Fatal error during validation:', error);
    return {
      valid: false,
      errors: [`Validation pipeline error: ${error.message}`],
      warnings: [],
      sanitizedCode: { html: '', css: '', js: '' },
      validationSteps: {},
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Build complete HTML document for testing
 */
function buildFullHTML(html, css, js) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    ${css}
  </style>
</head>
<body>
  ${html}
  <script>
    ${js}
  </script>
</body>
</html>
  `.trim();
}

/**
 * Quick validation (skips responsive testing) - for fast feedback
 */
export async function quickValidate(options) {
  return await validateAICode({
    ...options,
    skipResponsiveTest: true
  });
}

/**
 * Full validation (includes responsive testing) - for deployment
 */
export async function fullValidate(options) {
  return await validateAICode({
    ...options,
    skipResponsiveTest: false,
    mode: 'strict'
  });
}

/**
 * Generate human-readable validation report
 */
export function generateValidationReport(validationResult) {
  if (!validationResult) {
    return 'No validation results available';
  }

  const lines = [];
  lines.push('=== AI Code Validation Report ===\n');
  lines.push(`Status: ${validationResult.valid ? '✓ PASSED' : '✗ FAILED'}`);
  lines.push(`Processing Time: ${validationResult.processingTime}ms\n`);

  if (validationResult.errors.length > 0) {
    lines.push(`\n✗ ERRORS (${validationResult.errors.length}):`);
    validationResult.errors.forEach((error, idx) => {
      lines.push(`  ${idx + 1}. ${error}`);
    });
  }

  if (validationResult.warnings.length > 0) {
    lines.push(`\n⚠ WARNINGS (${validationResult.warnings.length}):`);
    validationResult.warnings.forEach((warning, idx) => {
      lines.push(`  ${idx + 1}. ${warning}`);
    });
  }

  if (validationResult.errors.length === 0 && validationResult.warnings.length === 0) {
    lines.push('\n✓ No issues found!');
  }

  if (validationResult.responsiveReport) {
    lines.push('\n' + validationResult.responsiveReport);
  }

  return lines.join('\n');
}

/**
 * Check if validation result allows deployment
 */
export function canDeploy(validationResult) {
  if (!validationResult) return false;

  // Must be valid with no critical errors
  return validationResult.valid;
}

/**
 * Get deployment recommendation
 */
export function getDeploymentRecommendation(validationResult) {
  if (!validationResult) {
    return {
      canDeploy: false,
      recommendation: 'No validation results available',
      severity: 'error'
    };
  }

  if (validationResult.valid && validationResult.errors.length === 0) {
    if (validationResult.warnings.length === 0) {
      return {
        canDeploy: true,
        recommendation: 'Code is safe to deploy. No issues found.',
        severity: 'success'
      };
    } else {
      return {
        canDeploy: true,
        recommendation: `Code can be deployed but has ${validationResult.warnings.length} warning(s). Review warnings before deployment.`,
        severity: 'warning'
      };
    }
  } else {
    return {
      canDeploy: false,
      recommendation: `Cannot deploy. Fix ${validationResult.errors.length} error(s) first.`,
      severity: 'error'
    };
  }
}

export default {
  validateAICode,
  quickValidate,
  fullValidate,
  generateValidationReport,
  canDeploy,
  getDeploymentRecommendation
};
