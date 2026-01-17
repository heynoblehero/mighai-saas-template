import { useState, useEffect } from 'react';
import { useSetupWizard } from '../SetupWizardContext';

export default function EmailKeysStep() {
  const { wizardState, updateState, isSaving } = useSetupWizard();

  const [apiKey, setApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [existingConfig, setExistingConfig] = useState(null);

  // Fetch existing email settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/admin/email-settings');
        const data = await response.json();
        if (data.settings) {
          setExistingConfig(data.settings);
          setFromEmail(data.settings.from_email || '');
          setFromName(data.settings.from_name || '');
          if (data.settings.resend_api_key) {
            // Don't show actual key, just indicate it's configured
          }
        }
      } catch (error) {
        console.error('Error fetching email settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const saveSettings = async () => {
    if (!apiKey && !existingConfig?.resend_api_key) {
      setTestResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/email-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resend_api_key: apiKey || undefined,
          from_email: fromEmail,
          from_name: fromName
        })
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({ success: true, message: 'Email settings saved!' });
        await updateState({ email_api_key_configured: true });
        setExistingConfig(data.settings);
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to save settings' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to save settings' });
    } finally {
      setTesting(false);
    }
  };

  const sendTestEmail = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: existingConfig?.admin_email || 'admin@example.com'
        })
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({ success: true, message: 'Test email sent! Check your inbox.' });
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to send test email' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to send test email' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Email Setup</h2>
        <p className="text-slate-400">Configure Resend for transactional emails (OTP, notifications, etc.)</p>
      </div>

      <div className="space-y-6">
        {/* Provider info */}
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 flex items-start gap-4">
          <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-white mb-1">Resend</h3>
            <p className="text-sm text-slate-400">Reliable email delivery for developers. Free tier includes 3,000 emails/month.</p>
            <a
              href="https://resend.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mt-2"
            >
              Get API key
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Resend API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={existingConfig?.resend_api_key ? '••••••••••••••••' : 're_...'}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
          />
          {existingConfig?.resend_api_key && (
            <p className="mt-1 text-xs text-slate-500">Leave blank to keep existing key</p>
          )}
        </div>

        {/* From Email */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">From Email</label>
          <input
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="noreply@yourdomain.com"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-slate-500">Must be a verified domain in Resend</p>
        </div>

        {/* From Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">From Name</label>
          <input
            type="text"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="Your SaaS Name"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={saveSettings}
            disabled={testing}
            className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                Save Settings
              </>
            )}
          </button>

          {existingConfig?.resend_api_key && (
            <button
              onClick={sendTestEmail}
              disabled={testing}
              className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Send Test
            </button>
          )}
        </div>

        {/* Result message */}
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
        {wizardState?.email_api_key_configured && !testResult && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-emerald-400">Email settings already configured</span>
          </div>
        )}
      </div>
    </div>
  );
}
