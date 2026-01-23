import { useState, useEffect } from 'react';
import { useSetupWizard } from '../SetupWizardContext';

export default function AIKeysStep() {
  const { wizardState, updateState, isSaving } = useSetupWizard();

  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  // Check if key is already configured in global settings
  useEffect(() => {
    const checkExistingKey = async () => {
      try {
        const response = await fetch('/api/admin/ai-settings');
        const data = await response.json();
        if (data.success && data.settings?.has_api_key) {
          setHasExistingKey(true);
        }
      } catch (error) {
        console.error('Error checking AI settings:', error);
      }
    };
    checkExistingKey();
  }, []);

  const testAndSaveKey = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // First validate the key
      const validateResponse = await fetch('/api/ai/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      });

      const validateData = await validateResponse.json();

      if (validateData.valid) {
        setSaving(true);

        // Save to global settings
        const saveResponse = await fetch('/api/admin/ai-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claude_api_key: apiKey })
        });

        const saveData = await saveResponse.json();

        if (saveData.success) {
          setTestResult({ success: true, message: 'API key validated and saved!' });
          setHasExistingKey(true);

          // Update wizard state
          await updateState({
            ai_provider: 'claude',
            ai_api_key_configured: true
          });
        } else {
          setTestResult({ success: false, message: saveData.error || 'Failed to save API key' });
        }
      } else {
        setTestResult({ success: false, message: validateData.error || 'Invalid API key' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to validate key. Please try again.' });
    } finally {
      setTesting(false);
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Claude API Key</h2>
        <p className="text-slate-400">Configure your Claude API key for AI-powered page generation.</p>
      </div>

      <div className="space-y-6">
        {/* Provider info */}
        <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-white">Anthropic Claude</h3>
              <p className="text-xs text-slate-400">Powerful AI for code and content generation</p>
            </div>
          </div>
        </div>

        {/* API Key input */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
          />
          <div className="mt-2 flex items-center justify-between">
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
            >
              Get API key from Anthropic
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Test and save button */}
        <button
          onClick={testAndSaveKey}
          disabled={testing || saving || !apiKey.trim()}
          className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {testing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Validating...
            </>
          ) : saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Validate & Save
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
        {hasExistingKey && !testResult && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-emerald-400">Claude API key already configured</span>
          </div>
        )}

        {/* Info box */}
        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Why do we need this?</h4>
          <p className="text-sm text-slate-500">
            The Claude API key is used to generate your landing pages, customer pages, and other content with AI.
            Your key is stored securely on the server and can be managed in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
