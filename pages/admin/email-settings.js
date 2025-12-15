import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function EmailSettings() {
  const [settings, setSettings] = useState({
    admin_email: '',
    from_email: '',
    from_name: '',
    resend_api_key: '',
    email_notifications: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/email-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      } else {
        setError('Failed to fetch email settings');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/email-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Email settings updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to update settings');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const testEmailSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: settings.admin_email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Test email sent successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to send test email');
      }
    } catch (err) {
      setError('Failed to send test email');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Email Settings">
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <div className="text-lg text-slate-300">Loading email settings...</div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Email Settings">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Email Settings</h1>
            <p className="text-slate-400 mt-1">Configure email delivery and notification settings</p>
          </div>
          <button
            onClick={testEmailSettings}
            className="mt-4 sm:mt-0 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            disabled={saving}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>{saving ? 'Sending...' : 'Send Test Email'}</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <span className="text-red-300">{error}</span>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <span className="text-emerald-300">{success}</span>
              </div>
            </div>
          </div>
        )}

        {/* Settings Form */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200">Email Configuration</h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Admin Email */}
              <div>
                <label htmlFor="admin_email" className="block text-sm font-medium text-slate-300 mb-2">
                  Admin Email <span className="text-red-400">*</span>
                </label>
                <input
                  id="admin_email"
                  type="email"
                  name="admin_email"
                  value={settings.admin_email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="admin@yourdomain.com"
                  required
                />
                <p className="mt-2 text-sm text-slate-400">
                  Email address where admin notifications will be sent
                </p>
              </div>

              {/* From Email */}
              <div>
                <label htmlFor="from_email" className="block text-sm font-medium text-slate-300 mb-2">
                  From Email <span className="text-red-400">*</span>
                </label>
                <input
                  id="from_email"
                  type="email"
                  name="from_email"
                  value={settings.from_email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="noreply@yourdomain.com"
                  required
                />
                <p className="mt-2 text-sm text-slate-400">
                  Email address that will appear as sender for all outgoing emails
                </p>
              </div>

              {/* From Name */}
              <div>
                <label htmlFor="from_name" className="block text-sm font-medium text-slate-300 mb-2">
                  From Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="from_name"
                  type="text"
                  name="from_name"
                  value={settings.from_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="Mighai"
                  required
                />
                <p className="mt-2 text-sm text-slate-400">
                  Name that will appear as sender for all outgoing emails
                </p>
              </div>

              {/* Resend API Key */}
              <div>
                <label htmlFor="resend_api_key" className="block text-sm font-medium text-slate-300 mb-2">
                  Resend API Key
                </label>
                <input
                  id="resend_api_key"
                  type="password"
                  name="resend_api_key"
                  value={settings.resend_api_key}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
                <p className="mt-2 text-sm text-slate-400">
                  Your Resend API key for email delivery. Get it from{' '}
                  <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline">
                    resend.com/api-keys
                  </a>
                </p>
              </div>

              {/* Email Notifications Toggle */}
              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="email_notifications"
                    checked={settings.email_notifications}
                    onChange={handleChange}
                    className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-slate-300">Enable Email Notifications</span>
                </label>
                <p className="mt-2 text-sm text-slate-400 ml-7">
                  Receive email notifications for important events (new subscribers, errors, support requests)
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Email Templates Info */}
        <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-emerald-300 mb-2">
                Email Templates
              </h3>
              <p className="text-emerald-200/80 mb-4">
                Your email templates are automatically configured with professional designs. 
                You can customize them through the Email Templates section.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <h4 className="text-slate-200 font-semibold mb-2">🔐 Admin Login OTP</h4>
                  <p className="text-slate-400 text-sm">Sent when admin signs in</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <h4 className="text-slate-200 font-semibold mb-2">👋 Customer Signup OTP</h4>
                  <p className="text-slate-400 text-sm">Sent for email verification</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <h4 className="text-slate-200 font-semibold mb-2">🔔 New Subscriber Alert</h4>
                  <p className="text-slate-400 text-sm">Admin notification for new signups</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <h4 className="text-slate-200 font-semibold mb-2">⚠️ System Error Alerts</h4>
                  <p className="text-slate-400 text-sm">Critical system notifications</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}