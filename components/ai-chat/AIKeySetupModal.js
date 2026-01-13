import { useState, useEffect } from 'react';
import apiKeyStorage, { AI_PROVIDERS } from '../../utils/apiKeyStorage';

/**
 * Modal for configuring AI provider API keys
 * Supports Claude (Anthropic) and Gemini (Google) only
 * Keys are stored in browser localStorage - never sent to server for storage
 */
export default function AIKeySetupModal({ isOpen, onClose, onSave, initialProvider = null }) {
  const [activeTab, setActiveTab] = useState(initialProvider || 'gemini');
  const [keys, setKeys] = useState({ claude: '', gemini: '' });
  const [selectedModels, setSelectedModels] = useState({ claude: '', gemini: '' });
  const [validationStatus, setValidationStatus] = useState({ claude: null, gemini: null });
  const [isValidating, setIsValidating] = useState({ claude: false, gemini: false });
  const [showKey, setShowKey] = useState({ claude: false, gemini: false });

  // Load stored keys on mount
  useEffect(() => {
    const storedKeys = apiKeyStorage.getKeys() || {};
    setKeys(prev => ({ ...prev, ...storedKeys }));

    // Load selected models
    setSelectedModels({
      claude: apiKeyStorage.getSelectedModel('claude') || AI_PROVIDERS.claude.models[0].id,
      gemini: apiKeyStorage.getSelectedModel('gemini') || AI_PROVIDERS.gemini.models[0].id
    });

    // Mark existing keys as valid (they were validated before)
    const newStatus = { claude: null, gemini: null };
    if (storedKeys.claude) {
      newStatus.claude = { valid: true, message: 'Key configured' };
    }
    if (storedKeys.gemini) {
      newStatus.gemini = { valid: true, message: 'Key configured' };
    }
    setValidationStatus(newStatus);
  }, [isOpen]);

  const handleKeyChange = (provider, value) => {
    setKeys(prev => ({ ...prev, [provider]: value }));
    setValidationStatus(prev => ({ ...prev, [provider]: null }));
  };

  const handleModelChange = (provider, modelId) => {
    setSelectedModels(prev => ({ ...prev, [provider]: modelId }));
  };

  const validateKey = async (provider) => {
    const key = keys[provider]?.trim();

    if (!key) {
      setValidationStatus(prev => ({
        ...prev,
        [provider]: { valid: false, message: 'Please enter an API key' }
      }));
      return;
    }

    // Basic format check
    const formatCheck = apiKeyStorage.validateKeyFormat(provider, key);
    if (!formatCheck.valid) {
      setValidationStatus(prev => ({
        ...prev,
        [provider]: { valid: false, message: formatCheck.error }
      }));
      return;
    }

    setIsValidating(prev => ({ ...prev, [provider]: true }));

    try {
      const response = await fetch('/api/ai/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: key })
      });

      const data = await response.json();

      setValidationStatus(prev => ({
        ...prev,
        [provider]: {
          valid: data.valid,
          message: data.valid ? `Connected to ${data.model || provider}` : (data.error || 'Validation failed')
        }
      }));
    } catch (error) {
      setValidationStatus(prev => ({
        ...prev,
        [provider]: { valid: false, message: `Connection error: ${error.message}` }
      }));
    } finally {
      setIsValidating(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleSave = () => {
    // Save all non-empty keys
    const keysToSave = {};
    if (keys.claude?.trim()) keysToSave.claude = keys.claude.trim();
    if (keys.gemini?.trim()) keysToSave.gemini = keys.gemini.trim();

    // Check if at least one valid key
    const hasValidKey = Object.keys(keysToSave).some(p => validationStatus[p]?.valid);

    if (!hasValidKey && Object.keys(keysToSave).length > 0) {
      alert('Please validate at least one API key before saving.');
      return;
    }

    // Save to localStorage
    apiKeyStorage.saveKeys(keysToSave);

    // Save selected models
    Object.entries(selectedModels).forEach(([provider, modelId]) => {
      apiKeyStorage.saveSelectedModel(provider, modelId);
    });

    // Save preferred provider (active tab if valid, else first valid)
    if (validationStatus[activeTab]?.valid) {
      apiKeyStorage.savePreferredProvider(activeTab);
    } else {
      const firstValid = Object.keys(keysToSave).find(p => validationStatus[p]?.valid);
      if (firstValid) apiKeyStorage.savePreferredProvider(firstValid);
    }

    if (onSave) {
      onSave({
        keys: keysToSave,
        models: selectedModels,
        preferredProvider: activeTab
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  const providerInfo = AI_PROVIDERS[activeTab];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900/50 to-slate-800 border-b border-slate-700 p-5">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🔑</span> AI Provider Setup
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Your keys are stored locally in your browser
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Provider Tabs */}
        <div className="flex border-b border-slate-700">
          {Object.entries(AI_PROVIDERS).map(([id, provider]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === id
                  ? 'text-white bg-slate-700/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>{provider.icon}</span>
                <span>{provider.name}</span>
                {validationStatus[id]?.valid && (
                  <span className="text-emerald-400 text-xs">✓</span>
                )}
              </div>
              {activeTab === id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Provider Info Card */}
          <div className={`rounded-xl p-4 border ${
            activeTab === 'claude'
              ? 'bg-orange-900/20 border-orange-600/30'
              : 'bg-blue-900/20 border-blue-600/30'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                activeTab === 'claude' ? 'bg-orange-600/30' : 'bg-blue-600/30'
              }`}>
                {providerInfo.icon}
              </div>
              <div>
                <h3 className="font-semibold text-white">{providerInfo.name}</h3>
                <p className="text-xs text-slate-400">{providerInfo.company}</p>
              </div>
              {activeTab === 'gemini' && (
                <span className="ml-auto bg-emerald-600/20 text-emerald-400 text-xs px-2 py-1 rounded-full border border-emerald-600/30">
                  FREE TIER
                </span>
              )}
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey[activeTab] ? 'text' : 'password'}
                value={keys[activeTab] || ''}
                onChange={(e) => handleKeyChange(activeTab, e.target.value)}
                placeholder={providerInfo.placeholder}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-20 font-mono text-sm"
                onKeyDown={(e) => e.key === 'Enter' && validateKey(activeTab)}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(prev => ({ ...prev, [activeTab]: !prev[activeTab] }))}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  title={showKey[activeTab] ? 'Hide key' : 'Show key'}
                >
                  {showKey[activeTab] ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Validation Status */}
            {validationStatus[activeTab] && (
              <div className={`mt-2 p-2 rounded-lg text-sm flex items-center gap-2 ${
                validationStatus[activeTab].valid
                  ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-600/30'
                  : 'bg-red-900/30 text-red-300 border border-red-600/30'
              }`}>
                <span>{validationStatus[activeTab].valid ? '✅' : '❌'}</span>
                {validationStatus[activeTab].message}
              </div>
            )}

            {/* Validate Button */}
            <button
              onClick={() => validateKey(activeTab)}
              disabled={isValidating[activeTab] || !keys[activeTab]?.trim()}
              className="mt-3 w-full py-2.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isValidating[activeTab] ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Validating...
                </>
              ) : (
                'Validate Key'
              )}
            </button>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Model
            </label>
            <div className="grid gap-2">
              {providerInfo.models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelChange(activeTab, model.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedModels[activeTab] === model.id
                      ? 'bg-emerald-900/30 border-emerald-500 text-white'
                      : 'bg-slate-900/50 border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{model.name}</span>
                    {selectedModels[activeTab] === model.id && (
                      <span className="text-emerald-400">✓</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{model.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Help Link */}
          <div className="text-center">
            <a
              href={providerInfo.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1"
            >
              Get your {providerInfo.name} API key →
            </a>
          </div>

          {/* Security Notice */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-xs text-slate-400">
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">🔒</span>
              <div>
                <strong className="text-slate-300">Your key stays private:</strong>
                <span className="ml-1">Stored only in your browser's localStorage, sent directly to AI provider APIs.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4 bg-slate-900/30 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
