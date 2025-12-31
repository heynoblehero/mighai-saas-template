import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function EmailManagement() {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [settings, setSettings] = useState({
    admin_email: '',
    from_email: '',
    from_name: '',
    resend_api_key: '',
    email_notifications: true
  });
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState({ settings: true, templates: true, campaigns: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    type: 'welcome',
    description: '',
    target_plan: 'All Plans',
    send_delay_hours: 0,
    is_active: true
  });
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    template_type: 'transactional',
    content: '',
    is_active: true
  });

  useEffect(() => {
    // Load data
    fetchCampaigns();
    fetchTemplates();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(prev => ({ ...prev, settings: true }));
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
      setLoading(prev => ({ ...prev, settings: false }));
    }
  };

  const fetchCampaigns = async () => {
    setLoading(prev => ({ ...prev, campaigns: true }));
    try {
      const response = await fetch('/api/admin/campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      } else {
        setError('Failed to fetch campaigns');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, campaigns: false }));
    }
  };

  const fetchTemplates = async () => {
    setLoading(prev => ({ ...prev, templates: true }));
    try {
      const response = await fetch('/api/admin/email-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        setError('Failed to fetch email templates');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, templates: false }));
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

  const requestOTPForAction = async (action, campaignId = null) => {
    try {
      const response = await fetch('/api/auth/send-campaign-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, campaignId }),
      });

      if (response.ok) {
        setSelectedCampaign({ action, campaignId });
        setShowOTPModal(true);
        setError('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    }
  };

  const verifyOTPAndExecute = async () => {
    setOtpLoading(true);
    try {
      const response = await fetch('/api/auth/verify-campaign-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp: otpCode,
          action: selectedCampaign.action,
          campaignId: selectedCampaign.campaignId
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowOTPModal(false);
        setOtpCode('');

        // Execute the action
        if (selectedCampaign.action === 'create') {
          setShowCampaignModal(true);
          setEditingCampaign(null);
          setCampaignForm({
            name: '',
            type: 'welcome',
            description: '',
            target_plan: 'All Plans',
            send_delay_hours: 0,
            is_active: true
          });
        } else if (selectedCampaign.action === 'send') {
          await sendCampaign(selectedCampaign.campaignId);
        } else if (selectedCampaign.action === 'newsletter') {
          // For newsletter, we can create a special campaign
          setShowCampaignModal(true);
          setEditingCampaign(null);
          setCampaignForm({
            name: 'Newsletter Campaign',
            type: 'newsletter',
            description: 'Newsletter campaign for subscribers',
            target_plan: 'All Plans',
            send_delay_hours: 0,
            is_active: true
          });
        }

        await fetchCampaigns(); // Refresh list
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (err) {
      setError('OTP verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  const sendCampaign = async (campaignId) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}/send`, {
        method: 'POST',
      });

      if (response.ok) {
        setSuccess('Campaign sent successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send campaign');
      }
    } catch (err) {
      setError('Failed to send campaign');
    }
  };

  const toggleCampaign = async (campaignId, isActive) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (response.ok) {
        await fetchCampaigns();
        setSuccess('Campaign status updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update campaign status');
      }
    } catch (err) {
      setError('Failed to update campaign status');
    }
  };

  const deleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCampaigns();
        setSuccess('Campaign deleted successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete campaign');
      }
    } catch (err) {
      setError('Failed to delete campaign');
    }
  };

  const openCreateCampaignModal = () => {
    setEditingCampaign(null);
    setCampaignForm({
      name: '',
      type: 'welcome',
      description: '',
      target_plan: 'All Plans',
      send_delay_hours: 0,
      is_active: true
    });
    setShowCampaignModal(true);
  };

  const openEditCampaignModal = (campaign) => {
    setEditingCampaign(campaign);
    setCampaignForm({
      name: campaign.name,
      type: campaign.type,
      description: campaign.description,
      target_plan: campaign.target_plan,
      send_delay_hours: campaign.send_delay_hours,
      is_active: campaign.is_active
    });
    setShowCampaignModal(true);
  };

  const saveCampaign = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let response;
      if (editingCampaign) {
        // Update existing campaign
        response = await fetch(`/api/admin/campaigns/${editingCampaign.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campaignForm),
        });
      } else {
        // Create new campaign
        response = await fetch('/api/admin/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campaignForm),
        });
      }

      const data = await response.json();

      if (response.ok) {
        setShowCampaignModal(false);
        await fetchCampaigns();
        setSuccess(editingCampaign ? 'Campaign updated successfully!' : 'Campaign created successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || (editingCampaign ? 'Failed to update campaign' : 'Failed to create campaign'));
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/email-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTemplates();
        setSuccess('Template deleted successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete template');
      }
    } catch (err) {
      setError('Failed to delete template');
    }
  };

  const openCreateTemplateModal = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      subject: '',
      template_type: 'transactional',
      content: '',
      is_active: true
    });
    setShowTemplateModal(true);
  };

  const openEditTemplateModal = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      template_type: template.template_type,
      content: template.content || '',
      is_active: template.is_active
    });
    setShowTemplateModal(true);
  };

  const saveTemplate = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let response;
      if (editingTemplate) {
        // Update existing template
        response = await fetch(`/api/admin/email-templates/${editingTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateForm),
        });
      } else {
        // Create new template
        response = await fetch('/api/admin/email-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateForm),
        });
      }

      const data = await response.json();

      if (response.ok) {
        setShowTemplateModal(false);
        await fetchTemplates();
        setSuccess(editingTemplate ? 'Template updated successfully!' : 'Template created successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || (editingTemplate ? 'Failed to update template' : 'Failed to create template'));
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

  const getTypeColor = (type) => {
    const colors = {
      'otp': 'bg-blue-900/30 text-blue-300 border border-blue-600/30',
      'transactional': 'bg-emerald-900/30 text-emerald-300 border border-emerald-600/30',
      'campaign': 'bg-purple-900/30 text-purple-300 border border-purple-600/30'
    };
    return colors[type] || 'bg-slate-700 text-slate-300 border border-slate-600';
  };

  const getCampaignTypeColor = (type) => {
    switch (type) {
      case 'welcome': return 'bg-green-100 text-green-800';
      case 'onboarding': return 'bg-blue-100 text-blue-800';
      case 'newsletter': return 'bg-purple-100 text-purple-800';
      case 'marketing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderSettingsTab = () => (
    <div className="space-y-6 animate-fadeIn">
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

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                type="button"
                onClick={testEmailSettings}
                disabled={saving}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 text-slate-200 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 inline-flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{saving ? 'Sending...' : 'Send Test Email'}</span>
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
  );

  const renderTemplatesTab = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-400">Total Templates</h3>
              <p className="text-2xl font-bold text-slate-200">{templates.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-emerald-600/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-400">Active Templates</h3>
              <p className="text-2xl font-bold text-slate-200">{templates.filter(t => t.is_active).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-400">Total Emails Sent</h3>
              <p className="text-2xl font-bold text-slate-200">{templates.reduce((sum, t) => sum + t.usage_count, 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-200">Email Templates</h3>
          <button
            onClick={openCreateTemplateModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Create Template</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Template
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {templates.map((template, index) => (
                <tr
                  key={template.id}
                  className="hover:bg-slate-700/50 transition-colors"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: 'fadeInUp 0.5s ease-out forwards'
                  }}
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-200">
                        {template.name}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        {template.subject}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs font-medium rounded-full ${getTypeColor(template.template_type)}`}>
                      {template.template_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-slate-300 font-medium">
                      {template.usage_count} emails sent
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-sm font-medium rounded-full ${
                      template.is_active
                        ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-600/30'
                        : 'bg-red-900/30 text-red-300 border border-red-600/30'
                    }`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-slate-300">
                      {formatDate(template.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button className="text-emerald-400 hover:text-emerald-300 transition-colors">
                        Preview
                      </button>
                      <button
                        onClick={() => openEditTemplateModal(template)}
                        className="text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              Email Template System
            </h3>
            <div className="text-emerald-200/80 space-y-2">
              <p>• Use variables like {'{{USER_EMAIL}}'}, {'{{OTP_CODE}}'}, {'{{USER_NAME}}'} in your templates</p>
              <p>• OTP templates are used for authentication and verification emails</p>
              <p>• Transactional templates are for system notifications and alerts</p>
              <p>• Campaign templates are used for marketing and promotional emails</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCampaignsTab = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* Campaigns List */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-200">Email Campaigns</h3>
          <button
            onClick={() => requestOTPForAction('create')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Create Campaign</span>
          </button>
        </div>

        {campaigns.length > 0 ? (
          <div className="p-6 space-y-4">
            {campaigns.map((campaign, index) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600 transition-all duration-300 hover:shadow-lg"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'slideIn 0.5s ease-out forwards'
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-slate-200">{campaign.name}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${getCampaignTypeColor(campaign.type)}`}>
                      {campaign.type}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${campaign.is_active ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-600/30' : 'bg-red-900/30 text-red-300 border border-red-600/30'}`}>
                      {campaign.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-2">{campaign.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Target: {campaign.target_plan}</span>
                    <span>Delay: {campaign.send_delay_hours}h</span>
                    <span>Created: {formatDate(campaign.created_at)}</span>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 mt-3">
                    <div className="text-xs">
                      <span className="text-slate-400">Sent:</span>
                      <span className="text-slate-200 ml-1">{campaign.stats.sent}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-400">Opened:</span>
                      <span className="text-slate-200 ml-1">{campaign.stats.opened}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-400">Clicked:</span>
                      <span className="text-slate-200 ml-1">{campaign.stats.clicked}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCampaign(campaign.id, campaign.is_active)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      campaign.is_active
                        ? 'bg-slate-600 hover:bg-slate-500 text-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {campaign.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => requestOTPForAction('send', campaign.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg font-medium transition-colors"
                    disabled={!campaign.is_active}
                  >
                    Send Now
                  </button>
                  <button
                    onClick={() => openEditCampaignModal(campaign)}
                    className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-slate-200 text-sm rounded-lg font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteCampaign(campaign.id)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No campaigns yet</h3>
            <p className="text-slate-400 mb-6">Create your first email campaign to engage with your customers</p>
            <button
              onClick={() => requestOTPForAction('create')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              Create Your First Campaign
            </button>
          </div>
        )}
      </div>

      {/* Campaign Info Card */}
      <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-emerald-300 mb-2">
              Email Campaign Management
            </h3>
            <div className="text-emerald-200/80 space-y-2">
              <p>• Welcome campaigns: Automated emails for new subscribers</p>
              <p>• Onboarding campaigns: Help users get started with your product</p>
              <p>• Newsletter campaigns: Regular updates and news to your subscribers</p>
              <p>• Marketing campaigns: Promotional emails to drive engagement</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout title="Email Management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Email Management</h1>
            <p className="text-slate-400 mt-1">Configure settings, templates, and campaigns in one place</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'campaigns'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Campaigns
            </div>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'templates'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Templates
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'settings'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          {activeTab === 'campaigns' && renderCampaignsTab()}
          {activeTab === 'templates' && renderTemplatesTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </div>
      </div>

      {/* Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-200">
                {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
              </h3>
              <button
                onClick={() => setShowCampaignModal(false)}
                className="text-slate-400 hover:text-slate-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Campaign Name</label>
                  <input
                    type="text"
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="Enter campaign name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Campaign Type</label>
                  <select
                    value={campaignForm.type}
                    onChange={(e) => setCampaignForm({...campaignForm, type: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  >
                    <option value="welcome">Welcome</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="newsletter">Newsletter</option>
                    <option value="marketing">Marketing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={campaignForm.description}
                    onChange={(e) => setCampaignForm({...campaignForm, description: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="Enter campaign description"
                    rows="3"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Target Plan</label>
                    <select
                      value={campaignForm.target_plan}
                      onChange={(e) => setCampaignForm({...campaignForm, target_plan: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    >
                      <option value="All Plans">All Plans</option>
                      <option value="Free Plan">Free Plan</option>
                      <option value="Pro Plan">Pro Plan</option>
                      <option value="Enterprise Plan">Enterprise Plan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Send Delay (hours)</label>
                    <input
                      type="number"
                      value={campaignForm.send_delay_hours}
                      onChange={(e) => setCampaignForm({...campaignForm, send_delay_hours: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="campaign-active"
                    checked={campaignForm.is_active}
                    onChange={(e) => setCampaignForm({...campaignForm, is_active: e.target.checked})}
                    className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                  />
                  <label htmlFor="campaign-active" className="ml-2 text-sm font-medium text-slate-300">
                    Active
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCampaignModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCampaign}
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white rounded-lg font-medium transition-colors"
                >
                  {saving ? 'Saving...' : (editingCampaign ? 'Update Campaign' : 'Create Campaign')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-200">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-slate-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Template Name</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="Enter template name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                  <input
                    type="text"
                    value={templateForm.subject}
                    onChange={(e) => setTemplateForm({...templateForm, subject: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="Enter email subject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Template Type</label>
                  <select
                    value={templateForm.template_type}
                    onChange={(e) => setTemplateForm({...templateForm, template_type: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  >
                    <option value="transactional">Transactional</option>
                    <option value="otp">OTP</option>
                    <option value="campaign">Campaign</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Content</label>
                  <textarea
                    value={templateForm.content}
                    onChange={(e) => setTemplateForm({...templateForm, content: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="Enter email content (HTML supported)"
                    rows="6"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="template-active"
                    checked={templateForm.is_active}
                    onChange={(e) => setTemplateForm({...templateForm, is_active: e.target.checked})}
                    className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                  />
                  <label htmlFor="template-active" className="ml-2 text-sm font-medium text-slate-300">
                    Active
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTemplate}
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white rounded-lg font-medium transition-colors"
                >
                  {saving ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Admin Verification Required</h3>
            <p className="text-slate-400 mb-4">
              Please enter the OTP sent to your admin email to continue with this action.
            </p>
            <div className="mb-6">
              <label htmlFor="otp" className="block text-sm font-medium text-slate-300 mb-2">Verification Code</label>
              <input
                id="otp"
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="Enter 6-digit code"
                maxLength="6"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOTPModal(false);
                  setOtpCode('');
                  setError('');
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors flex-1"
                disabled={otpLoading}
              >
                Cancel
              </button>
              <button
                onClick={verifyOTPAndExecute}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white rounded-lg font-medium transition-colors flex-1"
                disabled={otpLoading || otpCode.length !== 6}
              >
                {otpLoading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </AdminLayout>
  );
}