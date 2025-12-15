import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SubscriberLayout from '../../components/SubscriberLayout';

const CATEGORY_COLORS = {
  social: 'bg-blue-900/30 text-blue-300',
  productivity: 'bg-green-900/30 text-green-300',
  development: 'bg-purple-900/30 text-purple-300',
  ecommerce: 'bg-orange-900/30 text-orange-300',
  marketing: 'bg-pink-900/30 text-pink-300',
  cloud: 'bg-cyan-900/30 text-cyan-300',
  communication: 'bg-indigo-900/30 text-indigo-300',
  other: 'bg-slate-700 text-slate-300'
};

export default function OAuthConnections() {
  const [services, setServices] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchData();
    
    // Handle OAuth callback messages
    const { success, error } = router.query;
    if (success === 'connected') {
      setMessage('Successfully connected to the service!');
      // Clear the URL parameters
      router.replace('/dashboard/connections', undefined, { shallow: true });
    } else if (error) {
      const errorMessages = {
        'missing_parameters': 'OAuth callback failed: missing parameters',
        'invalid_state': 'OAuth callback failed: security validation failed',
        'service_mismatch': 'OAuth callback failed: service mismatch',
        'service_not_found': 'OAuth callback failed: service not found',
        'storage_failed': 'OAuth callback failed: could not save connection',
        'connection_failed': 'OAuth callback failed: connection error'
      };
      setMessage('Error: ' + (errorMessages[error] || 'OAuth connection failed'));
      router.replace('/dashboard/connections', undefined, { shallow: true });
    }
  }, [router.query]);

  const fetchData = async () => {
    try {
      const [servicesResponse, connectionsResponse] = await Promise.all([
        fetch('/api/oauth-services/available'),
        fetch('/api/oauth-connections')
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
      console.error('Failed to fetch OAuth data:', error);
      setMessage('Failed to load OAuth services');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (service) => {
    setConnecting(service.id);
    setMessage('');

    try {
      const response = await fetch(`/api/oauth/auth/${service.id}`);
      const data = await response.json();

      if (response.ok && data.authorization_url) {
        // Redirect to OAuth provider
        window.location.href = data.authorization_url;
      } else {
        setMessage('Failed to initiate OAuth connection: ' + (data.error || 'Unknown error'));
        setConnecting(null);
      }
    } catch (error) {
      console.error('Failed to start OAuth flow:', error);
      setMessage('Failed to start OAuth connection');
      setConnecting(null);
    }
  };

  const handleDisconnect = async (connection) => {
    if (!confirm(`Are you sure you want to disconnect from ${connection.display_name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/oauth-connections/${connection.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Successfully disconnected from ' + connection.display_name);
        fetchData(); // Refresh the data
      } else {
        setMessage('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to disconnect OAuth service:', error);
      setMessage('Failed to disconnect from service');
    }
  };

  const handleRefreshToken = async (connection) => {
    try {
      const response = await fetch(`/api/oauth/refresh/${connection.id}`, {
        method: 'POST'
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Token refreshed successfully for ' + connection.display_name);
        fetchData(); // Refresh the data
      } else {
        setMessage('Error refreshing token: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      setMessage('Failed to refresh token');
    }
  };

  const getConnectionStatus = (service) => {
    return connections.find(conn => conn.oauth_service_id === service.id);
  };

  const groupServicesByCategory = (services) => {
    const grouped = {};
    services.forEach(service => {
      const category = service.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(service);
    });
    return grouped;
  };

  const isTokenExpired = (connection) => {
    if (!connection.token_expires_at) return false;
    return new Date(connection.token_expires_at) <= new Date();
  };

  if (loading) {
    return (
      <SubscriberLayout title="Account Connections">
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <div className="text-lg text-slate-300">Loading connections...</div>
            </div>
          </div>
        </div>
      </SubscriberLayout>
    );
  }

  const groupedServices = groupServicesByCategory(services);

  return (
    <SubscriberLayout title="Account Connections">
      <div className="p-6 space-y-6 min-h-screen bg-slate-900">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Account Connections</h1>
          <p className="text-slate-400 mt-1">
            Connect your accounts to enable powerful integrations and automations
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

        {/* Connected Accounts */}
        {connections.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200">
                Connected Accounts ({connections.length})
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connections.map((connection) => {
                  const expired = isTokenExpired(connection);
                  const profileInfo = connection.profile_info ? JSON.parse(connection.profile_info) : null;
                  
                  return (
                    <div key={connection.id} className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {connection.icon_url && (
                            <img 
                              src={connection.icon_url} 
                              alt={connection.display_name} 
                              className="w-8 h-8 rounded"
                            />
                          )}
                          <div>
                            <h4 className="font-medium text-slate-200">{connection.display_name}</h4>
                            <p className="text-sm text-slate-400">{connection.description}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          CATEGORY_COLORS[connection.category] || CATEGORY_COLORS.other
                        }`}>
                          {connection.category}
                        </span>
                      </div>

                      {profileInfo && (
                        <div className="mb-3 p-3 bg-slate-600/50 rounded">
                          <p className="text-sm text-slate-300">
                            Connected as: <span className="font-medium">{profileInfo.email || profileInfo.name || 'Unknown'}</span>
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <div className="text-slate-400">
                          <p>Connected: {new Date(connection.connected_at).toLocaleDateString()}</p>
                          {connection.last_used_at && (
                            <p>Last used: {new Date(connection.last_used_at).toLocaleDateString()}</p>
                          )}
                        </div>
                        
                        {expired && (
                          <span className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded">
                            Token Expired
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex space-x-2">
                        {expired && (
                          <button
                            onClick={() => handleRefreshToken(connection)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                          >
                            Refresh Token
                          </button>
                        )}
                        <button
                          onClick={() => handleDisconnect(connection)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
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
              Available Services ({services.filter(s => !s.is_connected).length} remaining)
            </h3>
          </div>

          {services.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-slate-400 text-lg mb-4">No OAuth services available</div>
              <p className="text-slate-500">Contact your administrator to set up OAuth integrations</p>
            </div>
          ) : (
            <div className="p-6">
              {Object.entries(groupedServices).map(([category, categoryServices]) => {
                const availableServices = categoryServices.filter(s => !s.is_connected);
                if (availableServices.length === 0) return null;

                return (
                  <div key={category} className="mb-8 last:mb-0">
                    <h4 className="text-lg font-medium text-slate-300 mb-4 capitalize flex items-center">
                      <span className={`inline-block w-3 h-3 rounded-full mr-3 ${
                        CATEGORY_COLORS[category]?.replace('text-', 'bg-').replace('/30', '/50') || 'bg-slate-500'
                      }`}></span>
                      {category === 'other' ? 'Other Services' : category}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availableServices.map((service) => {
                        const isConnecting = connecting === service.id;
                        
                        return (
                          <div key={service.id} className="bg-slate-700 border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                {service.icon_url && (
                                  <img 
                                    src={service.icon_url} 
                                    alt={service.display_name} 
                                    className="w-8 h-8 rounded"
                                  />
                                )}
                                <div>
                                  <h4 className="font-medium text-slate-200">{service.display_name}</h4>
                                  <p className="text-sm text-slate-400">{service.description}</p>
                                </div>
                              </div>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                CATEGORY_COLORS[service.category] || CATEGORY_COLORS.other
                              }`}>
                                {service.category}
                              </span>
                            </div>

                            <button
                              onClick={() => handleConnect(service)}
                              disabled={isConnecting}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                            >
                              {isConnecting ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Connecting...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  <span>Connect Account</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-blue-300 mb-4">Why Connect Accounts?</h4>
            <div className="space-y-3 text-sm text-blue-200/80">
              <p><strong>Automation:</strong> Enable seamless workflows between your accounts</p>
              <p><strong>Data Access:</strong> Allow services to read and write data on your behalf</p>
              <p><strong>Time Saving:</strong> Automate repetitive tasks across platforms</p>
              <p><strong>Integration:</strong> Connect all your tools in one unified dashboard</p>
            </div>
          </div>

          <div className="bg-green-900/20 border border-green-600/30 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-green-300 mb-4">Security & Privacy</h4>
            <div className="space-y-3 text-sm text-green-200/80">
              <p><strong>Secure OAuth:</strong> Industry-standard authentication protocol</p>
              <p><strong>Limited Access:</strong> Only request permissions you explicitly grant</p>
              <p><strong>Revokable:</strong> Disconnect anytime to revoke access</p>
              <p><strong>Encrypted:</strong> All tokens are stored securely and encrypted</p>
            </div>
          </div>
        </div>
      </div>
    </SubscriberLayout>
  );
}