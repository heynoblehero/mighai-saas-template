import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/AdminLayout';

export default function SubscriberApiKeys() {
  const router = useRouter();
  const { id } = router.query;

  const [subscriber, setSubscriber] = useState(null);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchApiKeys();
    }
  }, [id]);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch(`/api/admin/subscribers/${id}/api-keys`, {
        credentials: 'include'
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setSubscriber(data.subscriber);
        setKeys(data.keys);
      } else {
        setError(data.error || 'Failed to fetch API keys');
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
      const response = await fetch(`/api/admin/subscribers/${id}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newKeyName || 'API Key' })
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
      ? 'Are you sure you want to permanently delete this API key? This cannot be undone.'
      : 'Are you sure you want to revoke this API key? The key will become inactive.';

    if (!confirm(confirmMsg)) return;

    try {
      const response = await fetch(`/api/admin/subscribers/${id}/api-keys`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

  if (loading) {
    return (
      <AdminLayout title="Subscriber API Keys">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`API Keys - ${subscriber?.email || 'Subscriber'}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/admin/subscribers')}
              className="text-slate-400 hover:text-slate-200 text-sm mb-2 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Subscribers
            </button>
            <h1 className="text-3xl font-bold text-slate-100">API Keys Management</h1>
            <p className="text-slate-400 mt-1">Manage API keys for subscriber access to custom routes</p>
          </div>
        </div>

        {/* Subscriber Info Card */}
        {subscriber && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center">
                <span className="text-2xl text-emerald-400">
                  {(subscriber.name || subscriber.email)[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-100">{subscriber.name || subscriber.email}</h2>
                <p className="text-slate-400">{subscriber.email}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-slate-300">
                    <span className="text-slate-500">Plan:</span> {subscriber.plan_name}
                  </span>
                  <span className="text-slate-300">
                    <span className="text-slate-500">API Calls:</span> {subscriber.api_calls_used} / {subscriber.api_limit || 'Unlimited'}
                  </span>
                </div>
              </div>
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
            The generated key will only be shown once. Make sure to copy it immediately.
          </p>
        </div>

        {/* API Keys Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200">Existing API Keys ({keys.length})</h3>
          </div>

          {keys.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No API keys have been generated for this subscriber yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Key Prefix</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Last Used</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {keys.map((key) => (
                    <tr key={key.id} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4 text-slate-200 font-medium">{key.name}</td>
                      <td className="px-6 py-4 text-slate-300 font-mono text-sm">{key.key_prefix}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          key.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {key.is_active ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">{formatDate(key.created_at)}</td>
                      <td className="px-6 py-4 text-slate-400 text-sm">{formatDate(key.last_used_at)}</td>
                      <td className="px-6 py-4 text-right">
                        {key.is_active ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => revokeKey(key.id, false)}
                              className="px-3 py-1.5 text-sm bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded transition-colors"
                            >
                              Revoke
                            </button>
                            <button
                              onClick={() => revokeKey(key.id, true)}
                              className="px-3 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => revokeKey(key.id, true)}
                            className="px-3 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Usage Instructions */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Usage Instructions</h3>
          <p className="text-slate-400 text-sm mb-4">
            Subscribers can use their API key to call custom routes that have "Allow API Key Access" enabled.
          </p>
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-300">
            <p className="text-slate-500 mb-2"># Using Authorization header</p>
            <p className="text-emerald-400">curl -X POST https://yoursite.com/api/custom/your-route \</p>
            <p className="text-emerald-400 pl-4">-H "Authorization: Bearer sk_sub_xxx..." \</p>
            <p className="text-emerald-400 pl-4">-H "Content-Type: application/json" \</p>
            <p className="text-emerald-400 pl-4">-d '{"{\"data\": \"value\"}"}'</p>
            <p className="text-slate-500 mt-4 mb-2"># Or using X-API-Key header</p>
            <p className="text-emerald-400">curl -X GET https://yoursite.com/api/custom/your-route \</p>
            <p className="text-emerald-400 pl-4">-H "X-API-Key: sk_sub_xxx..."</p>
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
    </AdminLayout>
  );
}
