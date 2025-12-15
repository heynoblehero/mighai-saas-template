/**
 * Global fetch configuration to ensure cookies are always sent
 * Import this file in _app.js to apply globally
 */

if (typeof window !== 'undefined') {
  // Store the original fetch
  const originalFetch = window.fetch;

  // Override fetch to always include credentials
  window.fetch = function(...args) {
    const [url, options = {}] = args;

    // Merge options with credentials: 'include'
    const enhancedOptions = {
      ...options,
      credentials: options.credentials || 'include'
    };

    return originalFetch(url, enhancedOptions);
  };

  console.log('[Fetch Config] Global fetch configured to always send cookies');
}
