import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/AdminLayout';

export default function AdminSettings() {
  const router = useRouter();

  // AI Settings state
  const [aiSettings, setAiSettings] = useState({
    claude_api_key: '',
    claude_model: 'claude-sonnet-4-5-20250929',
    has_api_key: false,
    current_month_usage: 0,
    cost_limit_monthly: 100
  });
  const [aiKeyInput, setAiKeyInput] = useState('');
  const [aiLoading, setAiLoading] = useState(true);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiMessage, setAiMessage] = useState({ type: '', text: '' });

  // Fetch AI settings on mount
  useEffect(() => {
    fetchAiSettings();
  }, []);

  const fetchAiSettings = async () => {
    try {
      const response = await fetch('/api/admin/ai-settings');
      const data = await response.json();
      if (data.success) {
        setAiSettings(data.settings);
        setAiKeyInput(data.settings.claude_api_key || '');
      }
    } catch (error) {
      console.error('Error fetching AI settings:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const testAiConnection = async () => {
    if (!aiKeyInput || aiKeyInput.includes('••••')) {
      setAiMessage({ type: 'error', text: 'Please enter a valid API key to test' });
      return;
    }

    setAiTesting(true);
    setAiMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/ai/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: aiKeyInput })
      });

      const data = await response.json();

      if (data.valid) {
        setAiMessage({ type: 'success', text: 'Connection successful! API key is valid.' });
      } else {
        setAiMessage({ type: 'error', text: data.error || 'Invalid API key' });
      }
    } catch (error) {
      setAiMessage({ type: 'error', text: 'Failed to test connection' });
    } finally {
      setAiTesting(false);
    }
  };

  const saveAiSettings = async () => {
    setAiSaving(true);
    setAiMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claude_api_key: aiKeyInput,
          claude_model: aiSettings.claude_model
        })
      });

      const data = await response.json();

      if (data.success) {
        setAiMessage({ type: 'success', text: 'Settings saved successfully!' });
        fetchAiSettings(); // Refresh to show masked key
      } else {
        setAiMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (error) {
      setAiMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setAiSaving(false);
    }
  };

  const claudeModels = [
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 (Recommended)' },
    { id: 'claude-3-5-sonnet-latest', name: 'Claude Sonnet 3.5' },
    { id: 'claude-3-haiku-20240307', name: 'Claude Haiku 3 (Faster)' }
  ];

  const settingsCategories = [
    {
      id: 'email',
      name: 'Email Configuration',
      description: 'Manage email settings, templates, and campaigns',
      icon: '📧',
      items: [
        {
          title: 'Email Management',
          description: 'Configure email settings, templates, and campaigns',
          href: '/admin/email-management',
          action: 'Manage Email'
        }
      ]
    },
    {
      id: 'security',
      name: 'Security & Authentication',
      description: 'Two-factor authentication and admin security settings',
      icon: '🔐',
      items: [
        {
          title: 'Two-Factor Authentication',
          description: 'Configure Telegram 2FA for enhanced admin security',
          href: '/admin/security-settings',
          action: 'Configure 2FA'
        }
      ]
    },
    {
      id: 'system',
      name: 'System Settings',
      description: 'Core system configuration and monitoring',
      icon: '⚙️',
      items: [
        {
          title: 'Logs & Error Monitoring',
          description: 'View system logs and error monitoring information',
          href: '/admin/backend/server-logs',
          action: 'View Logs'
        },
        {
          title: 'Support Messages',
          description: 'Manage customer support conversations',
          href: '/admin/support-messages',
          action: 'View Messages'
        }
      ]
    },
    {
      id: 'reserved-pages',
      name: 'Reserved Pages',
      description: 'Customize customer-facing pages with AI-powered theming',
      icon: '🎨',
      items: [
        {
          title: 'Customer Login Page',
          description: 'Customize the login page theme and styling',
          href: '/admin/pages',
          action: 'Customize'
        },
        {
          title: 'Customer Signup Page',
          description: 'Customize the registration page theme and styling',
          href: '/admin/pages',
          action: 'Customize'
        },
        {
          title: 'Customer Dashboard',
          description: 'Customize the customer dashboard layout and theme',
          href: '/admin/pages',
          action: 'Customize'
        },
        {
          title: 'Customer Profile Page',
          description: 'Customize the profile management page',
          href: '/admin/pages',
          action: 'Customize'
        },
        {
          title: 'Billing & Upgrade Page',
          description: 'Customize the subscription upgrade page',
          href: '/admin/pages',
          action: 'Customize'
        },
        {
          title: 'Password Reset Page',
          description: 'Customize the password reset page',
          href: '/admin/pages',
          action: 'Customize'
        }
      ]
    },
    {
      id: 'content',
      name: 'Content Management',
      description: 'Manage your site content and pages',
      icon: '📄',
      items: [
        {
          title: 'Pages',
          description: 'Create and manage website pages',
          href: '/admin/pages',
          action: 'Manage Pages'
        },
        {
          title: 'Blog Posts',
          description: 'Write and manage blog content',
          href: '/admin/blog',
          action: 'Manage Blog'
        }
      ]
    },
    {
      id: 'business',
      name: 'Business Settings',
      description: 'Manage subscribers, plans, and billing',
      icon: '💼',
      items: [
        {
          title: 'Subscription Plans',
          description: 'Manage pricing tiers and subscriber limits',
          href: '/admin/plans',
          action: 'Manage Plans'
        },
        {
          title: 'Subscribers',
          description: 'View and manage platform subscribers',
          href: '/admin/subscribers',
          action: 'View Subscribers'
        }
      ]
    }
  ];

  const usagePercentage = aiSettings.cost_limit_monthly > 0
    ? Math.min((aiSettings.current_month_usage / aiSettings.cost_limit_monthly) * 100, 100)
    : 0;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your platform configuration and preferences</p>
        </div>

        {/* AI Configuration - Inline Form */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          {/* Category Header */}
          <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🤖</div>
              <div>
                <h2 className="text-xl font-semibold text-slate-200">AI Configuration</h2>
                <p className="text-slate-400 text-sm">Configure Claude AI for page generation and customization</p>
              </div>
            </div>
          </div>

          {/* AI Settings Form */}
          <div className="p-6">
            {aiLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* API Key Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Claude API Key
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="password"
                      value={aiKeyInput}
                      onChange={(e) => setAiKeyInput(e.target.value)}
                      placeholder="sk-ant-api03-..."
                      className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <button
                      onClick={testAiConnection}
                      disabled={aiTesting || !aiKeyInput}
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {aiTesting ? 'Testing...' : 'Test'}
                    </button>
                    <button
                      onClick={saveAiSettings}
                      disabled={aiSaving}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {aiSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Get your API key from{' '}
                    <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">
                      console.anthropic.com
                    </a>
                  </p>
                </div>

                {/* Model Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Model
                  </label>
                  <select
                    value={aiSettings.claude_model}
                    onChange={(e) => setAiSettings({ ...aiSettings, claude_model: e.target.value })}
                    className="w-full md:w-1/2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {claudeModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Message */}
                {aiMessage.text && (
                  <div className={`p-3 rounded-lg ${
                    aiMessage.type === 'success'
                      ? 'bg-green-900/30 border border-green-600/30 text-green-300'
                      : 'bg-red-900/30 border border-red-600/30 text-red-300'
                  }`}>
                    {aiMessage.text}
                  </div>
                )}

                {/* Usage Stats */}
                {aiSettings.has_api_key && (
                  <div className="pt-4 border-t border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-400">Usage This Month</span>
                      <span className="text-sm text-slate-300">
                        ${(aiSettings.current_month_usage || 0).toFixed(2)} / ${aiSettings.cost_limit_monthly} limit
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          usagePercentage > 80 ? 'bg-red-500' : usagePercentage > 50 ? 'bg-yellow-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${usagePercentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${aiSettings.has_api_key ? 'bg-green-500' : 'bg-slate-500'}`}></div>
                  <span className="text-sm text-slate-400">
                    {aiSettings.has_api_key ? 'API key configured' : 'API key not configured'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Other Settings Categories */}
        <div className="space-y-8">
          {settingsCategories.map((category) => (
            <div key={category.id} className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
              {/* Category Header */}
              <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{category.icon}</div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-200">{category.name}</h2>
                    <p className="text-slate-400 text-sm">{category.description}</p>
                  </div>
                </div>
              </div>

              {/* Category Items */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.items.map((item, index) => (
                    <div
                      key={index}
                      className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:bg-slate-700 transition-colors group cursor-pointer"
                      onClick={() => router.push(item.href)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-200 group-hover:text-white transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-slate-400 text-sm mt-1 group-hover:text-slate-300 transition-colors">
                            {item.description}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <button className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-md font-medium transition-colors">
                            {item.action}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* System Info Card */}
        <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-emerald-300 mb-2">
                Platform Settings
              </h3>
              <div className="text-emerald-200/80 space-y-2">
                <p>• Configure all aspects of your platform from this central settings hub</p>
                <p>• Email integration with Resend API for automated notifications and campaigns</p>
                <p>• Monitor system health and manage customer support efficiently</p>
                <p>• All settings are automatically saved and synchronized across your platform</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
