import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import SupportWidget from '../../components/SupportWidget';

export default function SupportChatSettings() {
  const [settings, setSettings] = useState({
    visibility: 'public',
    primary_color: '#3B82F6',
    secondary_color: '#10B981',
    button_text: 'Support Chat',
    position: 'bottom-right',
    is_enabled: true,
    widget_icon: 'chat',
    greeting_message: '',
    // New theme fields
    background_color: '#FFFFFF',
    header_text_color: '#FFFFFF',
    customer_text_color: '#FFFFFF',
    admin_text_color: '#1F2937',
    border_radius: '12',
    font_family: 'system-ui'
  });

  const fontOptions = [
    { value: 'system-ui', label: 'System Default' },
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Poppins', label: 'Poppins' },
    { value: 'Montserrat', label: 'Montserrat' }
  ];

  const presetIcons = [
    { value: 'chat', label: 'Chat Bubble', path: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { value: 'help', label: 'Help Circle', path: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { value: 'message', label: 'Message', path: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { value: 'support', label: 'Support', path: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' }
  ];
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
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Theme Colors</h2>
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
                <p className="text-slate-500 text-sm mt-1">Used for chat button, header, and customer messages</p>
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
                <p className="text-slate-500 text-sm mt-1">Used for admin/support messages</p>
              </div>
              <div>
                <label className="block text-slate-300 mb-2">Background Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.background_color || '#FFFFFF'}
                    onChange={(e) => handleChange('background_color', e.target.value)}
                    className="w-12 h-10 rounded border border-slate-600 bg-slate-700"
                  />
                  <input
                    type="text"
                    value={settings.background_color || '#FFFFFF'}
                    onChange={(e) => handleChange('background_color', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                    placeholder="#FFFFFF"
                  />
                </div>
                <p className="text-slate-500 text-sm mt-1">Chat panel background color</p>
              </div>
              <div>
                <label className="block text-slate-300 mb-2">Header Text Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.header_text_color || '#FFFFFF'}
                    onChange={(e) => handleChange('header_text_color', e.target.value)}
                    className="w-12 h-10 rounded border border-slate-600 bg-slate-700"
                  />
                  <input
                    type="text"
                    value={settings.header_text_color || '#FFFFFF'}
                    onChange={(e) => handleChange('header_text_color', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                    placeholder="#FFFFFF"
                  />
                </div>
                <p className="text-slate-500 text-sm mt-1">Text color in the chat header</p>
              </div>
              <div>
                <label className="block text-slate-300 mb-2">Customer Message Text</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.customer_text_color || '#FFFFFF'}
                    onChange={(e) => handleChange('customer_text_color', e.target.value)}
                    className="w-12 h-10 rounded border border-slate-600 bg-slate-700"
                  />
                  <input
                    type="text"
                    value={settings.customer_text_color || '#FFFFFF'}
                    onChange={(e) => handleChange('customer_text_color', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                    placeholder="#FFFFFF"
                  />
                </div>
                <p className="text-slate-500 text-sm mt-1">Text color for customer messages</p>
              </div>
              <div>
                <label className="block text-slate-300 mb-2">Admin Message Text</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.admin_text_color || '#1F2937'}
                    onChange={(e) => handleChange('admin_text_color', e.target.value)}
                    className="w-12 h-10 rounded border border-slate-600 bg-slate-700"
                  />
                  <input
                    type="text"
                    value={settings.admin_text_color || '#1F2937'}
                    onChange={(e) => handleChange('admin_text_color', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                    placeholder="#1F2937"
                  />
                </div>
                <p className="text-slate-500 text-sm mt-1">Text color for admin/support messages</p>
              </div>
            </div>
          </div>

          {/* Style Settings */}
          <div className="border-b border-slate-700 pb-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Style</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-300 mb-2">Border Radius</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={settings.border_radius || '12'}
                    onChange={(e) => handleChange('border_radius', e.target.value)}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-slate-300 w-12 text-center">{settings.border_radius || '12'}px</span>
                </div>
                <p className="text-slate-500 text-sm mt-1">Corner roundness of the chat panel</p>
              </div>
              <div>
                <label className="block text-slate-300 mb-2">Font Family</label>
                <select
                  value={settings.font_family || 'system-ui'}
                  onChange={(e) => handleChange('font_family', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200"
                >
                  {fontOptions.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
                <p className="text-slate-500 text-sm mt-1">Font used in the chat widget</p>
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

          {/* Widget Icon */}
          <div className="border-b border-slate-700 pb-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Widget Icon</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {presetIcons.map((icon) => (
                <label
                  key={icon.value}
                  className={`flex flex-col items-center space-y-2 p-4 rounded-lg border cursor-pointer transition-colors ${
                    settings.widget_icon === icon.value
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="widget_icon"
                    value={icon.value}
                    checked={settings.widget_icon === icon.value}
                    onChange={(e) => handleChange('widget_icon', e.target.value)}
                    className="sr-only"
                  />
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: settings.primary_color }}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path} />
                    </svg>
                  </div>
                  <span className="text-slate-300 text-sm">{icon.label}</span>
                </label>
              ))}
            </div>
            <p className="text-slate-500 text-sm mt-4">Select an icon to display on the chat widget button</p>
          </div>

          {/* Greeting Message */}
          <div className="border-b border-slate-700 pb-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Greeting Message</h2>
            <div className="max-w-lg">
              <textarea
                value={settings.greeting_message || ''}
                onChange={(e) => handleChange('greeting_message', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 placeholder-slate-500"
                placeholder="Hi! How can we help you today?"
                rows={3}
              />
              <p className="text-slate-500 text-sm mt-1">
                This message appears when a user opens the chat widget for the first time
              </p>
            </div>
          </div>

          {/* Preview - Uses actual SupportWidget component for accurate preview */}
          <div className="border-b border-slate-700 pb-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Preview</h2>
            <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
              <div className="flex justify-center gap-8 items-start">
                {/* Chat Button Preview */}
                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-3">Button</p>
                  <div
                    className={`relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
                      settings.is_enabled ? 'scale-100' : 'scale-0'
                    }`}
                    style={{ backgroundColor: settings.primary_color }}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={presetIcons.find(i => i.value === settings.widget_icon)?.path || presetIcons[0].path} />
                    </svg>
                  </div>
                </div>

                {/* Chat Panel Preview - Uses actual SupportWidget component */}
                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-3">Chat Panel (Live Preview)</p>
                  <div className="w-80">
                    <SupportWidget
                      previewMode={true}
                      previewSettings={settings}
                    />
                  </div>
                </div>
              </div>
              <div className="text-center text-slate-400 mt-6">
                <p className="text-sm">Position: {settings.position.replace('-', ' ')}</p>
                {settings.greeting_message && (
                  <p className="text-sm mt-1">Greeting: &quot;{settings.greeting_message}&quot;</p>
                )}
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