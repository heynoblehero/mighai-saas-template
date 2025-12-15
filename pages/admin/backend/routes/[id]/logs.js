import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '../../../../../components/AdminLayout';

export default function RouteLogs() {
  const router = useRouter();
  const { id } = router.query;

  const [route, setRoute] = useState(null);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    if (id) {
      fetchRouteAndLogs();
    }
  }, [id, offset]);

  const fetchRouteAndLogs = async () => {
    setLoading(true);
    try {
      // Fetch route details
      const routeRes = await fetch(`/api/admin/custom-routes/${id}`);
      if (routeRes.ok) {
        const routeData = await routeRes.json();
        setRoute(routeData);
      }

      // Fetch logs
      const logsRes = await fetch(`/api/admin/custom-routes/${id}/logs?limit=${limit}&offset=${offset}`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs);
        setTotal(logsData.total);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (code) => {
    if (code >= 200 && code < 300) return 'text-green-400 bg-green-900/20 border-green-600/30';
    if (code >= 300 && code < 400) return 'text-blue-400 bg-blue-900/20 border-blue-600/30';
    if (code >= 400 && code < 500) return 'text-yellow-400 bg-yellow-900/20 border-yellow-600/30';
    return 'text-red-400 bg-red-900/20 border-red-600/30';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatExecutionTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading && !route) {
    return (
      <AdminLayout title="Route Logs">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Logs - ${route?.name || 'Route'}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/admin/backend/routes"
                className="text-slate-400 hover:text-slate-300"
              >
                ← Back to Routes
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-slate-100">{route?.name}</h1>
            <p className="text-slate-400 mt-1">
              <span className="font-mono text-emerald-400">{route?.method}</span>{' '}
              /api/custom/{route?.slug}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400">Total Executions</div>
            <div className="text-3xl font-bold text-slate-100">{total}</div>
          </div>
        </div>

        {/* Logs List */}
        <div className="bg-slate-800 border border-slate-700 shadow-xl rounded-xl overflow-hidden">
          {logs.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No execution logs yet</h3>
              <p className="text-slate-400">
                This route hasn't been called yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-6 hover:bg-slate-700/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(log.status_code)}`}>
                        {log.status_code}
                      </span>
                      <span className="text-slate-400 text-sm">
                        {formatDate(log.executed_at)}
                      </span>
                      <span className="text-slate-500 text-sm">
                        {formatExecutionTime(log.execution_time)}
                      </span>
                    </div>
                    <button className="text-slate-400 hover:text-slate-300">
                      <svg
                        className={`w-5 h-5 transition-transform ${selectedLog?.id === log.id ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {log.error_message && (
                    <div className="mb-3 text-sm text-red-400 bg-red-900/20 border border-red-600/30 rounded px-3 py-2 font-mono">
                      {log.error_message}
                    </div>
                  )}

                  {/* Expanded Details */}
                  {selectedLog?.id === log.id && (
                    <div className="mt-4 space-y-4 pt-4 border-t border-slate-600">
                      {/* Request Details */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-300 mb-2">Request</h4>
                        <div className="space-y-2">
                          {log.request_query && Object.keys(log.request_query).length > 0 && (
                            <div>
                              <div className="text-xs text-slate-400 mb-1">Query Parameters</div>
                              <pre className="bg-slate-900 p-3 rounded text-xs text-slate-300 overflow-x-auto">
                                {JSON.stringify(log.request_query, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.request_body && Object.keys(log.request_body).length > 0 && (
                            <div>
                              <div className="text-xs text-slate-400 mb-1">Request Body</div>
                              <pre className="bg-slate-900 p-3 rounded text-xs text-slate-300 overflow-x-auto">
                                {JSON.stringify(log.request_body, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.request_headers && Object.keys(log.request_headers).length > 0 && (
                            <div>
                              <div className="text-xs text-slate-400 mb-1">Headers</div>
                              <pre className="bg-slate-900 p-3 rounded text-xs text-slate-300 overflow-x-auto max-h-40">
                                {JSON.stringify(log.request_headers, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Response Details */}
                      {log.response_data && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300 mb-2">Response</h4>
                          <pre className="bg-slate-900 p-3 rounded text-xs text-slate-300 overflow-x-auto max-h-60">
                            {JSON.stringify(log.response_data, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Console Logs */}
                      {log.console_logs && log.console_logs.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300 mb-2">Console Output</h4>
                          <div className="bg-slate-900 p-3 rounded space-y-1 max-h-60 overflow-y-auto">
                            {log.console_logs.map((consoleLog, idx) => (
                              <div key={idx} className="text-xs font-mono">
                                <span className={`${
                                  consoleLog.type === 'error' ? 'text-red-400' :
                                  consoleLog.type === 'warn' ? 'text-yellow-400' :
                                  'text-slate-300'
                                }`}>
                                  [{consoleLog.type}] {consoleLog.message}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
