import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

const CATEGORIES = [
  { value: 'social', label: 'Social Media' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'development', label: 'Development' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'cloud', label: 'Cloud Storage' },
  { value: 'communication', label: 'Communication' },
  { value: 'other', label: 'Other' }
];

const PRESET_SERVICES = {
  google: {
    name: 'google',
    display_name: 'Google',
    description: 'Access Google services like Gmail, Drive, Calendar, Analytics',
    authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_url: 'https://oauth2.googleapis.com/token',
    scope_default: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    category: 'productivity',
    icon_url: 'https://developers.google.com/identity/images/g-logo.png'
  },
  facebook: {
    name: 'facebook',
    display_name: 'Facebook',
    description: 'Manage Facebook pages, posts, and ads',
    authorization_url: 'https://www.facebook.com/v18.0/dialog/oauth',
    token_url: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scope_default: 'pages_manage_posts,pages_read_engagement',
    category: 'social',
    icon_url: 'https://static.xx.fbcdn.net/rsrc.php/yb/r/hLRJ1GG_y0J.ico'
  },
  twitter: {
    name: 'twitter',
    display_name: 'X (Twitter)',
    description: 'Post tweets, manage timeline, and access analytics',
    authorization_url: 'https://twitter.com/i/oauth2/authorize',
    token_url: 'https://api.twitter.com/2/oauth2/token',
    scope_default: 'tweet.read tweet.write users.read',
    category: 'social',
    icon_url: 'https://abs.twimg.com/favicons/twitter.2.ico'
  },
  linkedin: {
    name: 'linkedin',
    display_name: 'LinkedIn',
    description: 'Share content and manage LinkedIn company pages',
    authorization_url: 'https://www.linkedin.com/oauth/v2/authorization',
    token_url: 'https://www.linkedin.com/oauth/v2/accessToken',
    scope_default: 'r_liteprofile r_emailaddress w_member_social',
    category: 'social',
    icon_url: 'https://static.licdn.com/sc/h/al2o9zrvru7aqj8e1x2rzsrca'
  },
  github: {
    name: 'github',
    display_name: 'GitHub',
    description: 'Access repositories, issues, and manage code',
    authorization_url: 'https://github.com/login/oauth/authorize',
    token_url: 'https://github.com/login/oauth/access_token',
    scope_default: 'repo user',
    category: 'development',
    icon_url: 'https://github.com/favicon.ico'
  },
  slack: {
    name: 'slack',
    display_name: 'Slack',
    description: 'Send messages and manage Slack workspaces',
    authorization_url: 'https://slack.com/oauth/v2/authorize',
    token_url: 'https://slack.com/api/oauth.v2.access',
    scope_default: 'chat:write channels:read',
    category: 'communication',
    icon_url: 'https://a.slack-edge.com/80588/img/icons/favicon-32.png'
  }
};

export default function OAuthServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    client_id: '',
    client_secret: '',
    authorization_url: '',
    token_url: '',
    scope_default: '',
    redirect_uri: '/api/oauth/callback/',
    icon_url: '',
    category: 'other',
    is_active: true
  });

  useEffect(() => {
    fetchServices();
    
    // Set proper redirect URI when component mounts on client
    if (typeof window !== 'undefined') {
      setFormData(prev => ({
        ...prev,
        redirect_uri: `${window.location.origin}/api/oauth/callback/`
      }));
    }
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/oauth-services');
      const data = await response.json();
      setServices(data || []);
    } catch (error) {
      console.error('Failed to fetch OAuth services:', error);
      setMessage('Failed to load OAuth services');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const url = editingService ? `/api/oauth-services/${editingService.id}` : '/api/oauth-services';
      const method = editingService ? 'PUT' : 'POST';
      
      // Add service ID to redirect URI if not already there
      const redirectUri = formData.redirect_uri.endsWith('/') 
        ? formData.redirect_uri + (editingService?.id || 'NEW_ID')
        : formData.redirect_uri;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          redirect_uri: redirectUri
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(editingService ? 'OAuth service updated successfully!' : 'OAuth service created successfully!');
        setShowCreateForm(false);
        setEditingService(null);
        resetForm();
        fetchServices();
      } else {
        setMessage('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to save OAuth service:', error);
      setMessage('Failed to save OAuth service');
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      display_name: service.display_name,
      description: service.description || '',
      client_id: service.client_id,
      client_secret: service.client_secret === '***masked***' ? '' : service.client_secret,
      authorization_url: service.authorization_url,
      token_url: service.token_url,
      scope_default: service.scope_default || '',
      redirect_uri: service.redirect_uri,
      icon_url: service.icon_url || '',
      category: service.category,
      is_active: service.is_active
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (service) => {
    if (!confirm(`Are you sure you want to delete ${service.display_name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/oauth-services/${service.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('OAuth service deleted successfully!');
        fetchServices();
      } else {
        setMessage('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete OAuth service:', error);
      setMessage('Failed to delete OAuth service');
    }
  };

  const loadPreset = (presetKey) => {
    const preset = PRESET_SERVICES[presetKey];
    const redirectUri = typeof window !== 'undefined' 
      ? `${window.location.origin}/api/oauth/callback/` 
      : '/api/oauth/callback/';
      
    setFormData({
      ...formData,
      ...preset,
      redirect_uri: redirectUri
    });
  };

  const resetForm = () => {
    const redirectUri = typeof window !== 'undefined' 
      ? `${window.location.origin}/api/oauth/callback/` 
      : '/api/oauth/callback/';
      
    setFormData({
      name: '',
      display_name: '',
      description: '',
      client_id: '',
      client_secret: '',
      authorization_url: '',
      token_url: '',
      scope_default: '',
      redirect_uri: redirectUri,
      icon_url: '',
      category: 'other',
      is_active: true
    });
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingService(null);
    resetForm();
    setMessage('');
  };

  if (loading) {
    return (
      <AdminLayout title="OAuth Services">
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <div className="text-lg text-slate-300">Loading OAuth services...</div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="OAuth Services">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">OAuth Services</h1>
            <p className="text-slate-400 mt-1">Manage OAuth connections for subscriber authentication</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Add OAuth Service
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-xl ${
            message.includes('success') || message.includes('Success')
              ? 'bg-emerald-900/20 border border-emerald-600/30 text-emerald-300'
              : 'bg-red-900/20 border border-red-600/30 text-red-300'
          }`}>
            {message}
          </div>
        )}

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200">
                {editingService ? 'Edit OAuth Service' : 'Create OAuth Service'}
              </h3>
            </div>
            <div className="p-6">
              {/* Preset Services */}
              {!editingService && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Quick Setup (Optional)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {Object.entries(PRESET_SERVICES).map(([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => loadPreset(key)}
                        className="flex items-center space-x-2 p-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-slate-200 transition-colors"
                      >
                        {preset.icon_url && (
                          <img src={preset.icon_url} alt={preset.display_name} className="w-5 h-5" />
                        )}
                        <span className="text-sm">{preset.display_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Service Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="google, facebook, twitter"
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      required
                    />
                    <p className="text-xs text-slate-400 mt-1">Unique identifier (lowercase, no spaces)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Display Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                      placeholder="Google, Facebook, Twitter"
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description of what this OAuth service provides"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    rows="3"
                  />
                </div>

                {/* OAuth Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Client ID <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.client_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
                      placeholder="OAuth application client ID"
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Client Secret <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.client_secret}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_secret: e.target.value }))}
                      placeholder={editingService ? "Leave empty to keep current secret" : "OAuth application client secret"}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      required={!editingService}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Authorization URL <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="url"
                      value={formData.authorization_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, authorization_url: e.target.value }))}
                      placeholder="https://provider.com/oauth/authorize"
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Token URL <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="url"
                      value={formData.token_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, token_url: e.target.value }))}
                      placeholder="https://provider.com/oauth/token"
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Default Scopes
                  </label>
                  <input
                    type="text"
                    value={formData.scope_default}
                    onChange={(e) => setFormData(prev => ({ ...prev, scope_default: e.target.value }))}
                    placeholder="scope1 scope2 scope3"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  <p className="text-xs text-slate-400 mt-1">Space-separated list of OAuth scopes</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Redirect URI <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.redirect_uri}
                    onChange={(e) => setFormData(prev => ({ ...prev, redirect_uri: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">Configure this URL in your OAuth application</p>
                </div>

                {/* Additional Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Icon URL
                    </label>
                    <input
                      type="url"
                      value={formData.icon_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, icon_url: e.target.value }))}
                      placeholder="https://provider.com/icon.png"
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    >
                      {CATEGORIES.map(category => (
                        <option key={category.value} value={category.value}>{category.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 bg-slate-600 border-slate-500 rounded focus:ring-emerald-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium text-slate-300">Service Active</span>
                  </label>
                  <p className="text-xs text-slate-400 mt-1">When active, subscribers can connect to this service</p>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {editingService ? 'Update Service' : 'Create Service'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-slate-600 hover:bg-slate-700 text-slate-200 px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Services List */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200">OAuth Services ({services.length})</h3>
          </div>
          
          {services.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-slate-400 text-lg mb-4">No OAuth services configured</div>
              <p className="text-slate-500 mb-6">Create your first OAuth service to enable subscriber connections</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Add OAuth Service
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Client ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {services.map((service) => (
                    <tr key={service.id} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {service.icon_url && (
                            <img src={service.icon_url} alt={service.display_name} className="w-8 h-8 rounded" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-slate-200">{service.display_name}</div>
                            <div className="text-sm text-slate-400">{service.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300 capitalize">
                          {service.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          service.is_active 
                            ? 'bg-emerald-900/30 text-emerald-300' 
                            : 'bg-red-900/30 text-red-300'
                        }`}>
                          {service.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                        {service.client_id.substring(0, 12)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {new Date(service.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(service)}
                          className="text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(service)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-blue-300 mb-4">Setup Instructions</h4>
            <div className="space-y-3 text-sm text-blue-200/80">
              <p><strong>1. Create OAuth App:</strong> Register your application with the OAuth provider</p>
              <p><strong>2. Configure Redirect URI:</strong> Use the provided redirect URI in your OAuth app settings</p>
              <p><strong>3. Get Credentials:</strong> Copy Client ID and Client Secret from your OAuth app</p>
              <p><strong>4. Add Service:</strong> Create the service here with your credentials</p>
              <p><strong>5. Test Connection:</strong> Subscribers can now connect their accounts</p>
            </div>
          </div>

          <div className="bg-amber-900/20 border border-amber-600/30 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-amber-300 mb-4">Security Notes</h4>
            <div className="space-y-3 text-sm text-amber-200/80">
              <p><strong>Client Secrets:</strong> Are stored securely and never exposed to users</p>
              <p><strong>Access Tokens:</strong> Are encrypted and automatically refreshed when possible</p>
              <p><strong>Audit Logs:</strong> All OAuth activities are logged for security monitoring</p>
              <p><strong>Scopes:</strong> Request only the minimum required permissions</p>
              <p><strong>State Parameter:</strong> Used to prevent CSRF attacks during OAuth flow</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}