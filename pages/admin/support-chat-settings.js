import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function SupportChatSettings() {
  const [settings, setSettings] = useState({
    visibility: 'public',
    primary_color: '#3B82F6',
    secondary_color: '#10B981',
    button_text: 'Support Chat',
    position: 'bottom-right',
    is_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/support-chat-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        console.error('Failed to fetch settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/support-chat-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h1 className="text-3xl font-bold text-slate-100">Support Chat Settings</h1>
          <p className="text-slate-400 mt-2">
            Configure the support chat widget appearance and visibility
          </p>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-6">
          {/* Status Toggle */}
          <div className="border-b border-slate-700 pb-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Status</h2>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-slate-300 font-medium">Enable Support Chat</label>
                <p className="text-slate-400 text-sm">Toggle the support chat widget on/off</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.is_enabled}
                  onChange={(e) => handleChange('is_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Visibility Settings */}
          <div className="border-b border-slate-700 pb-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Visibility</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={settings.visibility === 'public'}
                    onChange={(e) => handleChange('visibility', e.target.value)}
                    className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-300">Public</span>
                  <span className="text-slate-500 text-sm">Visible to all visitors</span>
                </label>
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="subscribers_only"
                    checked={settings.visibility === 'subscribers_only'}
                    onChange={(e) => handleChange('visibility', e.target.value)}
                    className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-300">Subscribers Only</span>
                  <span className="text-slate-500 text-sm">Visible only to logged-in users</span>
                </label>
              </div>
            </div>
          </div>

          {/* Position Settings */}
          <div className="border-b border-slate-700 pb-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Position</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: 'bottom-right', label: 'Bottom Right' },
                { value: 'bottom-left', label: 'Bottom Left' },
                { value: 'top-right', label: 'Top Right' },
                { value: 'top-left', label: 'Top Left' }
              ].map((position) => (
                <label
                  key={position.value}
                  className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer ${
                    settings.position === position.value
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="position"
                    value={position.value}
                    checked={settings.position === position.value}
                    onChange={(e) => handleChange('position', e.target.value)}
                    className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-300">{position.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Theme Settings */}
          <div className="border-b border-slate-700 pb-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Theme</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-300 mb-2">Primary Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) => handleChange('primary_color', e.target.value)}
                    className="w-12 h-10 rounded border border-slate-600 bg-slate-700"
                  />
                  <input
                    type="text"
                    value={settings.primary_color}
                    onChange={(e) => handleChange('primary_color', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                    placeholder="#3B82F6"
                  />
                </div>
                <p className="text-slate-500 text-sm mt-1">Used for chat button and primary elements</p>
              </div>
              <div>
                <label className="block text-slate-300 mb-2">Secondary Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.secondary_color}
                    onChange={(e) => handleChange('secondary_color', e.target.value)}
                    className="w-12 h-10 rounded border border-slate-600 bg-slate-700"
                  />
                  <input
                    type="text"
                    value={settings.secondary_color}
                    onChange={(e) => handleChange('secondary_color', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                    placeholder="#10B981"
                  />
                </div>
                <p className="text-slate-500 text-sm mt-1">Used for chat messages and accents</p>
              </div>
            </div>
          </div>

          {/* Button Text */}
          <div className="border-b border-slate-700 pb-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Button Text</h2>
            <div className="max-w-md">
              <input
                type="text"
                value={settings.button_text}
                onChange={(e) => handleChange('button_text', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                placeholder="Support Chat"
              />
              <p className="text-slate-500 text-sm mt-1">Text displayed on the chat widget button</p>
            </div>
          </div>

          {/* Preview */}
          <div className="border-b border-slate-700 pb-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Preview</h2>
            <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
              <div className="flex justify-center">
                <div
                  className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-40 ${
                    settings.is_enabled ? 'scale-100' : 'scale-0'
                  }`}
                  style={{ backgroundColor: settings.primary_color }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <div className="text-center text-slate-400 mt-8">
                <p>Preview of the support chat widget</p>
                <p className="text-sm mt-2">Position: {settings.position.replace('-', ' ')}</p>
                <p className="text-sm">Color: {settings.primary_color}</p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-900/30 text-green-300 border border-green-600/30' : 'bg-red-900/30 text-red-300 border border-red-600/30'
            }`}>
              {message.text}
            </div>
          )}
        </form>

        {/* Info Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-slate-200 mb-2">
                Support Chat Settings
              </h3>
              <div className="text-slate-400 space-y-2">
                <p>• The support chat widget will appear on all pages according to your settings</p>
                <p>• When set to "Subscribers Only", non-logged-in users won't see the chat widget</p>
                <p>• Theme colors will be applied to the chat interface and button</p>
                <p>• Changes take effect immediately across your site</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}