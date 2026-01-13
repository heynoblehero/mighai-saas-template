/**
 * Frontend Features Injector
 * Ensures that critical frontend features (analytics, heatmaps, support chat) 
 * are always included in AI-generated pages
 */

/**
 * Gets the HTML snippets that need to be injected into generated pages
 */
export function getRequiredFeatureSnippets() {
  return {
    // Script tags to inject before </body>
    scripts: `
    <!-- Analytics Tracking -->
    <script src="/analytics.js"></script>
    
    <!-- Heatmap Tracking -->
    <script src="/heatmap.js"></script>`,
    
    // Instructions for AI to follow
    instructions: `

CRITICAL: ALWAYS INCLUDE THESE FEATURES IN EVERY GENERATED PAGE:

1. **Analytics & Heatmap Tracking**: The page MUST include references to /analytics.js and /heatmap.js
   - These scripts are automatically loaded via _app.js
   - They provide page view tracking, click tracking, A/B testing, and heatmap capabilities
   - NO additional setup needed in the page code itself

2. **Support Chat Widget**: The SupportWidget component is automatically available on ALL pages
   - Rendered via _app.js globally
   - Users can access support chat from any page
   - NO manual integration needed in page code

3. **Important Notes**:
   - Do NOT remove or override these features in generated code
   - These features work automatically and are always present
   - Focus on creating the page content, the features are handled at the app level
   - If the user's request conflicts with these features, keep the features and adapt the request

These are platform-level features that MUST remain functional on all pages.`
  };
}

/**
 * Injects required features into HTML code
 * @param {string} html - The HTML code to inject into
 * @returns {string} - HTML with injected features
 */
export function injectFeaturesIntoHTML(html) {
  if (!html || typeof html !== 'string') {
    return html;
  }

  const snippets = getRequiredFeatureSnippets();
  
  // Check if closing body tag exists
  if (html.includes('</body>')) {
    // Inject scripts before closing body tag
    return html.replace('</body>', `${snippets.scripts}\n  </body>`);
  } else if (html.includes('</html>')) {
    // If no body tag but has html tag, inject before closing html
    return html.replace('</html>', `${snippets.scripts}\n</html>`);
  } else {
    // Append at the end if no proper structure
    return html + snippets.scripts;
  }
}

/**
 * Gets the enhanced prompt instructions for AI generators
 * @returns {string} - Instructions to append to AI prompts
 */
export function getAIPromptInstructions() {
  const snippets = getRequiredFeatureSnippets();
  return snippets.instructions;
}

/**
 * Validates that a page has the required features
 * @param {object} code - Object with html, css, js properties
 * @returns {object} - Validation result with warnings
 */
export function validateRequiredFeatures(code) {
  const warnings = [];
  
  // Note: Since features are injected at _app.js level, we don't need to check
  // the generated HTML. This function is kept for potential future use.
  
  return {
    valid: true,
    warnings,
    message: 'Features are injected at the application level via _app.js'
  };
}

export default {
  getRequiredFeatureSnippets,
  injectFeaturesIntoHTML,
  getAIPromptInstructions,
  validateRequiredFeatures
};
