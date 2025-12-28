import { useState, useEffect } from 'react';
import apiKeyStorage from '../utils/apiKeyStorage';

/**
 * Modal for configuring AI provider API keys
 * Supports Claude, Gemini, and OpenAI with validation
 */
export default function AIKeySetupModal({ isOpen, onClose, onSave, initialKeys = null }) {
  const [selectedProvider, setSelectedProvider] = useState('claude');
  const [keys, setKeys] = useState({
    claude: '',
    gemini: '',
    openai: ''
  });
  const [validationStatus, setValidationStatus] = useState({
    claude: null,
    gemini: null,
    openai: null
  });
  const [isValidating, setIsValidating] = useState({
    claude: false,
    gemini: false,
    openai: false
  });
  const [showKeys, setShowKeys] = useState({
    claude: false,
    gemini: false,
    openai: false
  });

  // Load initial keys
  useEffect(() => {
    if (initialKeys) {
      setKeys(initialKeys);
    }
  }, [initialKeys]);

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
      id: 'claude',
      name: 'Claude',
      fullName: 'Claude (Anthropic)',
      model: 'Sonnet 4.5',
      color: 'bg-orange-500',
      placeholder: 'sk-ant-api03-...'
    },
    {
      id: 'gemini',
      name: 'Gemini',
      fullName: 'Gemini (Google)',
      model: '2.0 Flash',
      color: 'bg-blue-500',
      placeholder: 'AIza...'
    },
    {
      id: 'openai',
      name: 'OpenAI',
      fullName: 'OpenAI',
      model: 'GPT-4o',
      color: 'bg-green-500',
      placeholder: 'sk-...'
    }
  ];

  const currentProvider = providers.find(p => p.id === selectedProvider);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <h2 className="text-2xl font-bold">Configure AI Provider Keys</h2>
          <p className="text-blue-100 mt-1">
            Add your API keys to start using AI features. Your keys are stored securely in your browser.
          </p>
        </div>

        {/* Provider Tabs */}
        <div className="flex border-b border-gray-200">
          {providers.map(provider => (
            <button
              key={provider.id}
              onClick={() => setSelectedProvider(provider.id)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
                selectedProvider === provider.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>{provider.name}</span>
                {validationStatus[provider.id]?.valid && (
                  <span className="text-green-500">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          <div className="space-y-4">
            {/* Provider Info */}
            <div className={`${currentProvider.color} bg-opacity-10 border border-current rounded-lg p-4`}>
              <h3 className="font-semibold text-gray-900">{currentProvider.fullName}</h3>
              <p className="text-sm text-gray-600 mt-1">Model: {currentProvider.model}</p>
            </div>

            {/* API Key Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKeys[selectedProvider] ? 'text' : 'password'}
                  value={keys[selectedProvider]}
                  onChange={(e) => handleKeyChange(selectedProvider, e.target.value)}
                  placeholder={currentProvider.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-20"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      validateKey(selectedProvider);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => toggleKeyVisibility(selectedProvider)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"
                >
                  {showKeys[selectedProvider] ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>

              {/* Validation Button */}
              <button
                onClick={() => validateKey(selectedProvider)}
                disabled={isValidating[selectedProvider] || !keys[selectedProvider]}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isValidating[selectedProvider] ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Testing Connection...
                  </span>
                ) : (
                  'Test Connection'
                )}
              </button>

              {/* Validation Status */}
              {validationStatus[selectedProvider] && (
                <div className={`mt-3 p-3 rounded-md ${
                  validationStatus[selectedProvider].valid
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm ${
                    validationStatus[selectedProvider].valid
                      ? 'text-green-800'
                      : 'text-red-800'
                  }`}>
                    {validationStatus[selectedProvider].message}
                  </p>
                </div>
              )}
            </div>

            {/* Help Text */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
              <h4 className="font-semibold text-gray-900 mb-2">Where to get your API key:</h4>
              <ul className="list-disc list-inside space-y-1">
                {selectedProvider === 'claude' && (
                  <>
                    <li>Visit <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.anthropic.com</a></li>
                    <li>Go to API Keys section</li>
                    <li>Create a new key starting with "sk-ant-"</li>
                  </>
                )}
                {selectedProvider === 'gemini' && (
                  <>
                    <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a></li>
                    <li>Create an API key</li>
                    <li>Copy the key (starts with "AIza")</li>
                  </>
                )}
                {selectedProvider === 'openai' && (
                  <>
                    <li>Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com/api-keys</a></li>
                    <li>Create a new secret key</li>
                    <li>Copy the key starting with "sk-"</li>
                  </>
                )}
              </ul>
            </div>

            {/* Security Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
              <h4 className="font-semibold text-yellow-900 mb-1">🔒 Security Notice</h4>
              <p className="text-yellow-800">
                Your API keys are stored locally in your browser and are never sent to our servers. They are only used to make requests directly to AI providers on your behalf.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
          <button
            onClick={() => {
              if (onClose) onClose();
            }}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={!Object.keys(keys).some(p => validationStatus[p]?.valid)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
