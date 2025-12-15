import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '../../../components/AdminLayout';

export default function ServerLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [limit] = useState(100);
  const [selectedLog, setSelectedLog] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [filter, offset]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs();
      }, 5000); // Refresh every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, filter, offset]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/server-logs?limit=${limit}&offset=${offset}`;
      if (filter !== 'all') {
        url += `&log_type=${filter}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLogTypeColor = (logType) => {
    const colors = {
      info: 'bg-blue-900/20 text-blue-400 border-blue-600/30',
      error: 'bg-red-900/20 text-red-400 border-red-600/30',
      warning: 'bg-yellow-900/20 text-yellow-400 border-yellow-600/30',
      debug: 'bg-purple-900/20 text-purple-400 border-purple-600/30'
    };
    return colors[logType] || colors.info;
  };

  const getLogTypeIcon = (logType) => {
    const icons = {
      info: 'ℹ️',
      error: '❌',
      warning: '⚠️',
      debug: '🐛'
    };
    return icons[logType] || '📋';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all server logs? This action cannot be undone.')) {
      return;
    }
    // Note: You'll need to add a DELETE endpoint to the API
    alert('Clear logs functionality needs to be implemented in the API');
  };

  if (loading && logs.length === 0) {
    return (
      <AdminLayout title="Server Logs">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Server Logs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Server Logs</h1>
            <p className="text-slate-400 mt-1">Monitor system events, errors, and activity</p>
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                autoRefresh
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
            </button>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-4">
            <div className="text-blue-400 text-sm font-medium">Total Logs</div>
            <div className="text-2xl font-bold text-slate-100 mt-1">{total}</div>
          </div>
          <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-4">
            <div className="text-red-400 text-sm font-medium">Errors</div>
            <div className="text-2xl font-bold text-slate-100 mt-1">
              {logs.filter(l => l.log_type === 'error').length}
            </div>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-xl p-4">
            <div className="text-yellow-400 text-sm font-medium">Warnings</div>
            <div className="text-2xl font-bold text-slate-100 mt-1">
              {logs.filter(l => l.log_type === 'warning').length}
            </div>
          </div>
          <div className="bg-purple-900/20 border border-purple-600/30 rounded-xl p-4">
            <div className="text-purple-400 text-sm font-medium">Debug</div>
            <div className="text-2xl font-bold text-slate-100 mt-1">
              {logs.filter(l => l.log_type === 'debug').length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {['all', 'info', 'error', 'warning', 'debug'].map(type => (
            <button
              key={type}
              onClick={() => {
                setFilter(type);
                setOffset(0);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === type
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Logs List */}
        <div className="bg-slate-800 border border-slate-700 shadow-xl rounded-xl overflow-hidden">
          {logs.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No logs found</h3>
              <p className="text-slate-400">
                {filter === 'all' ? 'No server logs yet' : `No ${filter} logs found`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700 max-h-[600px] overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-slate-700/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-2xl mt-0.5 flex-shrink-0">
                        {getLogTypeIcon(log.log_type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getLogTypeColor(log.log_type)}`}>
                            {log.log_type.toUpperCase()}
                          </span>
                          {log.source && (
                            <span className="text-xs text-slate-500 font-mono">
                              [{log.source}]
                            </span>
                          )}
                          <span className="text-xs text-slate-500">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        <div className="text-sm text-slate-200 break-words">
                          {log.message}
                        </div>
                      </div>
                    </div>
                    {log.context && Object.keys(log.context).length > 0 && (
                      <button className="text-slate-400 hover:text-slate-300 flex-shrink-0">
                        <svg
                          className={`w-5 h-5 transition-transform ${selectedLog?.id === log.id ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Expanded Context */}
                  {selectedLog?.id === log.id && log.context && Object.keys(log.context).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <div className="text-xs text-slate-400 mb-2">Context Data:</div>
                      <pre className="bg-slate-900 p-3 rounded text-xs text-slate-300 overflow-x-auto">
                        {JSON.stringify(log.context, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex justify-between items-center">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-slate-400">
              Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
