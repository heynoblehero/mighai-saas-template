import { useState } from 'react';
import { useSetupWizard } from '../SetupWizardContext';

export default function PaymentKeysStep() {
  const { wizardState, updateState, isSaving } = useSetupWizard();

  const [apiKey, setApiKey] = useState('');
  const [storeId, setStoreId] = useState(wizardState?.lemonsqueezy_store_id || '');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const saveSettings = async () => {
    if (!storeId.trim()) {
      setTestResult({ success: false, message: 'Store ID is required' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // For now, just save to wizard state
      // In a real implementation, these would be saved to environment variables or secure storage
      await updateState({
        lemonsqueezy_store_id: storeId,
        payment_api_key_configured: true
      });

      setTestResult({ success: true, message: 'Payment settings saved!' });
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to save settings' });
    } finally {
      setTesting(false);
    }
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/lemonsqueezy`
    : '/api/webhooks/lemonsqueezy';

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Payment Setup</h2>
        <p className="text-slate-400">Configure Lemon Squeezy for subscription payments.</p>
      </div>

      <div className="space-y-6">
        {/* Provider info */}
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 flex items-start gap-4">
          <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🍋</span>
          </div>
          <div>
            <h3 className="font-medium text-white mb-1">Lemon Squeezy</h3>
            <p className="text-sm text-slate-400">All-in-one platform for SaaS payments. Handles tax, subscriptions, and checkout.</p>
            <a
              href="https://app.lemonsqueezy.com/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mt-2"
            >
              Open Lemon Squeezy Dashboard
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="eyJ..."
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
          />
          <p className="mt-1 text-xs text-slate-500">
            Find this in Settings &rarr; API in your Lemon Squeezy dashboard
          </p>
        </div>

        {/* Store ID */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Store ID</label>
          <input
            type="text"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            placeholder="12345"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-slate-500">
            Find this in Settings &rarr; Stores in your Lemon Squeezy dashboard
          </p>
        </div>

        {/* Webhook Secret */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Webhook Signing Secret</label>
          <input
            type="password"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder="whsec_..."
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
          />
        </div>

        {/* Webhook URL */}
        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <label className="block text-sm font-medium text-slate-300 mb-2">Webhook URL</label>
          <p className="text-xs text-slate-500 mb-2">Add this URL to your Lemon Squeezy webhook settings:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-slate-900 rounded text-sm text-emerald-400 font-mono overflow-x-auto">
              {webhookUrl}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(webhookUrl)}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={saveSettings}
          disabled={testing || !storeId.trim()}
          className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {testing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Payment Settings
            </>
          )}
        </button>

        {/* Result */}
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

        {/* Already configured */}
        {wizardState?.payment_api_key_configured && !testResult && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-emerald-400">Payment settings already configured</span>
          </div>
        )}
      </div>
    </div>
  );
}
