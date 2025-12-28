/**
 * LocalStorage utility for managing user's AI provider API keys
 * Keys are obfuscated (not encrypted) using Base64 encoding
 */

const API_KEYS_STORAGE_KEY = 'ai_provider_keys';
const API_PROVIDER_PREFERENCE_KEY = 'preferred_ai_provider';

export const apiKeyStorage = {
  /**
   * Save API keys to localStorage (obfuscated with Base64)
   * @param {Object} keys - Object with provider keys { claude: 'sk-...', gemini: '...', openai: '...' }
   */
  saveKeys: (keys) => {
    try {
      // Obfuscate keys with Base64 (not true encryption, but prevents casual viewing)
      const obfuscated = btoa(JSON.stringify(keys));
      localStorage.setItem(API_KEYS_STORAGE_KEY, obfuscated);
      return true;
    } catch (error) {
      console.error('[API Key Storage] Error saving keys:', error);
      return false;
    }
  },

  /**
   * Get API keys from localStorage
   * @returns {Object|null} - Keys object or null if not found
   */
  getKeys: () => {
    try {
      const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
      if (!stored) return null;

      // Deobfuscate from Base64
      const deobfuscated = atob(stored);
      return JSON.parse(deobfuscated);
    } catch (error) {
      console.error('[API Key Storage] Error reading keys:', error);
      return null;
    }
  },

  /**
   * Update a single provider's API key
   * @param {string} provider - 'claude', 'gemini', or 'openai'
   * @param {string} key - API key
   */
  updateProvider: (provider, key) => {
    try {
      const keys = apiKeyStorage.getKeys() || {};
      keys[provider] = key;
      return apiKeyStorage.saveKeys(keys);
    } catch (error) {
      console.error(`[API Key Storage] Error updating ${provider} key:`, error);
      return false;
    }
  },

  /**
   * Get API key for a specific provider
   * @param {string} provider - 'claude', 'gemini', or 'openai'
   * @returns {string|null} - API key or null
   */
  getProviderKey: (provider) => {
    const keys = apiKeyStorage.getKeys();
    return keys?.[provider] || null;
  },

  /**
   * Remove all API keys from localStorage
   */
  clearKeys: () => {
    try {
      localStorage.removeItem(API_KEYS_STORAGE_KEY);
      localStorage.removeItem(API_PROVIDER_PREFERENCE_KEY);
      return true;
    } catch (error) {
      console.error('[API Key Storage] Error clearing keys:', error);
      return false;
    }
  },

  /**
   * Check if any API keys are configured
   * @returns {boolean}
   */
  hasKeys: () => {
    const keys = apiKeyStorage.getKeys();
    return keys && Object.values(keys).some(k => k && k.length > 0);
  },

  /**
   * Get list of configured providers
   * @returns {string[]} - Array of provider names that have keys
   */
  getConfiguredProviders: () => {
    const keys = apiKeyStorage.getKeys();
    if (!keys) return [];

    return Object.keys(keys).filter(provider => keys[provider] && keys[provider].length > 0);
  },

  /**
   * Check if a specific provider is configured
   * @param {string} provider - 'claude', 'gemini', or 'openai'
   * @returns {boolean}
   */
  isProviderConfigured: (provider) => {
    const key = apiKeyStorage.getProviderKey(provider);
    return !!(key && key.length > 0);
  },

  /**
   * Save preferred provider
   * @param {string} provider - 'claude', 'gemini', or 'openai'
   */
  savePreferredProvider: (provider) => {
    try {
      localStorage.setItem(API_PROVIDER_PREFERENCE_KEY, provider);
      return true;
    } catch (error) {
      console.error('[API Key Storage] Error saving preferred provider:', error);
      return false;
    }
  },

  /**
   * Get preferred provider (or first configured provider)
   * @returns {string|null} - Provider name or null
   */
  getPreferredProvider: () => {
    try {
      // First try to get saved preference
      const preferred = localStorage.getItem(API_PROVIDER_PREFERENCE_KEY);
      if (preferred && apiKeyStorage.isProviderConfigured(preferred)) {
        return preferred;
      }

      // Otherwise return first configured provider
      const configured = apiKeyStorage.getConfiguredProviders();
      return configured.length > 0 ? configured[0] : null;
    } catch (error) {
      console.error('[API Key Storage] Error getting preferred provider:', error);
      return null;
    }
  },

  /**
   * Validate key format (basic check, not API validation)
   * @param {string} provider - Provider name
   * @param {string} key - API key to validate
   * @returns {Object} - { valid: boolean, error: string|null }
   */
  validateKeyFormat: (provider, key) => {
    if (!key || typeof key !== 'string') {
      return { valid: false, error: 'API key is required' };
    }

    const trimmedKey = key.trim();

    switch (provider) {
      case 'claude':
        // Claude keys start with 'sk-ant-'
        if (!trimmedKey.startsWith('sk-ant-')) {
          return { valid: false, error: 'Claude API keys should start with "sk-ant-"' };
        }
        if (trimmedKey.length < 20) {
          return { valid: false, error: 'Claude API key appears too short' };
        }
        break;

      case 'gemini':
        // Gemini keys are typically 39 characters
        if (trimmedKey.length < 20) {
          return { valid: false, error: 'Gemini API key appears too short' };
        }
        break;

      case 'openai':
        // OpenAI keys start with 'sk-'
        if (!trimmedKey.startsWith('sk-')) {
          return { valid: false, error: 'OpenAI API keys should start with "sk-"' };
        }
        if (trimmedKey.length < 20) {
          return { valid: false, error: 'OpenAI API key appears too short' };
        }
        break;

      default:
        return { valid: false, error: 'Unknown provider' };
    }

    return { valid: true, error: null };
  },

  /**
   * Get provider display name
   * @param {string} provider - Provider key
   * @returns {string} - Human-readable provider name
   */
  getProviderDisplayName: (provider) => {
    const names = {
      claude: 'Claude (Anthropic)',
      gemini: 'Gemini (Google)',
      openai: 'OpenAI'
    };
    return names[provider] || provider;
  },

  /**
   * Get provider model name
   * @param {string} provider - Provider key
   * @returns {string} - Model name
   */
  getProviderModel: (provider) => {
    const models = {
      claude: 'Claude Sonnet 4.5',
      gemini: 'Gemini 2.0 Flash',
      openai: 'GPT-4o'
    };
    return models[provider] || 'Unknown Model';
  }
};

export default apiKeyStorage;
