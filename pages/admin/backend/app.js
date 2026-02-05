import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import AdminLayout from '../../../components/AdminLayout';

// Dynamic import for terminal to avoid SSR issues
const TerminalEmulator = dynamic(
  () => import('@/components/TerminalEmulator').then(mod => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-slate-900 text-slate-400">
        Loading terminal...
      </div>
    )
  }
);

export default function BackendApp() {
  const [config, setConfig] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('terminal');
  const [activeSessionId, setActiveSessionId] = useState('default');

  // Environment variables state
  const [envVars, setEnvVars] = useState({});
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  // Gateway config state
  const [gatewayPath, setGatewayPath] = useState('/api/v1');
  const [gatewayPort, setGatewayPort] = useState(5000);
  const [gatewayAccess, setGatewayAccess] = useState('public');
  const [gatewayDirty, setGatewayDirty] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/backend/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setEnvVars(data.env_vars || {});
        setGatewayPath(data.gateway_path || '/api/v1');
        setGatewayPort(data.gateway_port || 5000);
        setGatewayAccess(data.gateway_access || 'public');
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/backend/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchConfig(), fetchSessions()]).finally(() => setLoading(false));
  }, [fetchConfig, fetchSessions]);

  // Refresh sessions periodically
  useEffect(() => {
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const handleCreateSession = async () => {
    const newId = `session-${Date.now()}`;
    try {
      const response = await fetch('/api/admin/backend/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newId })
      });
      if (response.ok) {
        setActiveSessionId(newId);
        fetchSessions();
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleCloseSession = async (sessionId) => {
    if (!confirm('Close this terminal session?')) return;
    try {
      await fetch(`/api/admin/backend/sessions?id=${sessionId}`, { method: 'DELETE' });
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter(s => s.id !== sessionId);
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : 'default');
      }
      fetchSessions();
    } catch (error) {
      console.error('Failed to close session:', error);
    }
  };

  const handleSaveGateway = async () => {
    try {
      const response = await fetch('/api/admin/backend/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway_path: gatewayPath,
          gateway_port: gatewayPort,
          gateway_access: gatewayAccess
        })
      });
      if (response.ok) {
        setGatewayDirty(false);
        alert('Gateway configuration saved!');
        fetchConfig();
      } else {
        const data = await response.json();
        alert('Failed to save: ' + (data.message || data.error));
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleAddEnvVar = () => {
    if (!newEnvKey.trim()) return;
    setEnvVars({ ...envVars, [newEnvKey]: newEnvValue });
    setNewEnvKey('');
    setNewEnvValue('');
  };

  const handleRemoveEnvVar = (key) => {
    const updated = { ...envVars };
    delete updated[key];
    setEnvVars(updated);
  };

  const handleSaveEnvVars = async () => {
    try {
      const response = await fetch('/api/admin/backend/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env_vars: envVars })
      });
      if (response.ok) {
        alert('Environment variables saved!');
        fetchConfig();
      } else {
        const data = await response.json();
        alert('Failed to save: ' + (data.message || data.error));
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm('Regenerate internal API token? Your backend will need to be restarted.')) return;
    try {
      const response = await fetch('/api/admin/backend/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate_token: true })
      });
      if (response.ok) {
        alert('Token regenerated! Restart your backend to use the new token.');
        fetchConfig();
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Backend">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Backend">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Backend Shell</h1>
          <p className="text-slate-400 mt-1">
            Full shell access to run your backend. Install packages, start services, expose ports.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-700">
          <nav className="flex gap-4">
            {['terminal', 'gateway', 'environment', 'docs'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-emerald-500 text-emerald-500'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'docs' ? 'Internal API' : tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800 rounded-lg p-6">
          {activeTab === 'terminal' && (
            <div className="space-y-4">
              {/* Session Tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleCreateSession}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded text-white text-sm font-medium"
                >
                  + New Session
                </button>

                {/* Default session */}
                <button
                  onClick={() => setActiveSessionId('default')}
                  className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 ${
                    activeSessionId === 'default'
                      ? 'bg-slate-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Main
                </button>

                {/* Dynamic sessions */}
                {sessions.filter(s => s.id !== 'default').map(session => (
                  <div key={session.id} className="flex items-center">
                    <button
                      onClick={() => setActiveSessionId(session.id)}
                      className={`px-3 py-1.5 rounded-l text-sm font-medium ${
                        activeSessionId === session.id
                          ? 'bg-slate-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {session.id.replace('session-', 'Session ')}
                    </button>
                    <button
                      onClick={() => handleCloseSession(session.id)}
                      className="px-2 py-1.5 bg-slate-700 hover:bg-red-600 rounded-r text-slate-400 hover:text-white text-sm"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>

              {/* Terminal */}
              <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden" style={{ height: '500px' }}>
                <TerminalEmulator key={activeSessionId} sessionId={activeSessionId} />
              </div>

              <p className="text-slate-500 text-sm">
                Your files are stored in <code className="text-emerald-400">~/</code> (user-home directory).
                Start a server on any port and configure the gateway to expose it.
              </p>
            </div>
          )}

          {activeTab === 'gateway' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Gateway Configuration</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Route external requests to your backend service running on localhost.
                </p>
              </div>

              <div className="grid gap-6 max-w-xl">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1">Path Prefix</label>
                  <input
                    type="text"
                    value={gatewayPath}
                    onChange={(e) => { setGatewayPath(e.target.value); setGatewayDirty(true); }}
                    placeholder="/api/v1"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                  <p className="text-slate-500 text-xs mt-1">
                    Requests to this path will be forwarded to your backend
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1">Target Port</label>
                  <input
                    type="number"
                    value={gatewayPort}
                    onChange={(e) => { setGatewayPort(parseInt(e.target.value) || 5000); setGatewayDirty(true); }}
                    placeholder="5000"
                    className="w-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                  <p className="text-slate-500 text-xs mt-1">
                    The localhost port your backend listens on
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Access Control</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="access"
                        checked={gatewayAccess === 'public'}
                        onChange={() => { setGatewayAccess('public'); setGatewayDirty(true); }}
                        className="text-emerald-500"
                      />
                      <span className="text-slate-300">Public</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="access"
                        checked={gatewayAccess === 'subscribers'}
                        onChange={() => { setGatewayAccess('subscribers'); setGatewayDirty(true); }}
                        className="text-emerald-500"
                      />
                      <span className="text-slate-300">Subscribers Only</span>
                    </label>
                  </div>
                  <p className="text-slate-500 text-xs mt-1">
                    {gatewayAccess === 'public'
                      ? 'Anyone can access this endpoint'
                      : 'Requires valid auth (session, JWT, or API key)'}
                  </p>
                </div>

                <button
                  onClick={handleSaveGateway}
                  disabled={!gatewayDirty}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-white font-medium w-fit"
                >
                  Save Gateway Config
                </button>
              </div>

              {/* Status */}
              <div className="mt-8 p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-slate-300 font-medium">Gateway Active</span>
                </div>
                <p className="text-slate-400 text-sm">
                  Requests to <code className="text-emerald-400">{gatewayPath}/*</code> will be forwarded to{' '}
                  <code className="text-blue-400">localhost:{gatewayPort}</code>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'environment' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Environment Variables</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Available in your terminal session as shell environment variables.
                </p>
              </div>

              {/* Internal API Token */}
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <label className="text-slate-300 text-sm font-medium">Internal API Token</label>
                    <p className="text-slate-500 text-xs mt-1">
                      Available as <code className="text-emerald-400">$INTERNAL_API_TOKEN</code> in your terminal
                    </p>
                  </div>
                  <button
                    onClick={handleRegenerateToken}
                    className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm"
                  >
                    Regenerate
                  </button>
                </div>
                {config?.internal_api_token && (
                  <div className="flex items-center gap-2 mt-3">
                    <code className="flex-1 font-mono text-emerald-400 text-sm break-all bg-slate-800 px-3 py-2 rounded">
                      {config.internal_api_token}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(config.internal_api_token)}
                      className="px-3 py-2 bg-slate-600 rounded text-white text-sm hover:bg-slate-500"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>

              {/* Custom Env Vars */}
              <div className="space-y-3">
                <label className="text-slate-300 text-sm font-medium">Custom Variables</label>

                {Object.entries(envVars).map(([key, value]) => (
                  <div key={key} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={key}
                      disabled
                      className="w-1/3 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white font-mono text-sm"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setEnvVars({ ...envVars, [key]: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    />
                    <button
                      onClick={() => handleRemoveEnvVar(key)}
                      className="px-3 py-2 text-red-400 hover:text-red-300"
                    >
                      x
                    </button>
                  </div>
                ))}

                <div className="flex gap-2 items-center pt-2">
                  <input
                    type="text"
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                    placeholder="KEY"
                    className="w-1/3 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white font-mono"
                  />
                  <input
                    type="text"
                    value={newEnvValue}
                    onChange={(e) => setNewEnvValue(e.target.value)}
                    placeholder="value"
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                  <button
                    onClick={handleAddEnvVar}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded text-white"
                  >
                    Add
                  </button>
                </div>
              </div>

              <button
                onClick={handleSaveEnvVars}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-white font-medium"
              >
                Save Environment Variables
              </button>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Internal API Reference</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Your backend can call these endpoints from localhost. Authenticate using the
                  <code className="mx-1 px-2 py-1 bg-slate-700 rounded text-emerald-400">INTERNAL_API_TOKEN</code>
                  environment variable.
                </p>
              </div>

              <div className="bg-slate-700 p-4 rounded-lg">
                <p className="text-slate-300 text-sm font-medium mb-2">Example Request</p>
                <pre className="bg-slate-800 p-3 rounded text-sm text-emerald-400 overflow-x-auto">
{`curl -H "Authorization: Bearer $INTERNAL_API_TOKEN" \\
     http://localhost:${typeof window !== 'undefined' ? window.location.port || 5000 : 5000}/api/internal/users`}
                </pre>
              </div>

              <div className="space-y-4">
                <h4 className="text-white font-medium">Read Endpoints</h4>

                {[
                  { method: 'GET', path: '/api/internal/users', desc: 'List all users (paginated)', params: 'limit, offset, role, plan_id' },
                  { method: 'GET', path: '/api/internal/users/:id', desc: 'Get user by ID' },
                  { method: 'GET', path: '/api/internal/subscribers', desc: 'List subscribers with plan info', params: 'limit, offset, plan_id, subscription_status' },
                  { method: 'GET', path: '/api/internal/plans', desc: 'List all subscription plans' },
                  { method: 'GET', path: '/api/internal/analytics/summary', desc: 'Get analytics summary (subscribers, signups, usage)' },
                ].map((api, i) => (
                  <div key={i} className="bg-slate-700 p-4 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-green-600 text-white">
                        {api.method}
                      </span>
                      <code className="text-emerald-400">{api.path}</code>
                    </div>
                    <p className="text-slate-300 text-sm">{api.desc}</p>
                    {api.params && (
                      <p className="text-slate-500 text-xs mt-1">Query params: {api.params}</p>
                    )}
                  </div>
                ))}

                <h4 className="text-white font-medium pt-4">Write Endpoints</h4>

                {[
                  { method: 'PATCH', path: '/api/internal/users/:id', desc: 'Update user (subscription_status, plan_id)', body: '{ subscription_status, plan_id }' },
                  { method: 'POST', path: '/api/internal/email/send', desc: 'Send an email', body: '{ to, subject, html }' },
                ].map((api, i) => (
                  <div key={i} className="bg-slate-700 p-4 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${api.method === 'POST' ? 'bg-blue-600' : 'bg-yellow-600'} text-white`}>
                        {api.method}
                      </span>
                      <code className="text-emerald-400">{api.path}</code>
                    </div>
                    <p className="text-slate-300 text-sm">{api.desc}</p>
                    {api.body && (
                      <p className="text-slate-500 text-xs mt-1">Body: {api.body}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
