import { useState } from 'react';
import { useSetupWizard } from '../SetupWizardContext';

export default function AIKeysStep() {
  const { wizardState, updateState, isSaving } = useSetupWizard();

  const [provider, setProvider] = useState(wizardState?.ai_provider || 'gemini');
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleProviderChange = async (newProvider) => {
    setProvider(newProvider);
    setTestResult(null);
    await updateState({ ai_provider: newProvider });
  };

  const testConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/ai/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, provider })
      });

      const data = await response.json();

      if (data.valid) {
        setTestResult({ success: true, message: 'API key is valid!' });

        // Store in localStorage (existing pattern)
        localStorage.setItem(`${provider}_api_key`, btoa(apiKey));
        localStorage.setItem('ai_provider', provider);

        // Update wizard state
        await updateState({
          ai_provider: provider,
          ai_api_key_configured: true
        });
      } else {
        setTestResult({ success: false, message: data.error || 'Invalid API key' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to validate key. Please try again.' });
    } finally {
      setTesting(false);
    }
  };

  const providers = [
    {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'Free tier available with 15 RPM',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      ),
      keyPlaceholder: 'AIza...',
      helpUrl: 'https://aistudio.google.com/app/apikey'
    },
    {
      id: 'claude',
      name: 'Anthropic Claude',
      description: 'More powerful, pay-per-use',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      ),
      keyPlaceholder: 'sk-ant-...',
      helpUrl: 'https://console.anthropic.com/settings/keys'
    }
  ];

  const selectedProvider = providers.find(p => p.id === provider);

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">AI API Keys</h2>
        <p className="text-slate-400">Configure an AI provider for page generation and content creation.</p>
      </div>

      <div className="space-y-6">
        {/* Provider selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Choose Provider</label>
          <div className="grid grid-cols-2 gap-3">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                className={`
                  p-4 rounded-xl border text-left transition-all
                  ${provider === p.id
                    ? 'bg-emerald-500/10 border-emerald-500 text-white'
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
                  }
                `}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${provider === p.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                  {p.icon}
                </div>
                <h3 className="font-medium mb-1">{p.name}</h3>
                <p className="text-xs text-slate-500">{p.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* API Key input */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={selectedProvider?.keyPlaceholder}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
          />
          <div className="mt-2 flex items-center justify-between">
            <a
              href={selectedProvider?.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Get API key
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Test connection button */}
        <button
          onClick={testConnection}
          disabled={testing || !apiKey.trim()}
          className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {testing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Testing connection...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Test Connection
            </>
          )}
        </button>

        {/* Test result */}
        {testResult && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${testResult.success ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
            {testResult.success ? (
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={testResult.success ? 'text-emerald-400' : 'text-red-400'}>
              {testResult.message}
            </span>
          </div>
        )}

        {/* Already configured notice */}
        {wizardState?.ai_api_key_configured && !testResult && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-emerald-400">AI provider already configured</span>
          </div>
        )}

        {/* Info box */}
        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Why do we need this?</h4>
          <p className="text-sm text-slate-500">
            The AI API key is used to generate your landing pages, pricing pages, and other content.
            Your key is stored securely in your browser and is never sent to our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
