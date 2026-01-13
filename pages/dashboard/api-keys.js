import { useState, useEffect } from 'react';
import CustomerLayout from '../../components/CustomerLayout';
import fs from 'fs';
import path from 'path';
import { injectPageFunctionality } from '../../utils/reserved-page-injector';

export async function getServerSideProps() {
  // Check if there's a customized version of the API keys page
  try {
    const reservedPagePath = path.join(process.cwd(), 'data', 'reserved-pages', 'customer-api-keys.json');

    if (fs.existsSync(reservedPagePath)) {
      const data = fs.readFileSync(reservedPagePath, 'utf8');
      const reservedPage = JSON.parse(data);

      if (reservedPage.html_code) {
        const enhancedHtml = injectPageFunctionality(reservedPage.html_code, 'customer-api-keys');

        return {
          props: {
            useCustomContent: true,
            customContentHtml: enhancedHtml
          }
        };
      }
    }
  } catch (error) {
    console.error('Error checking for customized API keys page:', error);
  }

  return {
    props: {
      useCustomContent: false
    }
  };
}

export default function APIKeysPage({ useCustomContent, customContentHtml }) {
  const [user, setUser] = useState(null);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/subscribe/api-keys');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setKeys(data.keys);
      } else if (response.status === 401) {
        window.location.href = '/subscribe/login';
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to load API keys');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const generateKey = async () => {
    setGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/subscribe/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || 'My API Key' })
      });

      const data = await response.json();

      if (response.ok) {
        setNewKey(data.key);
        setShowNewKeyModal(true);
        setNewKeyName('');
        fetchApiKeys();
      } else {
        setError(data.error || data.message || 'Failed to generate API key');
      }
    } catch (err) {
      setError('Failed to generate API key');
    } finally {
      setGenerating(false);
    }
  };

  const revokeKey = async (keyId, permanent = false) => {
    const confirmMsg = permanent
      ? 'Are you sure you want to permanently delete this API key?'
      : 'Are you sure you want to revoke this API key?';

    if (!confirm(confirmMsg)) return;

    try {
      const response = await fetch('/api/subscribe/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_id: keyId, permanent })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        fetchApiKeys();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to revoke API key');
      }
    } catch (err) {
      setError('Failed to revoke API key');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // If using customized content from reserved page
  if (useCustomContent && customContentHtml) {
    return (
      <CustomerLayout title="API Keys">
        <div dangerouslySetInnerHTML={{ __html: customContentHtml }} />
      </CustomerLayout>
    );
  }

  // Default React component
  return (
    <CustomerLayout title="API Keys">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100">API Keys</h1>
          <p className="text-slate-400 mt-1">
            Manage your API keys for programmatic access to backend routes
          </p>
        </div>

        {/* Usage Stats */}
        {user && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">API Usage</p>
                <p className="text-2xl font-bold text-slate-100">
                  {user.api_calls_used} / {user.api_limit || 'Unlimited'}
                </p>
                <p className="text-slate-500 text-xs mt-1">Plan: {user.plan_name}</p>
              </div>
              {user.api_limit > 0 && (
                <div className="w-32">
                  <div className="bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((user.api_calls_used / user.api_limit) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 text-right">
                    {Math.round((user.api_calls_used / user.api_limit) * 100)}% used
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="bg-red-900/20 border border-red-600/30 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/20 border border-green-600/30 text-green-400 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Generate New Key */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Generate New API Key</h3>
          <div className="flex gap-4">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (optional)"
              className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={generateKey}
              disabled={generating}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Key'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            You can have up to 3 active API keys. The key will only be shown once after generation.
          </p>
        </div>

        {/* API Keys List */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200">Your API Keys ({keys.length})</h3>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
            </div>
          ) : keys.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              You haven't generated any API keys yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {keys.map((key) => (
                <div key={key.id} className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-slate-200 font-medium">{key.name}</p>
                    <p className="text-slate-400 font-mono text-sm">{key.key_prefix}</p>
                    <p className="text-slate-500 text-xs mt-1">
                      Created: {formatDate(key.created_at)} | Last used: {formatDate(key.last_used_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      key.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {key.is_active ? 'Active' : 'Revoked'}
                    </span>
                    {key.is_active && (
                      <button
                        onClick={() => revokeKey(key.id, false)}
                        className="px-3 py-1.5 text-sm bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                    <button
                      onClick={() => revokeKey(key.id, true)}
                      className="px-3 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usage Instructions */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">How to Use</h3>
          <p className="text-slate-400 text-sm mb-4">
            Use your API key to call backend routes that have API key access enabled.
          </p>
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-300 overflow-x-auto">
            <p className="text-slate-500 mb-2"># Using Authorization header</p>
            <p className="text-emerald-400">curl -X POST https://yoursite.com/api/custom/route-name \</p>
            <p className="text-emerald-400 pl-4">-H "Authorization: Bearer YOUR_API_KEY" \</p>
            <p className="text-emerald-400 pl-4">-H "Content-Type: application/json" \</p>
            <p className="text-emerald-400 pl-4">-d '{"{\"data\": \"value\"}"}'</p>
          </div>
        </div>
      </div>

      {/* New Key Modal */}
      {showNewKeyModal && newKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-100">API Key Generated!</h3>
            </div>

            <p className="text-slate-400 text-sm mb-4">
              Copy this key now. It will not be shown again for security reasons.
            </p>

            <div className="bg-slate-900 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-emerald-400 font-mono text-sm break-all">{newKey}</code>
                <button
                  onClick={() => copyToClipboard(newKey)}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setShowNewKeyModal(false);
                setNewKey(null);
              }}
              className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              I've copied the key
            </button>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
