import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function EndpointDashboard() {
  const [endpoints, setEndpoints] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [showEndpointModal, setShowEndpointModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEndpoints();
  }, [filterStatus, searchTerm]);

  const fetchEndpoints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/ai-builder/endpoint-registry?${params}`);
      const data = await response.json();

      if (data.success) {
        setEndpoints(data.endpoints || []);
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error('Failed to fetch endpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const testEndpoint = async (endpoint) => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/ai-builder/deploy-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          path: endpoint.path,
          testData: { message: 'Dashboard test', timestamp: new Date().toISOString() }
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Endpoint test successful!');
      } else {
        alert(`❌ Test failed: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Test error: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const deleteEndpoint = async (endpoint) => {
    if (!confirm(`Are you sure you want to delete "${endpoint.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch('/api/ai-builder/deploy-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          path: endpoint.path
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Endpoint deleted successfully');
        fetchEndpoints(); // Refresh the list
      } else {
        alert(`❌ Delete failed: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Delete error: ${error.message}`);
    }
  };

  const updateEndpointStatus = async (endpointId, newStatus) => {
    try {
      const response = await fetch(`/api/ai-builder/endpoint-registry?id=${endpointId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        fetchEndpoints(); // Refresh the list
      } else {
        alert(`❌ Status update failed: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Update error: ${error.message}`);
    }
  };

  const openEndpointDetails = async (endpoint) => {
    try {
      const response = await fetch(`/api/ai-builder/endpoint-registry?id=${endpoint.id}`);
      const data = await response.json();

      if (data.success) {
        setSelectedEndpoint(data.endpoint);
        setShowEndpointModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch endpoint details:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-600';
      case 'inactive': return 'bg-slate-600';
      case 'error': return 'bg-red-600';
      default: return 'bg-slate-600';
    }
  };

  const filteredEndpoints = endpoints.filter(endpoint => {
    const matchesSearch = !searchTerm ||
      endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.path.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || endpoint.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout title="Endpoint Dashboard">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">API Endpoint Dashboard</h1>
            <p className="text-slate-400">Manage your AI-generated endpoints</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setRefreshing(true) || fetchEndpoints()}
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
            <button
              onClick={() => window.location.href = '/admin/integrations'}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              + Manage Integrations
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="text-3xl font-bold text-slate-100">{stats.total_endpoints || 0}</div>
            <div className="text-slate-400 text-sm">Total Endpoints</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="text-3xl font-bold text-emerald-400">{stats.active_endpoints || 0}</div>
            <div className="text-slate-400 text-sm">Active</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="text-3xl font-bold text-blue-400">{stats.total_calls || 0}</div>
            <div className="text-slate-400 text-sm">Total API Calls</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="text-3xl font-bold text-yellow-400">{stats.total_usage || 0}</div>
            <div className="text-slate-400 text-sm">Total Usage</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>
        </div>

        {/* Endpoints List */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-slate-200">Your Endpoints</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <div className="text-slate-400">Loading endpoints...</div>
            </div>
          ) : filteredEndpoints.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">No endpoints found</h3>
              <p className="text-slate-400 mb-6">
                {searchTerm || filterStatus !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create your first AI-powered endpoint to get started'}
              </p>
              <button
                onClick={() => window.location.href = '/admin/integrations'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Manage Integrations
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {filteredEndpoints.map((endpoint) => (
                <div key={endpoint.id} className="p-6 hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-200">{endpoint.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getStatusColor(endpoint.status)}`}>
                          {endpoint.status}
                        </span>
                        <div className="flex space-x-1">
                          {endpoint.methods.map((method) => (
                            <span key={method} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                              {method}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="text-slate-400 text-sm mb-2">{endpoint.description || 'No description'}</p>

                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <span>📍 {endpoint.path}</span>
                        <span>📊 {endpoint.total_calls || 0} calls</span>
                        <span>⚡ {endpoint.avg_response_time || 0}ms avg</span>
                        <span>📅 v{endpoint.version}</span>
                        <span>🕒 {new Date(endpoint.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEndpointDetails(endpoint)}
                        className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => testEndpoint(endpoint)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => updateEndpointStatus(endpoint.id, endpoint.status === 'active' ? 'inactive' : 'active')}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          endpoint.status === 'active'
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {endpoint.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => deleteEndpoint(endpoint)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Endpoint Details Modal */}
        {showEndpointModal && selectedEndpoint && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-slate-200">{selectedEndpoint.name}</h2>
                <button
                  onClick={() => setShowEndpointModal(false)}
                  className="text-slate-400 hover:text-slate-200 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-slate-200 mb-3">Endpoint Information</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Path:</strong> <code className="bg-slate-700 px-2 py-1 rounded">{selectedEndpoint.path}</code></p>
                      <p><strong>Methods:</strong> {selectedEndpoint.methods.join(', ')}</p>
                      <p><strong>Status:</strong> <span className={`px-2 py-1 rounded text-white ${getStatusColor(selectedEndpoint.status)}`}>{selectedEndpoint.status}</span></p>
                      <p><strong>Version:</strong> v{selectedEndpoint.version}</p>
                      <p><strong>Created:</strong> {new Date(selectedEndpoint.created_at).toLocaleString()}</p>
                      <p><strong>Updated:</strong> {new Date(selectedEndpoint.updated_at).toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-slate-200 mb-3">Usage Statistics</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Total Calls:</strong> {selectedEndpoint.total_calls || 0}</p>
                      <p><strong>Average Response Time:</strong> {selectedEndpoint.avg_response_time || 0}ms</p>
                      <p><strong>Last Called:</strong> {selectedEndpoint.last_call_at ? new Date(selectedEndpoint.last_call_at).toLocaleString() : 'Never'}</p>
                    </div>
                  </div>
                </div>

                {/* Code */}
                <div>
                  <h3 className="text-lg font-medium text-slate-200 mb-3">Generated Code</h3>
                  <div className="bg-slate-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <pre className="text-sm text-slate-300 whitespace-pre-wrap">
                      <code>{selectedEndpoint.code}</code>
                    </pre>
                  </div>
                </div>

                {/* Recent Logs */}
                {selectedEndpoint.recent_logs && selectedEndpoint.recent_logs.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-slate-200 mb-3">Recent API Calls</h3>
                    <div className="space-y-2">
                      {selectedEndpoint.recent_logs.map((log, index) => (
                        <div key={index} className="bg-slate-700/50 rounded-lg p-3 text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium">{log.method}</span>
                              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                log.status_code >= 200 && log.status_code < 300 ? 'bg-emerald-600' : 'bg-red-600'
                              } text-white`}>
                                {log.status_code}
                              </span>
                              {log.response_time && (
                                <span className="ml-2 text-slate-400">{log.response_time}ms</span>
                              )}
                            </div>
                            <span className="text-slate-400 text-xs">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          {log.error_message && (
                            <div className="mt-2 text-red-400 text-xs">{log.error_message}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}