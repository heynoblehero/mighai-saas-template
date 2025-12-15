import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function SecuritySettings() {
  const [settings, setSettings] = useState({
    is_enabled: false,
    method: 'email',
    telegram_bot_token: '',
    telegram_chat_id: '',
    telegram_bot_token_configured: false,
    require_on_login: true,
    require_on_database_changes: true,
    require_on_page_changes: true,
    require_on_route_changes: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testingTelegram, setTestingTelegram] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/2fa-settings');
      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err) {
      setError('Failed to load 2FA settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  const testTelegramConnection = async () => {
    if (!settings.telegram_bot_token || !settings.telegram_chat_id) {
      setError('Please enter both Bot Token and Chat ID');
      return;
    }

    setTestingTelegram(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: settings.telegram_chat_id,
          text: '✅ Telegram 2FA connection test successful! Your bot is configured correctly.'
        })
      });

      const data = await response.json();

      if (data.ok) {
        setSuccess('Test message sent successfully! Check your Telegram chat.');
      } else {
        setError(`Telegram API error: ${data.description}`);
      }
    } catch (err) {
      setError('Failed to connect to Telegram. Please check your credentials.');
    } finally {
      setTestingTelegram(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/2fa-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('2FA settings saved successfully!');
        loadSettings(); // Reload to get updated state
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Security Settings">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <div className="text-lg text-slate-300">Loading security settings...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Security Settings">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Security Settings</h1>
          <p className="text-slate-400 mt-1">Configure two-factor authentication for enhanced security</p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-900/20 border border-red-600/30 text-red-300 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-600/30 text-green-300 px-4 py-3 rounded-xl">
            {success}
          </div>
        )}

        {/* Enable 2FA */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center">
                <span className="mr-2">🔐</span>
                Two-Factor Authentication
              </h3>
              <p className="text-slate-400 text-sm">
                Add an extra layer of security to your admin account. When enabled, you'll need to enter a verification code in addition to your password.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={settings.is_enabled}
                onChange={(e) => handleChange('is_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-8 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {/* 2FA Method Selection */}
        {settings.is_enabled && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">2FA Method</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                <input
                  type="radio"
                  name="method"
                  value="email"
                  checked={settings.method === 'email'}
                  onChange={(e) => handleChange('method', e.target.value)}
                  className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600"
                />
                <div>
                  <div className="text-slate-200 font-medium">📧 Email Only</div>
                  <div className="text-slate-400 text-sm">Receive verification codes via email</div>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                <input
                  type="radio"
                  name="method"
                  value="telegram"
                  checked={settings.method === 'telegram'}
                  onChange={(e) => handleChange('method', e.target.value)}
                  className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600"
                />
                <div>
                  <div className="text-slate-200 font-medium">✈️ Telegram Only</div>
                  <div className="text-slate-400 text-sm">Receive verification codes via Telegram bot</div>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                <input
                  type="radio"
                  name="method"
                  value="both"
                  checked={settings.method === 'both'}
                  onChange={(e) => handleChange('method', e.target.value)}
                  className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600"
                />
                <div>
                  <div className="text-slate-200 font-medium">📧✈️ Both Email and Telegram</div>
                  <div className="text-slate-400 text-sm">Receive codes via both channels for maximum security</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Telegram Configuration */}
        {settings.is_enabled && (settings.method === 'telegram' || settings.method === 'both') && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
              <span className="mr-2">✈️</span>
              Telegram Configuration
            </h3>

            <div className="space-y-4">
              {/* Setup Instructions */}
              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                <h4 className="text-blue-300 font-medium mb-2">Setup Instructions:</h4>
                <ol className="text-blue-200/80 text-sm space-y-1 list-decimal list-inside">
                  <li>Create a bot by messaging @BotFather on Telegram</li>
                  <li>Copy the bot token provided by BotFather</li>
                  <li>Start a chat with your bot</li>
                  <li>Get your Chat ID from @userinfobot</li>
                  <li>Enter both values below</li>
                </ol>
              </div>

              {/* Bot Token */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Telegram Bot Token <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={settings.telegram_bot_token}
                  onChange={(e) => handleChange('telegram_bot_token', e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                />
                {settings.telegram_bot_token_configured && !settings.telegram_bot_token && (
                  <p className="text-emerald-400 text-xs mt-1">✓ Token configured (enter new token to update)</p>
                )}
              </div>

              {/* Chat ID */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Telegram Chat ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={settings.telegram_chat_id}
                  onChange={(e) => handleChange('telegram_chat_id', e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="123456789"
                />
                <p className="text-slate-400 text-xs mt-1">Your personal Telegram chat ID</p>
              </div>

              {/* Test Connection */}
              <button
                onClick={testTelegramConnection}
                disabled={testingTelegram}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {testingTelegram ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <>
                    <span>🧪</span>
                    <span>Test Telegram Connection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 2FA Requirements */}
        {settings.is_enabled && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Require 2FA For:</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
                <input
                  type="checkbox"
                  checked={settings.require_on_login}
                  onChange={(e) => handleChange('require_on_login', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded"
                />
                <div>
                  <div className="text-slate-200 font-medium">Admin Login</div>
                  <div className="text-slate-400 text-sm">Require verification when logging into admin panel</div>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
                <input
                  type="checkbox"
                  checked={settings.require_on_database_changes}
                  onChange={(e) => handleChange('require_on_database_changes', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded"
                />
                <div>
                  <div className="text-slate-200 font-medium">Database Changes</div>
                  <div className="text-slate-400 text-sm">Require verification when modifying database records</div>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
                <input
                  type="checkbox"
                  checked={settings.require_on_page_changes}
                  onChange={(e) => handleChange('require_on_page_changes', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded"
                />
                <div>
                  <div className="text-slate-200 font-medium">Page Changes</div>
                  <div className="text-slate-400 text-sm">Require verification when creating or modifying pages</div>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
                <input
                  type="checkbox"
                  checked={settings.require_on_route_changes}
                  onChange={(e) => handleChange('require_on_route_changes', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded"
                />
                <div>
                  <div className="text-slate-200 font-medium">Route Changes</div>
                  <div className="text-slate-400 text-sm">Require verification when creating or modifying custom routes</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
