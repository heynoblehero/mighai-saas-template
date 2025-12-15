import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function ErrorMonitoring() {
  const [stats, setStats] = useState(null);
  const [errorLogs, setErrorLogs] = useState([]);
  const [selectedError, setSelectedError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchErrorStats();
    fetchErrorLogs();
  }, [page, filterType]);

  const fetchErrorStats = async () => {
    try {
      const response = await fetch('/api/admin/error-stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch error stats:', error);
    }
  };

  const fetchErrorLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterType) params.append('error_type', filterType);
      
      const response = await fetch(`/api/admin/error-logs?${params}`);
      const data = await response.json();
      setErrorLogs(data.logs);
      setTotalPages(data.total_pages);
    } catch (error) {
      console.error('Failed to fetch error logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchErrorDetails = async (id) => {
    try {
      const response = await fetch(`/api/admin/error-logs/${id}`);
      const data = await response.json();
      setSelectedError(data);
    } catch (error) {
      console.error('Failed to fetch error details:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getErrorTypeColor = (type) => {
    const colors = {
      'API_WORKER_REQUEST_FAILED': 'bg-red-900/30 text-red-300 border border-red-600/30',
      'TEMPLATE_VALIDATION_ERROR': 'bg-orange-900/30 text-orange-300 border border-orange-600/30',
      'CONFIG_ERROR': 'bg-yellow-900/30 text-yellow-300 border border-yellow-600/30',
      'DEFAULT': 'bg-slate-700 text-slate-300 border border-slate-600'
    };
    return colors[type] || colors.DEFAULT;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        
        {/* Error Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-400">Last 24 Hours</h3>
                  <p className="text-2xl font-bold text-slate-200">{stats.errors_last_24h}</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-400">Last 7 Days</h3>
                  <p className="text-2xl font-bold text-slate-200">{stats.errors_last_7_days}</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-400">Error Types</h3>
                  <p className="text-2xl font-bold text-slate-200">{stats.error_types?.length || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-400">Affected Users</h3>
                  <p className="text-2xl font-bold text-slate-200">{stats.most_affected_users?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Type Breakdown */}
        {stats?.error_types && stats.error_types.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-xl">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Error Types Breakdown</h3>
            <div className="space-y-3">
              {stats.error_types.map((type, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getErrorTypeColor(type.error_type)}`}>
                    {type.error_type}
                  </span>
                  <span className="font-medium text-slate-300">{type.count} errors</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Most Affected Users */}
        {stats?.most_affected_users && stats.most_affected_users.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-xl">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Most Affected Users</h3>
            <div className="space-y-3">
              {stats.most_affected_users.map((user, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">{user.user_email}</span>
                  <span className="font-medium text-red-400">{user.error_count} errors</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter and Controls */}
        <div className="flex flex-wrap gap-4">
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-700 border border-slate-600 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Error Types</option>
            {stats?.error_types?.map(type => (
              <option key={type.error_type} value={type.error_type}>
                {type.error_type} ({type.count})
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setFilterType('');
              setPage(1);
              fetchErrorLogs();
            }}
            className="px-4 py-2 bg-slate-700 border border-slate-600 text-slate-200 rounded-lg hover:bg-slate-600 hover:text-white transition-colors"
          >
            Clear Filters
          </button>
          <button
            onClick={() => {
              fetchErrorStats();
              fetchErrorLogs();
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        {/* Error Logs Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200">Recent Errors</h3>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-2 text-slate-400">Loading error logs...</p>
            </div>
          ) : errorLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No errors found</h3>
              <p className="text-slate-500">Either no errors occurred or they match your filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Error Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        API Endpoint
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800 divide-y divide-slate-700">
                    {errorLogs.map((log, index) => (
                      <tr 
                        key={log.id} 
                        className="hover:bg-slate-700/50 transition-colors"
                        style={{ 
                          animationDelay: `${index * 50}ms`,
                          animation: 'fadeInUp 0.5s ease-out forwards'
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-slate-200">{log.user_email}</div>
                            <div className="text-xs text-slate-400">{log.user_plan} plan</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getErrorTypeColor(log.error_type)}`}>
                            {log.error_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300 max-w-xs truncate">
                          {log.error_message}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400 max-w-xs truncate font-mono">
                          {log.api_endpoint || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.response_status && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              log.response_status >= 400 
                                ? 'bg-red-900/30 text-red-300 border border-red-600/30' 
                                : 'bg-emerald-900/30 text-emerald-300 border border-emerald-600/30'
                            }`}>
                              {log.response_status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => fetchErrorDetails(log.id)}
                            className="text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-700 flex justify-between items-center">
                  <div className="text-sm text-slate-400">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-slate-700 border border-slate-600 text-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 hover:text-white transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-slate-700 border border-slate-600 text-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 hover:text-white transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Error Details Modal */}
        {selectedError && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-200">Error Details</h3>
                <button
                  onClick={() => setSelectedError(null)}
                  className="text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400">User</label>
                    <p className="mt-1 text-sm text-slate-200">{selectedError.user_email} ({selectedError.user_plan} plan)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400">Time</label>
                    <p className="mt-1 text-sm text-slate-200">{formatDate(selectedError.created_at)}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400">Error Type</label>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${getErrorTypeColor(selectedError.error_type)}`}>
                    {selectedError.error_type}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400">Error Message</label>
                  <p className="mt-1 text-sm text-slate-200 bg-red-900/20 border border-red-600/30 p-3 rounded-lg">{selectedError.error_message}</p>
                </div>

                {selectedError.api_endpoint && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400">API Endpoint</label>
                    <p className="mt-1 text-sm text-slate-200 font-mono bg-slate-900/50 border border-slate-600 p-3 rounded-lg">
                      {selectedError.request_method} {selectedError.api_endpoint}
                    </p>
                  </div>
                )}

                {selectedError.input_data && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400">Input Data</label>
                    <pre className="mt-1 text-xs text-slate-200 bg-slate-900/50 border border-slate-600 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(JSON.parse(selectedError.input_data), null, 2)}
                    </pre>
                  </div>
                )}

                {selectedError.request_body && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400">Request Body</label>
                    <pre className="mt-1 text-xs text-slate-200 bg-slate-900/50 border border-slate-600 p-3 rounded-lg overflow-x-auto">
                      {selectedError.request_body}
                    </pre>
                  </div>
                )}

                {selectedError.response_data && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400">Response Data</label>
                    <pre className="mt-1 text-xs text-slate-200 bg-slate-900/50 border border-slate-600 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(JSON.parse(selectedError.response_data), null, 2)}
                    </pre>
                  </div>
                )}

                {selectedError.error_stack && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400">Stack Trace</label>
                    <pre className="mt-1 text-xs text-slate-200 bg-slate-900/50 border border-slate-600 p-3 rounded-lg overflow-x-auto">
                      {selectedError.error_stack}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-emerald-300 mb-2">
                Error Monitoring Features
              </h3>
              <div className="text-emerald-200/80 space-y-2">
                <p>• Real-time error tracking with detailed stack traces and request data</p>
                <p>• Filter by error types and track most affected users</p>
                <p>• Monitor API endpoint failures and response status codes</p>
                <p>• View comprehensive error statistics and trends over time</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </AdminLayout>
  );
}