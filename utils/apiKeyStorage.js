/**
 * LocalStorage utility for managing user's AI provider API keys
 * Supports only Claude (Anthropic) and Gemini (Google)
 * Keys are obfuscated using Base64 encoding and stored ONLY in browser
 */

const API_KEYS_STORAGE_KEY = 'ai_provider_keys';
const API_PROVIDER_PREFERENCE_KEY = 'preferred_ai_provider';
const SELECTED_MODEL_KEY = 'selected_ai_model';

// Available providers and their models
export const AI_PROVIDERS = {
  claude: {
    name: 'Claude',
    company: 'Anthropic',
    icon: '🟠',
    color: 'orange',
    models: [
      { id: 'claude-sonnet-4-5-20250929', name: 'Sonnet 4.5', description: 'Best for code generation' },
      { id: 'claude-3-5-sonnet-latest', name: 'Sonnet 3.5', description: 'Fast and capable' },
      { id: 'claude-3-haiku-20240307', name: 'Haiku 3', description: 'Fastest, lower cost' }
    ],
    keyPrefix: 'sk-ant-',
    placeholder: 'sk-ant-api03-...',
    helpUrl: 'https://console.anthropic.com/'
  },
  gemini: {
    name: 'Gemini',
    company: 'Google',
    icon: '🔵',
    color: 'blue',
    models: [
      { id: 'gemini-2.0-flash', name: '2.0 Flash', description: 'FREE - Fast responses' },
      { id: 'gemini-1.5-pro', name: '1.5 Pro', description: 'Higher quality, paid' },
      { id: 'gemini-1.5-flash', name: '1.5 Flash', description: 'Balanced speed/quality' }
    ],
    keyPrefix: 'AIza',
    placeholder: 'AIza...',
    helpUrl: 'https://aistudio.google.com/app/apikey'
  }
};

export const apiKeyStorage = {
  /**
   * Save API keys to localStorage (obfuscated with Base64)
   * @param {Object} keys - Object with provider keys { claude: 'sk-...', gemini: '...' }
   */
  saveKeys: (keys) => {
    try {
      // Filter to only supported providers
      const filteredKeys = {};
      Object.keys(keys).forEach(provider => {
        if (AI_PROVIDERS[provider] && keys[provider]) {
          filteredKeys[provider] = keys[provider];
        }
      });

      const obfuscated = btoa(JSON.stringify(filteredKeys));
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

      const deobfuscated = atob(stored);
      return JSON.parse(deobfuscated);
    } catch (error) {
      console.error('[API Key Storage] Error reading keys:', error);
      return null;
    }
  },

  /**
   * Update a single provider's API key
   * @param {string} provider - 'claude' or 'gemini'
   * @param {string} key - API key
   */
  updateProvider: (provider, key) => {
    try {
      if (!AI_PROVIDERS[provider]) {
        console.error(`[API Key Storage] Unknown provider: ${provider}`);
        return false;
      }
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
   * @param {string} provider - 'claude' or 'gemini'
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
      localStorage.removeItem(SELECTED_MODEL_KEY);
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

    return Object.keys(keys).filter(provider =>
      AI_PROVIDERS[provider] && keys[provider] && keys[provider].length > 0
    );
  },

  /**
   * Check if a specific provider is configured
   * @param {string} provider - 'claude' or 'gemini'
   * @returns {boolean}
   */
  isProviderConfigured: (provider) => {
    const key = apiKeyStorage.getProviderKey(provider);
    return !!(key && key.length > 0);
  },

  /**
   * Save preferred provider
   * @param {string} provider - 'claude' or 'gemini'
   */
  savePreferredProvider: (provider) => {
    try {
      if (!AI_PROVIDERS[provider]) return false;
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
      const preferred = localStorage.getItem(API_PROVIDER_PREFERENCE_KEY);
      if (preferred && apiKeyStorage.isProviderConfigured(preferred)) {
        return preferred;
      }

      const configured = apiKeyStorage.getConfiguredProviders();
      return configured.length > 0 ? configured[0] : null;
    } catch (error) {
      console.error('[API Key Storage] Error getting preferred provider:', error);
      return null;
    }
  },

  /**
   * Save selected model for a provider
   * @param {string} provider - Provider name
   * @param {string} modelId - Model ID
   */
  saveSelectedModel: (provider, modelId) => {
    try {
      const models = JSON.parse(localStorage.getItem(SELECTED_MODEL_KEY) || '{}');
      models[provider] = modelId;
      localStorage.setItem(SELECTED_MODEL_KEY, JSON.stringify(models));
      return true;
    } catch (error) {
      console.error('[API Key Storage] Error saving selected model:', error);
      return false;
    }
  },

  /**
   * Get selected model for a provider (or default)
   * @param {string} provider - Provider name
   * @returns {string} - Model ID
   */
  getSelectedModel: (provider) => {
    try {
      const models = JSON.parse(localStorage.getItem(SELECTED_MODEL_KEY) || '{}');
      if (models[provider]) return models[provider];

      // Return default model for provider
      const providerInfo = AI_PROVIDERS[provider];
      return providerInfo?.models[0]?.id || null;
    } catch (error) {
      return AI_PROVIDERS[provider]?.models[0]?.id || null;
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
    const providerInfo = AI_PROVIDERS[provider];

    if (!providerInfo) {
      return { valid: false, error: `Unknown provider: ${provider}` };
    }

    switch (provider) {
      case 'claude':
        if (!trimmedKey.startsWith('sk-ant-')) {
          return { valid: false, error: 'Claude API keys must start with "sk-ant-"' };
        }
        if (trimmedKey.length < 40) {
          return { valid: false, error: 'Claude API key appears too short (should be 90+ characters)' };
        }
        break;

      case 'gemini':
        if (!trimmedKey.startsWith('AIza')) {
          return { valid: false, error: 'Gemini API keys must start with "AIza"' };
        }
        if (trimmedKey.length !== 39) {
          return { valid: false, error: 'Gemini API keys should be exactly 39 characters' };
        }
        break;

      default:
        return { valid: false, error: `Unsupported provider: ${provider}` };
    }

    return { valid: true, error: null };
  },

  /**
   * Get provider info
   * @param {string} provider - Provider key
   * @returns {Object|null} - Provider info object
   */
  getProviderInfo: (provider) => {
    return AI_PROVIDERS[provider] || null;
  },

  /**
   * Get all available providers
   * @returns {Object} - All providers info
   */
  getAllProviders: () => {
    return AI_PROVIDERS;
  },

  /**
   * Get provider display name
   * @param {string} provider - Provider key
   * @returns {string} - Human-readable provider name
   */
  getProviderDisplayName: (provider) => {
    const info = AI_PROVIDERS[provider];
    return info ? `${info.name} (${info.company})` : provider;
  },

  /**
   * Get default model for provider
   * @param {string} provider - Provider key
   * @returns {string} - Default model name
   */
  getDefaultModel: (provider) => {
    const info = AI_PROVIDERS[provider];
    return info?.models[0]?.name || 'Unknown Model';
  }
};

export default apiKeyStorage;
