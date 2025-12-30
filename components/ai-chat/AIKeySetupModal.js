import { useState, useEffect } from 'react';
import apiKeyStorage from '../../utils/apiKeyStorage';

/**
 * Modal for configuring AI provider API keys
 * Supports Claude, Gemini, and OpenAI with validation
 */
export default function AIKeySetupModal({ isOpen, onClose, onSave, initialKeys = null }) {
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [keys, setKeys] = useState({
    claude: '',
    gemini: '',
    openai: '',
    'claude-opus': '',
    'claude-haiku': '',
    'gemini-pro': '',
    'gpt-4': '',
    'gpt-3.5-turbo': ''
  });
  const [validationStatus, setValidationStatus] = useState({
    claude: null,
    gemini: null,
    openai: null,
    'claude-opus': null,
    'claude-haiku': null,
    'gemini-pro': null,
    'gpt-4': null,
    'gpt-3.5-turbo': null
  });
  const [isValidating, setIsValidating] = useState({
    claude: false,
    gemini: false,
    openai: false,
    'claude-opus': false,
    'claude-haiku': false,
    'gemini-pro': false,
    'gpt-4': false,
    'gpt-3.5-turbo': false
  });
  const [showKeys, setShowKeys] = useState({
    claude: false,
    gemini: false,
    openai: false,
    'claude-opus': false,
    'claude-haiku': false,
    'gemini-pro': false,
    'gpt-4': false,
    'gpt-3.5-turbo': false
  });

  // Load initial keys
  useEffect(() => {
    if (initialKeys) {
      setKeys(initialKeys);
    } else {
      // Load from localStorage if no initial keys provided
      const storedKeys = apiKeyStorage.getKeys();
      if (storedKeys) {
        setKeys(prev => ({ ...prev, ...storedKeys }));
      }
    }
  }, []);

  const handleKeyChange = (provider, value) => {
    setKeys(prev => ({ ...prev, [provider]: value }));
    // Reset validation status when key changes
    setValidationStatus(prev => ({ ...prev, [provider]: null }));
  };

  const toggleKeyVisibility = (provider) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleSave = () => {
    // Filter out empty keys
    const keysToSave = {};
    Object.keys(keys).forEach(provider => {
      if (keys[provider] && keys[provider].trim().length > 0) {
        keysToSave[provider] = keys[provider].trim();
      }
    });

    // Check if at least one key is configured and valid
    const hasValidKey = Object.keys(keysToSave).some(provider =>
      validationStatus[provider]?.valid === true
    );

    if (!hasValidKey) {
      alert('Please configure and validate at least one API key before saving.');
      return;
    }

    // Save to localStorage
    apiKeyStorage.saveKeys(keysToSave);

    // Save preferred provider (first validated one)
    const preferredProvider = Object.keys(keysToSave).find(
      provider => validationStatus[provider]?.valid === true
    );
    if (preferredProvider) {
      apiKeyStorage.savePreferredProvider(preferredProvider);
    }

    // Call onSave callback
    if (onSave) {
      onSave(keysToSave);
    }

    onClose();
  };

  // Validate a single provider's key
  const validateKey = async (provider) => {
    const key = keys[provider];

    if (!key || key.trim().length === 0) {
      setValidationStatus(prev => ({
        ...prev,
        [provider]: { valid: false, message: 'Please enter an API key' }
      }));
      return;
    }

    // Basic format validation
    const formatCheck = apiKeyStorage.validateKeyFormat(provider, key);
    if (!formatCheck.valid) {
      setValidationStatus(prev => ({
        ...prev,
        [provider]: { valid: false, message: formatCheck.error }
      }));
      return;
    }

    setIsValidating(prev => ({ ...prev, [provider]: true }));
    setValidationStatus(prev => ({ ...prev, [provider]: null }));

    try {
      const response = await fetch('/api/ai/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: key })
      });

      const data = await response.json();

      if (data.valid) {
        setValidationStatus(prev => ({
          ...prev,
          [provider]: {
            valid: true,
            message: `✓ Connected to ${data.model}`,
            model: data.model
          }
        }));
      } else {
        setValidationStatus(prev => ({
          ...prev,
          [provider]: {
            valid: false,
            message: data.error || 'Validation failed'
          }
        }));
      }
    } catch (error) {
      setValidationStatus(prev => ({
        ...prev,
        [provider]: {
          valid: false,
          message: `Connection error: ${error.message}`
        }
      }));
    } finally {
      setIsValidating(prev => ({ ...prev, [provider]: false }));
    }
  };

  // Save keys
  const handleSave = () => {
    // Filter out empty keys
    const keysToSave = {};
    Object.keys(keys).forEach(provider => {
      if (keys[provider] && keys[provider].trim().length > 0) {
        keysToSave[provider] = keys[provider].trim();
      }
    });

    // Check if at least one key is configured and valid
    const hasValidKey = Object.keys(keysToSave).some(provider =>
      validationStatus[provider]?.valid === true
    );

    if (!hasValidKey) {
      alert('Please configure and validate at least one API key before saving.');
      return;
    }

    // Save to localStorage
    apiKeyStorage.saveKeys(keysToSave);

    // Save preferred provider (first validated one)
    const preferredProvider = Object.keys(keysToSave).find(
      provider => validationStatus[provider]?.valid === true
    );
    if (preferredProvider) {
      apiKeyStorage.savePreferredProvider(preferredProvider);
    }

    // Call onSave callback
    if (onSave) {
      onSave(keysToSave);
    }

    onClose();
  };

  // Handle key input change
  const handleKeyChange = (provider, value) => {
    setKeys(prev => ({ ...prev, [provider]: value }));
    // Reset validation status when key changes
    setValidationStatus(prev => ({ ...prev, [provider]: null }));
  };

  // Toggle key visibility
  const toggleKeyVisibility = (provider) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  if (!isOpen) return null;

  const providers = [
    {
      id: 'gemini',
      name: 'Gemini',
      fullName: 'Gemini (Google)',
      model: '2.0 Flash',
      color: 'bg-blue-500',
      placeholder: 'AIza...'
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      fullName: 'Gemini Pro (Google)',
      model: 'Gemini Pro',
      color: 'bg-blue-500',
      placeholder: 'AIza...'
    },
    {
      id: 'claude',
      name: 'Claude',
      fullName: 'Claude (Anthropic)',
      model: 'Sonnet 4.5',
      color: 'bg-orange-500',
      placeholder: 'sk-ant-...'
    },
    {
      id: 'claude-opus',
      name: 'Claude Opus',
      fullName: 'Claude Opus (Anthropic)',
      model: 'Claude 3 Opus',
      color: 'bg-orange-500',
      placeholder: 'sk-ant-...'
    },
    {
      id: 'claude-haiku',
      name: 'Claude Haiku',
      fullName: 'Claude Haiku (Anthropic)',
      model: 'Claude 3 Haiku',
      color: 'bg-orange-500',
      placeholder: 'sk-ant-...'
    },
    {
      id: 'openai',
      name: 'GPT-4o',
      fullName: 'OpenAI GPT-4o',
      model: 'GPT-4o',
      color: 'bg-green-500',
      placeholder: 'sk-...'
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      fullName: 'OpenAI GPT-4',
      model: 'GPT-4',
      color: 'bg-green-500',
      placeholder: 'sk-...'
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5',
      fullName: 'OpenAI GPT-3.5 Turbo',
      model: 'GPT-3.5 Turbo',
      color: 'bg-green-500',
      placeholder: 'sk-...'
    }
  ];

  const currentProvider = providers.find(p => p.id === selectedProvider);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center">
              <span className="mr-2">🔐</span>
              Configure AI Provider Key
            </h2>
            <p className="text-slate-400 mt-1 text-sm">
              Enter your API key to start using AI features. Your key is stored securely in your browser.
            </p>
          </div>
          <button
            onClick={() => {
              if (onClose) onClose();
            }}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* Current Provider Info */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full ${currentProvider.color} mr-3`}></div>
                <div>
                  <h3 className="font-semibold text-slate-200">{currentProvider.fullName}</h3>
                  <p className="text-sm text-slate-400">Model: {currentProvider.model}</p>
                </div>
              </div>
            </div>

            {/* API Key Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKeys[selectedProvider] ? 'text' : 'password'}
                  value={keys[selectedProvider]}
                  onChange={(e) => handleKeyChange(selectedProvider, e.target.value)}
                  placeholder={currentProvider.placeholder}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors pr-12"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      validateKey(selectedProvider);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => toggleKeyVisibility(selectedProvider)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 text-sm"
                >
                  {showKeys[selectedProvider] ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>

              {/* Validation Button */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => validateKey(selectedProvider)}
                  disabled={isValidating[selectedProvider] || !keys[selectedProvider]}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isValidating[selectedProvider] ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Testing...
                    </span>
                  ) : (
                    'Validate Key'
                  )}
                </button>

                <button
                  onClick={() => handleKeyChange(selectedProvider, '')}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm font-medium transition-colors"
                >
                  Clear
                </button>
              </div>

              {/* Validation Status */}
              {validationStatus[selectedProvider] && (
                <div className={`mt-3 p-3 rounded-lg ${
                  validationStatus[selectedProvider].valid
                    ? 'bg-emerald-900/20 border border-emerald-600/30 text-emerald-300'
                    : 'bg-red-900/20 border border-red-600/30 text-red-300'
                }`}>
                  <p className="text-sm flex items-center">
                    {validationStatus[selectedProvider].valid ? (
                      <span className="mr-2">✅</span>
                    ) : (
                      <span className="mr-2">❌</span>
                    )}
                    {validationStatus[selectedProvider].message}
                  </p>
                </div>
              )}
            </div>

            {/* Help Text */}
            <div className="bg-slate-900/30 border border-slate-700 rounded-lg p-4 text-sm text-slate-400">
              <h4 className="font-semibold text-slate-300 mb-2 flex items-center">
                <span className="mr-2">ℹ️</span>
                Where to get your API key:
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {(selectedProvider === 'gemini' || selectedProvider.startsWith('gemini-')) && (
                  <>
                    <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Google AI Studio</a></li>
                    <li>Create an API key</li>
                    <li>Copy the key (starts with "AIza")</li>
                  </>
                )}
                {(selectedProvider === 'claude' || selectedProvider.startsWith('claude-')) && (
                  <>
                    <li>Visit <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">console.anthropic.com</a></li>
                    <li>Go to API Keys section</li>
                    <li>Create a new key starting with "sk-ant-"</li>
                  </>
                )}
                {(selectedProvider === 'openai' || selectedProvider.startsWith('gpt-')) && (
                  <>
                    <li>Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">platform.openai.com/api-keys</a></li>
                    <li>Create a new secret key</li>
                    <li>Copy the key starting with "sk-"</li>
                  </>
                )}
              </ul>
            </div>

            {/* Security Notice */}
            <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 text-sm">
              <h4 className="font-semibold text-amber-300 mb-1 flex items-center">
                <span className="mr-2">🔒</span>
                Security Notice
              </h4>
              <p className="text-amber-200">
                Your API key is stored locally in your browser and is never sent to our servers. It is only used to make requests directly to AI providers on your behalf.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4 bg-slate-900/50 flex justify-between items-center">
          <button
            onClick={() => {
              if (onClose) onClose();
            }}
            className="px-4 py-2 text-slate-300 hover:text-slate-100 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!validationStatus[selectedProvider]?.valid}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}