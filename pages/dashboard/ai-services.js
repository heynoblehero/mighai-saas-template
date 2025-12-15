import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SubscriberLayout from '../../components/SubscriberLayout';

const SERVICE_ICONS = {
  'openai': '🤖',
  'claude': '🧠',
  'google-ai': '🌟',
  'cohere': '💎',
  'hugging-face': '🤗'
};

const SERVICE_COLORS = {
  'openai': 'bg-green-900/30 text-green-300 border-green-600/30',
  'claude': 'bg-orange-900/30 text-orange-300 border-orange-600/30',
  'google-ai': 'bg-blue-900/30 text-blue-300 border-blue-600/30',
  'cohere': 'bg-purple-900/30 text-purple-300 border-purple-600/30',
  'hugging-face': 'bg-yellow-900/30 text-yellow-300 border-yellow-600/30'
};

export default function AIServices() {
  const [services, setServices] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState('');
  const [showConnectForm, setShowConnectForm] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [servicesResponse, connectionsResponse] = await Promise.all([
        fetch('/api/ai-services/available'),
        fetch('/api/ai-connections')
      ]);

      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json();
        setServices(servicesData || []);
      }

      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        setConnections(connectionsData || []);
      }
    } catch (error) {
      console.error('Failed to fetch AI services:', error);
      setMessage('Failed to load AI services');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (service) => {
    if (!apiKey.trim()) {
      setMessage('Please enter your API key');
      return;
    }

    setSaving(service.id);
    setMessage('');

    try {
      const response = await fetch('/api/ai-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_service_id: service.id,
          api_key: apiKey,
          connection_name: `${service.display_name} Connection`
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`Successfully connected to ${service.display_name}!`);
        setShowConnectForm(null);
        setApiKey('');
        fetchData(); // Refresh the data
      } else {
        setMessage('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to connect AI service:', error);
      setMessage('Failed to connect to service');
    } finally {
      setSaving(null);
    }
  };

  const handleDisconnect = async (connection) => {
    if (!confirm(`Are you sure you want to disconnect from ${connection.service_name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/ai-connections/${connection.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Successfully disconnected from ' + connection.service_name);
        fetchData(); // Refresh the data
      } else {
        setMessage('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to disconnect AI service:', error);
      setMessage('Failed to disconnect from service');
    }
  };

  const handleUpdateApiKey = async (connection) => {
    if (!apiKey.trim()) {
      setMessage('Please enter your new API key');
      return;
    }

    setSaving(connection.id);
    setMessage('');

    try {
      const response = await fetch(`/api/ai-connections/${connection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('API key updated successfully!');
        setShowConnectForm(null);
        setApiKey('');
        fetchData(); // Refresh the data
      } else {
        setMessage('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to update API key:', error);
      setMessage('Failed to update API key');
    } finally {
      setSaving(null);
    }
  };

  const getConnection = (serviceId) => {
    return connections.find(conn => conn.ai_service_id === serviceId);
  };

  const handleCancel = () => {
    setShowConnectForm(null);
    setApiKey('');
    setMessage('');
  };

  if (loading) {
    return (
      <SubscriberLayout title="AI Services">
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <div className="text-lg text-slate-300">Loading AI services...</div>
            </div>
          </div>
        </div>
      </SubscriberLayout>
    );
  }

  return (
    <SubscriberLayout title="AI Services">
      <div className="p-6 space-y-6 min-h-screen bg-slate-900">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">AI Services</h1>
          <p className="text-slate-400 mt-1">
            Connect your AI service API keys to enable powerful AI integrations
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-xl ${
            message.includes('Success') || message.includes('successfully')
              ? 'bg-emerald-900/20 border border-emerald-600/30 text-emerald-300'
              : 'bg-red-900/20 border border-red-600/30 text-red-300'
          }`}>
            {message}
          </div>
        )}

        {/* Connected Services */}
        {connections.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200">
                Connected Services ({connections.length})
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connections.map((connection) => {
                  const isUpdating = showConnectForm === `update-${connection.id}`;
                  const serviceColor = SERVICE_COLORS[connection.service_name] || 'bg-slate-700 text-slate-300 border-slate-600';
                  
                  return (
                    <div key={connection.id} className={`border rounded-lg p-4 ${serviceColor}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">
                            {SERVICE_ICONS[connection.service_name] || '🤖'}
                          </span>
                          <div>
                            <h4 className="font-medium">{connection.display_name}</h4>
                            <p className="text-sm opacity-80">{connection.description}</p>
                          </div>
                        </div>
                      </div>

                      <div className="text-sm opacity-80 mb-4">
                        <p>Connected: {new Date(connection.connected_at).toLocaleDateString()}</p>
                        {connection.last_used_at && (
                          <p>Last used: {new Date(connection.last_used_at).toLocaleDateString()}</p>
                        )}
                      </div>

                      {isUpdating ? (
                        <div className="space-y-3">
                          <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter new API key"
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleUpdateApiKey(connection)}
                              disabled={saving === connection.id}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                            >
                              {saving === connection.id ? 'Updating...' : 'Update'}
                            </button>
                            <button
                              onClick={handleCancel}
                              className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setShowConnectForm(`update-${connection.id}`)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                          >
                            Update Key
                          </button>
                          <button
                            onClick={() => handleDisconnect(connection)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                          >
                            Disconnect
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Available Services */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200">
              Available Services ({services.filter(s => !getConnection(s.id)).length} remaining)
            </h3>
          </div>

          {services.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-slate-400 text-lg mb-4">No AI services available</div>
              <p className="text-slate-500">Contact your administrator to set up AI service integrations</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.filter(service => !getConnection(service.id)).map((service) => {
                  const isConnecting = showConnectForm === service.id;
                  const serviceColor = SERVICE_COLORS[service.name] || 'bg-slate-700 text-slate-300 border-slate-600';
                  
                  return (
                    <div key={service.id} className={`border rounded-lg p-4 ${serviceColor} hover:opacity-80 transition-opacity`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">
                            {SERVICE_ICONS[service.name] || '🤖'}
                          </span>
                          <div>
                            <h4 className="font-medium">{service.display_name}</h4>
                            <p className="text-sm opacity-80">{service.description}</p>
                          </div>
                        </div>
                      </div>

                      {service.api_endpoint && (
                        <div className="text-sm opacity-60 mb-4">
                          <p>Endpoint: {service.api_endpoint}</p>
                        </div>
                      )}

                      {isConnecting ? (
                        <div className="space-y-3">
                          <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your API key"
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleConnect(service)}
                              disabled={saving === service.id}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                            >
                              {saving === service.id ? 'Connecting...' : 'Connect'}
                            </button>
                            <button
                              onClick={handleCancel}
                              className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowConnectForm(service.id)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Connect Service</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-blue-300 mb-4">What are AI Services?</h4>
            <div className="space-y-3 text-sm text-blue-200/80">
              <p><strong>API Access:</strong> Connect to powerful AI models using your API keys</p>
              <p><strong>Direct Integration:</strong> Use AI services directly in your workflows</p>
              <p><strong>Secure Storage:</strong> Your API keys are encrypted and stored securely</p>
              <p><strong>Usage Control:</strong> You control which services you connect to</p>
            </div>
          </div>

          <div className="bg-amber-900/20 border border-amber-600/30 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-amber-300 mb-4">Security & Privacy</h4>
            <div className="space-y-3 text-sm text-amber-200/80">
              <p><strong>Encrypted Storage:</strong> API keys are encrypted with AES-256</p>
              <p><strong>No Sharing:</strong> Your keys are never shared with other users</p>
              <p><strong>Revokable:</strong> Disconnect anytime to remove access</p>
              <p><strong>Audit Trail:</strong> All API usage is logged for your security</p>
            </div>
          </div>
        </div>
      </div>
    </SubscriberLayout>
  );
}