import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function EmailList() {
  const [emails, setEmails] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ source: 'all', subscribed: 'all', search: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState({ email: '', name: '' });
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchEmails();
  }, [pagination.page, filters]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        source: filters.source,
        subscribed: filters.subscribed,
        search: filters.search
      });

      const response = await fetch(`/api/admin/email-list?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails);
        setPagination(data.pagination);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching email list:', error);
      setMessage({ type: 'error', text: 'Failed to fetch email list' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async (e) => {
    e.preventDefault();
    setAdding(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/email-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmail)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `Email ${data.status === 'added' ? 'added' : data.status === 'resubscribed' ? 'resubscribed' : 'already exists'}` });
        setShowAddModal(false);
        setNewEmail({ email: '', name: '' });
        fetchEmails();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add email' });
    } finally {
      setAdding(false);
    }
  };

  const handleUnsubscribe = async (email) => {
    if (!confirm(`Are you sure you want to unsubscribe ${email}?`)) return;

    try {
      const response = await fetch('/api/admin/email-list', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Email unsubscribed' });
        fetchEmails();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to unsubscribe' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to unsubscribe' });
    }
  };

  const handleExportCSV = () => {
    const headers = ['Email', 'Name', 'Source', 'Subscribed', 'Created At'];
    const rows = emails.map(e => [
      e.email,
      e.name || '',
      e.source,
      e.subscribed ? 'Yes' : 'No',
      new Date(e.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getSourceBadge = (source) => {
    const colors = {
      chat: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      api: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      signup: 'bg-green-500/20 text-green-400 border-green-500/30',
      manual: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    };
    return colors[source] || colors.manual;
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Email List</h1>
              <p className="text-slate-400 mt-2">
                Manage your newsletter and marketing email subscribers
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Email
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Total Emails</p>
              <p className="text-2xl font-bold text-slate-100">{stats.total}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Subscribed</p>
              <p className="text-2xl font-bold text-green-400">{stats.subscribed_count}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-sm">From Chat</p>
              <p className="text-2xl font-bold text-blue-400">{stats.from_chat}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-sm">From API</p>
              <p className="text-2xl font-bold text-purple-400">{stats.from_api}</p>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-900/30 text-green-300 border border-green-600/30'
              : 'bg-red-900/30 text-red-300 border border-red-600/30'
          }`}>
            {message.text}
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search email or name..."
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Source</label>
              <select
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200"
              >
                <option value="all">All Sources</option>
                <option value="chat">Chat</option>
                <option value="api">API</option>
                <option value="signup">Signup</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Status</label>
              <select
                value={filters.subscribed}
                onChange={(e) => setFilters({ ...filters, subscribed: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200"
              >
                <option value="all">All Status</option>
                <option value="true">Subscribed</option>
                <option value="false">Unsubscribed</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ source: 'all', subscribed: 'all', search: '' });
                  setPagination({ ...pagination, page: 1 });
                }}
                className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Email List Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-slate-400">No emails found</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="text-left px-6 py-3 text-slate-400 font-medium text-sm">Email</th>
                    <th className="text-left px-6 py-3 text-slate-400 font-medium text-sm">Name</th>
                    <th className="text-left px-6 py-3 text-slate-400 font-medium text-sm">Source</th>
                    <th className="text-left px-6 py-3 text-slate-400 font-medium text-sm">Status</th>
                    <th className="text-left px-6 py-3 text-slate-400 font-medium text-sm">Created</th>
                    <th className="text-right px-6 py-3 text-slate-400 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {emails.map((email) => (
                    <tr key={email.id} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4 text-slate-200">{email.email}</td>
                      <td className="px-6 py-4 text-slate-400">{email.name || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs border ${getSourceBadge(email.source)}`}>
                          {email.source}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {email.subscribed ? (
                          <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                            Subscribed
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                            Unsubscribed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {new Date(email.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {email.subscribed && (
                          <button
                            onClick={() => handleUnsubscribe(email.email)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Unsubscribe
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
                  <p className="text-slate-400 text-sm">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Email Sources</h3>
              <div className="text-slate-400 space-y-1 text-sm">
                <p><span className="text-blue-400">Chat:</span> Users who registered via the support chat widget</p>
                <p><span className="text-purple-400">API:</span> Emails added via the external API endpoint</p>
                <p><span className="text-green-400">Signup:</span> Users who signed up for an account</p>
                <p><span className="text-slate-400">Manual:</span> Emails added manually by admin</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Email Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Add Email to List</h2>
            <form onSubmit={handleAddEmail}>
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newEmail.email}
                    onChange={(e) => setNewEmail({ ...newEmail, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Name (optional)</label>
                  <input
                    type="text"
                    value={newEmail.name}
                    onChange={(e) => setNewEmail({ ...newEmail, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
