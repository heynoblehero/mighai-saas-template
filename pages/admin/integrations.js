import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState(null);
  const [testingIntegration, setTestingIntegration] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    webhook_url: '',
    method: 'POST',
    headers: '{}',
    body_template: '{}',
    trigger_events: [],
    is_active: true
  });

  const availableEvents = [
    'user_signup', 'user_login', 'subscription_created', 'subscription_updated', 
    'payment_success', 'payment_failed', 'plan_upgraded', 'plan_downgraded',
    'page_created', 'page_updated', 'api_call_made', 'usage_limit_reached'
  ];

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations');
      const data = await response.json();
      setIntegrations(data || []);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate JSON fields
      JSON.parse(formData.headers);
      JSON.parse(formData.body_template);
    } catch (error) {
      alert('Invalid JSON in headers or body template');
      return;
    }

    try {
      const url = editingIntegration ? `/api/integrations/${editingIntegration.id}` : '/api/integrations';
      const method = editingIntegration ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          trigger_events: formData.trigger_events.join(',')
        })
      });

      if (response.ok) {
        setShowCreateForm(false);
        setEditingIntegration(null);
        resetForm();
        fetchIntegrations();
      } else {
        const error = await response.text();
        alert('Failed to save integration: ' + error);
      }
    } catch (error) {
      console.error('Failed to save integration:', error);
      alert('Failed to save integration');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;
    
    try {
      const response = await fetch(`/api/integrations/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchIntegrations();
      }
    } catch (error) {
      console.error('Failed to delete integration:', error);
    }
  };

  const testIntegration = async (integration) => {
    setTestingIntegration(integration.id);
    setTestResult(null);
    
    try {
      const response = await fetch(`/api/integrations/${integration.id}/test`, {
        method: 'POST'
      });
      
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTestingIntegration(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      webhook_url: '',
      method: 'POST',
      headers: '{}',
      body_template: '{}',
      trigger_events: [],
      is_active: true
    });
  };

  const editIntegration = (integration) => {
    setEditingIntegration(integration);
    setFormData({
      name: integration.name,
      webhook_url: integration.webhook_url,
      method: integration.method,
      headers: integration.headers || '{}',
      body_template: integration.body_template || '{}',
      trigger_events: integration.trigger_events ? integration.trigger_events.split(',') : [],
      is_active: integration.is_active
    });
    setShowCreateForm(true);
  };

  const toggleEvent = (event) => {
    const currentEvents = [...formData.trigger_events];
    const index = currentEvents.indexOf(event);
    
    if (index === -1) {
      currentEvents.push(event);
    } else {
      currentEvents.splice(index, 1);
    }
    
    setFormData({ ...formData, trigger_events: currentEvents });
  };

  if (loading) {
    return (
      <AdminLayout title="Webhook Integrations">
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <div className="text-lg text-slate-300">Loading integrations...</div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Webhook Integrations">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Webhook Integrations</h1>
            <p className="text-slate-400 mt-1">Connect external services with webhook notifications</p>
          </div>
          <button
            onClick={() => { setShowCreateForm(true); resetForm(); }}
            className="mt-4 sm:mt-0 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Create Integration
          </button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200">
                {editingIntegration ? 'Edit Integration' : 'Create New Integration'}
              </h3>
            </div>
            <div className="p-6">
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Integration Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Slack Notifications"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    HTTP Method
                  </label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  >
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Webhook URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Headers (JSON)
                </label>
                <textarea
                  value={formData.headers}
                  onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                  placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token"}'
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-sm transition-colors"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Body Template (JSON with variables)
                </label>
                <textarea
                  value={formData.body_template}
                  onChange={(e) => setFormData({ ...formData, body_template: e.target.value })}
                  placeholder='{"text": "New user {{user_email}} signed up for {{plan_name}}", "user_id": "{{user_id}}"}'
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-sm transition-colors"
                  rows="4"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Available variables: {'{{user_id}}, {{user_email}}, {{plan_name}}, {{event_type}}, {{timestamp}}'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Trigger Events
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableEvents.map(event => (
                    <label key={event} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.trigger_events.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                      />
                      <span className="text-slate-300">{event.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-slate-300">Active</span>
                </label>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                >
                  {editingIntegration ? 'Update Integration' : 'Create Integration'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false); setEditingIntegration(null); }}
                  className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        )}

        {/* Test Result */}
        {testResult && (
          <div className={`border rounded-lg p-4 ${testResult.success ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
            <h4 className={`font-semibold ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
              Test {testResult.success ? 'Successful' : 'Failed'}
            </h4>
            <pre className={`mt-2 text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}

        {/* Integrations List */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Active Integrations</h3>
          </div>
          
          {integrations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No integrations created yet. Create your first webhook integration to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Events
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Triggered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {integrations.map((integration) => (
                    <tr key={integration.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{integration.name}</div>
                        <div className="text-sm text-gray-500">{integration.method}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 truncate max-w-xs">
                          {integration.webhook_url}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {integration.trigger_events ? (
                            <div className="flex flex-wrap gap-1">
                              {integration.trigger_events.split(',').slice(0, 3).map((event, i) => (
                                <span key={i} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                                  {event}
                                </span>
                              ))}
                              {integration.trigger_events.split(',').length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{integration.trigger_events.split(',').length - 3} more
                                </span>
                              )}
                            </div>
                          ) : 'No events'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          integration.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {integration.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {integration.last_triggered_at 
                          ? new Date(integration.last_triggered_at).toLocaleString()
                          : 'Never'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => testIntegration(integration)}
                          disabled={testingIntegration === integration.id}
                          className="text-green-600 hover:text-green-900 mr-3 disabled:opacity-50"
                        >
                          {testingIntegration === integration.id ? 'Testing...' : 'Test'}
                        </button>
                        <button
                          onClick={() => editIntegration(integration)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(integration.id)}
                          className="text-red-600 hover:text-red-900"
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

        {/* Implementation Examples */}
        <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-emerald-300 mb-4">Integration Examples</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-emerald-300 mb-3">Slack Webhook Example:</h5>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-emerald-200/80">URL:</span>
                  <pre className="bg-slate-800 text-slate-200 p-2 rounded text-xs border border-slate-700">
https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
                  </pre>
                </div>
                <div>
                  <span className="text-xs text-emerald-200/80">Body:</span>
                  <pre className="bg-slate-800 text-slate-200 p-2 rounded text-xs border border-slate-700">
{`{"text": "🎉 New user {{user_email}} signed up!"}`}
                  </pre>
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="font-medium text-emerald-300 mb-3">Discord Webhook Example:</h5>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-emerald-200/80">URL:</span>
                  <pre className="bg-slate-800 text-slate-200 p-2 rounded text-xs border border-slate-700">
https://discord.com/api/webhooks/YOUR/WEBHOOK
                  </pre>
                </div>
                <div>
                  <span className="text-xs text-emerald-200/80">Body:</span>
                  <pre className="bg-slate-800 text-slate-200 p-2 rounded text-xs border border-slate-700">
{`{"content": "New signup: {{user_email}}"}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}