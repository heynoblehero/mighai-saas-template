import puppeteer from 'puppeteer';

/**
 * Mobile responsiveness tester for AI-generated pages
 * Tests pages across multiple viewports to catch layout issues
 */

// Standard viewports to test
const VIEWPORTS = [
  {
    name: 'mobile-small',
    width: 320,
    height: 568,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  {
    name: 'mobile',
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  {
    name: 'mobile-large',
    width: 414,
    height: 896,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  },
  {
    name: 'tablet',
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  {
    name: 'desktop',
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  }
];

/**
 * Test HTML responsiveness across multiple viewports
 * @param {string} html - Complete HTML document
 * @param {Object} options - Testing options
 * @returns {Promise<Object>} - Test results with issues found
 */
export async function testResponsiveness(html, options = {}) {
  const {
    viewports = VIEWPORTS,
    timeout = 30000,
    includeScreenshots = false
  } = options;

  let browser;
  const results = {
    passed: true,
    viewportResults: [],
    summary: {
      totalIssues: 0,
      criticalIssues: 0,
      warnings: 0
    }
  };

  try {
    // Launch browser in headless mode
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    // Test each viewport
    for (const viewport of viewports) {
      const viewportResult = await testViewport(browser, html, viewport, {
        timeout,
        includeScreenshots
      });

      results.viewportResults.push(viewportResult);

      // Update summary
      results.summary.totalIssues += viewportResult.issues.length;
      results.summary.criticalIssues += viewportResult.issues.filter(
        i => i.severity === 'critical'
      ).length;
      results.summary.warnings += viewportResult.issues.filter(
        i => i.severity === 'warning'
      ).length;

      // Mark as failed if critical issues found
      if (viewportResult.issues.some(i => i.severity === 'critical')) {
        results.passed = false;
      }
    }

    return results;
  } catch (error) {
    console.error('[RESPONSIVE-TESTER] Error during testing:', error);
    return {
      passed: false,
      error: error.message,
      viewportResults: [],
      summary: {
        totalIssues: 1,
        criticalIssues: 1,
        warnings: 0
      }
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Test a single viewport
 */
async function testViewport(browser, html, viewport, options) {
  const { timeout, includeScreenshots } = options;
  const page = await browser.newPage();

  const result = {
    viewport: viewport.name,
    dimensions: `${viewport.width}x${viewport.height}`,
    issues: [],
    metrics: {}
  };

  try {
    // Set viewport
    await page.setViewport(viewport);

    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout
    });

    // Wait a bit for CSS animations/transitions
    await page.waitForTimeout(500);

    // Run layout checks
    const layoutIssues = await checkLayout(page, viewport);
    result.issues.push(...layoutIssues);

    // Check for horizontal scrolling
    const scrollIssues = await checkScrolling(page, viewport);
    result.issues.push(...scrollIssues);

    // Check for overlapping elements
    const overlapIssues = await checkOverlapping(page);
    result.issues.push(...overlapIssues);

    // Check for invisible/clipped content
    const visibilityIssues = await checkVisibility(page, viewport);
    result.issues.push(...visibilityIssues);

    // Check for touch target sizes (mobile only)
    if (viewport.isMobile) {
      const touchIssues = await checkTouchTargets(page);
      result.issues.push(...touchIssues);
    }

    // Collect performance metrics
    result.metrics = await page.metrics();

    // Capture screenshot if requested
    if (includeScreenshots) {
      result.screenshot = await page.screenshot({
        encoding: 'base64',
        fullPage: true
      });
    }

    // Check for JavaScript errors
    const jsErrors = await checkJavaScriptErrors(page);
    result.issues.push(...jsErrors);

  } catch (error) {
    result.issues.push({
      type: 'error',
      severity: 'critical',
      message: `Failed to test viewport: ${error.message}`
    });
  } finally {
    await page.close();
  }

  return result;
}

/**
 * Check for layout issues
 */
async function checkLayout(page, viewport) {
  return await page.evaluate((viewportWidth) => {
    const issues = [];

    // Check body width
    const bodyWidth = document.body.scrollWidth;
    if (bodyWidth > viewportWidth) {
      issues.push({
        type: 'layout',
        severity: 'critical',
        message: `Page width (${bodyWidth}px) exceeds viewport width (${viewportWidth}px)`
      });
    }

    // Check all elements
    const allElements = document.querySelectorAll('*');
    const problematicElements = [];

    allElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);

      // Skip hidden elements
      if (styles.display === 'none' || styles.visibility === 'hidden') {
        return;
      }

      // Check if element exceeds viewport
      if (rect.width > viewportWidth) {
        const tagInfo = el.tagName.toLowerCase() +
          (el.className ? `.${el.className.split(' ')[0]}` : '') +
          (el.id ? `#${el.id}` : '');

        problematicElements.push({
          element: tagInfo,
          width: Math.round(rect.width),
          exceeds: Math.round(rect.width - viewportWidth)
        });
      }
    });

    if (problematicElements.length > 0) {
      const topOffenders = problematicElements
        .sort((a, b) => b.exceeds - a.exceeds)
        .slice(0, 5);

      issues.push({
        type: 'layout',
        severity: 'critical',
        message: `${problematicElements.length} element(s) exceed viewport width`,
        details: topOffenders
      });
    }

    return issues;
  }, viewport.width);
}

/**
 * Check for unwanted scrolling
 */
async function checkScrolling(page, viewport) {
  return await page.evaluate((viewportWidth, viewportHeight) => {
    const issues = [];

    const hasHorizontalScroll = document.documentElement.scrollWidth > viewportWidth;
    const documentHeight = document.documentElement.scrollHeight;

    if (hasHorizontalScroll) {
      const scrollAmount = document.documentElement.scrollWidth - viewportWidth;
      issues.push({
        type: 'scroll',
        severity: 'critical',
        message: `Horizontal scrollbar present (${scrollAmount}px overflow)`
      });
    }

    // Check for excessive vertical content (warning only)
    if (documentHeight > viewportHeight * 10) {
      issues.push({
        type: 'scroll',
        severity: 'warning',
        message: `Very long page (${Math.round(documentHeight / viewportHeight)}x viewport height) - consider pagination`
      });
    }

    return issues;
  }, viewport.width, viewport.height);
}

/**
 * Check for overlapping elements
 */
async function checkOverlapping(page) {
  return await page.evaluate(() => {
    const issues = [];
    const elements = Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const styles = window.getComputedStyle(el);
        return styles.display !== 'none' && styles.visibility !== 'hidden';
      });

    const overlaps = [];

    for (let i = 0; i < elements.length; i++) {
      const el1 = elements[i];
      const rect1 = el1.getBoundingClientRect();

      if (rect1.width === 0 || rect1.height === 0) continue;

      for (let j = i + 1; j < elements.length; j++) {
        const el2 = elements[j];

        // Skip if parent-child relationship
        if (el1.contains(el2) || el2.contains(el1)) continue;

        const rect2 = el2.getBoundingClientRect();
        if (rect2.width === 0 || rect2.height === 0) continue;

        // Check for overlap
        const overlap = !(
          rect1.right < rect2.left ||
          rect1.left > rect2.right ||
          rect1.bottom < rect2.top ||
          rect1.top > rect2.bottom
        );

        if (overlap) {
          const zIndex1 = window.getComputedStyle(el1).zIndex;
          const zIndex2 = window.getComputedStyle(el2).zIndex;

          // Only report if both have same z-index (potential issue)
          if (zIndex1 === zIndex2) {
            overlaps.push({
              element1: el1.tagName.toLowerCase(),
              element2: el2.tagName.toLowerCase()
            });
          }
        }
      }
    }

    if (overlaps.length > 0 && overlaps.length < 50) { // Don't report if too many (likely intentional)
      issues.push({
        type: 'overlap',
        severity: 'warning',
        message: `${overlaps.length} potentially overlapping elements detected`,
        details: overlaps.slice(0, 5)
      });
    }

    return issues;
  });
}

/**
 * Check for visibility issues
 */
async function checkVisibility(page, viewport) {
  return await page.evaluate((viewportWidth, viewportHeight) => {
    const issues = [];
    const elements = document.querySelectorAll('*');

    let clippedElements = 0;
    let offscreenElements = 0;

    elements.forEach(el => {
      const styles = window.getComputedStyle(el);

      if (styles.display === 'none' || styles.visibility === 'hidden') {
        return;
      }

      const rect = el.getBoundingClientRect();

      // Check if element is clipped
      if (styles.overflow === 'hidden' && el.scrollHeight > el.clientHeight) {
        clippedElements++;
      }

      // Check if element is off-screen (negative positions)
      if (rect.left < -100 || rect.top < -100) {
        offscreenElements++;
      }
    });

    if (clippedElements > 10) {
      issues.push({
        type: 'visibility',
        severity: 'warning',
        message: `${clippedElements} elements have overflow:hidden with clipped content`
      });
    }

    if (offscreenElements > 0) {
      issues.push({
        type: 'visibility',
        severity: 'warning',
        message: `${offscreenElements} elements positioned off-screen`
      });
    }

    return issues;
  }, viewport.width, viewport.height);
}

/**
 * Check touch target sizes for mobile
 */
async function checkTouchTargets(page) {
  return await page.evaluate(() => {
    const issues = [];
    const MIN_TOUCH_SIZE = 44; // 44x44px is recommended minimum

    const interactiveElements = document.querySelectorAll(
      'a, button, input, select, textarea, [onclick], [role="button"]'
    );

    const smallTargets = [];

    interactiveElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);

      if (styles.display === 'none' || styles.visibility === 'hidden') {
        return;
      }

      if (rect.width < MIN_TOUCH_SIZE || rect.height < MIN_TOUCH_SIZE) {
        smallTargets.push({
          element: el.tagName.toLowerCase(),
          size: `${Math.round(rect.width)}x${Math.round(rect.height)}px`
        });
      }
    });

    if (smallTargets.length > 0) {
      issues.push({
        type: 'touch-targets',
        severity: 'warning',
        message: `${smallTargets.length} interactive elements smaller than 44x44px`,
        details: smallTargets.slice(0, 5)
      });
    }

    return issues;
  });
}

/**
 * Check for JavaScript runtime errors
 */
async function checkJavaScriptErrors(page) {
  const issues = [];

  page.on('pageerror', error => {
    issues.push({
      type: 'javascript',
      severity: 'critical',
      message: `JavaScript error: ${error.message}`
    });
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      issues.push({
        type: 'console',
        severity: 'warning',
        message: `Console error: ${msg.text()}`
      });
    }
  });

  return issues;
}

/**
 * Generate a quick responsiveness report
 */
export function generateResponsivenessReport(results) {
  if (!results || !results.viewportResults) {
    return 'No test results available';
  }

  const lines = [];
  lines.push('=== Responsiveness Test Report ===\n');
  lines.push(`Overall Status: ${results.passed ? '✓ PASSED' : '✗ FAILED'}\n`);
  lines.push(`Total Issues: ${results.summary.totalIssues}`);
  lines.push(`Critical: ${results.summary.criticalIssues}, Warnings: ${results.summary.warnings}\n`);

  for (const vp of results.viewportResults) {
    lines.push(`\n${vp.viewport} (${vp.dimensions}):`);

    if (vp.issues.length === 0) {
      lines.push('  ✓ No issues found');
    } else {
      const critical = vp.issues.filter(i => i.severity === 'critical');
      const warnings = vp.issues.filter(i => i.severity === 'warning');

      if (critical.length > 0) {
        lines.push(`  ✗ ${critical.length} critical issue(s):`);
        critical.forEach(issue => {
          lines.push(`    - ${issue.message}`);
        });
      }

      if (warnings.length > 0) {
        lines.push(`  ⚠ ${warnings.length} warning(s):`);
        warnings.forEach(issue => {
          lines.push(`    - ${issue.message}`);
        });
      }
    }
  }

  return lines.join('\n');
}

export default {
  testResponsiveness,
  generateResponsivenessReport,
  VIEWPORTS
};
