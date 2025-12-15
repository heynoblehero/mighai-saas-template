import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function AISettings() {
  const [settings, setSettings] = useState({
    claude_api_key: '',
    claude_model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4000,
    temperature: 0.1,
    daytona_enabled: false,
    daytona_workspace_url: '',
    auto_preview: true,
    cost_limit_monthly: 100
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/ai-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings({ ...settings, ...data });
      }
    } catch (error) {
      console.error('Failed to fetch AI settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setMessage('AI settings saved successfully!');
      } else {
        const error = await response.text();
        setMessage('Failed to save settings: ' + error);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage('Failed to save AI settings');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!settings.claude_api_key) {
      setMessage('Please enter a Claude API key first');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/test-claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          api_key: settings.claude_api_key,
          model: settings.claude_model
        })
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="AI Settings">
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <div className="text-lg text-slate-300">Loading AI settings...</div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="AI Settings">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">AI Settings</h1>
          <p className="text-slate-400 mt-1">Configure Claude API and AI-powered page generation</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200">Claude API Configuration</h3>
          </div>
          <div className="p-6">
            
            {message && (
              <div className={`mb-4 p-4 rounded-xl ${
                message.includes('success') 
                  ? 'bg-emerald-900/20 border border-emerald-600/30 text-emerald-300'
                  : 'bg-red-900/20 border border-red-600/30 text-red-300'
              }`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Claude API Key */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Claude API Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={settings.claude_api_key}
                    onChange={(e) => setSettings(prev => ({ ...prev, claude_api_key: e.target.value }))}
                    placeholder="sk-ant-api03-..."
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={testConnection}
                    disabled={testing || !settings.claude_api_key}
                    className="absolute right-2 top-2 bottom-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 rounded-md text-sm transition-colors disabled:opacity-50"
                  >
                    {testing ? 'Testing...' : 'Test'}
                  </button>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  Get your API key from <a href="https://console.anthropic.com/" target="_blank" className="text-emerald-400 hover:text-emerald-300">Anthropic Console</a>
                </p>
              </div>

              {/* Test Result */}
              {testResult && (
                <div className={`p-4 rounded-xl ${testResult.success ? 'bg-emerald-900/20 border border-emerald-600/30 text-emerald-300' : 'bg-red-900/20 border border-red-600/30 text-red-300'}`}>
                  <h4 className="font-semibold">
                    Connection Test {testResult.success ? 'Successful' : 'Failed'}
                  </h4>
                  <pre className="mt-2 text-sm">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}

              {/* Model Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Claude Model
                  </label>
                  <select
                    value={settings.claude_model}
                    onChange={(e) => setSettings(prev => ({ ...prev, claude_model: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  >
                    <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 (Latest)</option>
                    <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                    <option value="claude-3-haiku-20240307">Claude 3 Haiku (Faster)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    min="1000"
                    max="8000"
                    value={settings.max_tokens}
                    onChange={(e) => setSettings(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  <p className="text-sm text-slate-400 mt-1">Maximum tokens for code generation</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Temperature
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  <p className="text-sm text-slate-400 mt-1">Lower values = more consistent code</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Monthly Cost Limit ($)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={settings.cost_limit_monthly}
                    onChange={(e) => setSettings(prev => ({ ...prev, cost_limit_monthly: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  <p className="text-sm text-slate-400 mt-1">API usage will stop when limit is reached</p>
                </div>
              </div>

              {/* Page Builder Settings */}
              <div>
                <h4 className="text-lg font-medium text-slate-200 mb-4">Page Builder Settings</h4>
                <div className="space-y-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.auto_preview}
                      onChange={(e) => setSettings(prev => ({ ...prev, auto_preview: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium text-slate-300">Enable automatic preview updates</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.daytona_enabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, daytona_enabled: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium text-slate-300">Enable Daytona integration (coming soon)</span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-emerald-300 mb-2">
                AI Page Builder Setup
              </h3>
              <div className="text-emerald-200/80 space-y-2">
                <p>• Configure your Claude API key to enable AI-powered page generation</p>
                <p>• Users will be able to describe pages in natural language</p>
                <p>• Real-time preview shows generated HTML, CSS, and JavaScript</p>
                <p>• Iterative refinement allows users to modify pages with additional instructions</p>
                <p>• Cost limits help control your monthly API expenses</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}