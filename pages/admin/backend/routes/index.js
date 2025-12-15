import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/AdminLayout';

export default function BackendRoutes() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchRoutes();
  }, [filter]);

  const fetchRoutes = async () => {
    try {
      let url = '/api/admin/custom-routes';
      if (filter !== 'all') {
        url += `?status=${filter}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      setRoutes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteRoute = async (id) => {
    if (!confirm('Are you sure you want to delete this route? This will also delete all execution logs.')) return;

    try {
      const response = await fetch(`/api/admin/custom-routes/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setRoutes(routes.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete route:', error);
    }
  };

  const toggleStatus = async (route) => {
    const newStatus = route.status === 'active' ? 'inactive' : 'active';

    try {
      const response = await fetch(`/api/admin/custom-routes/${route.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchRoutes();
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const installPackages = async (route) => {
    if (!route.packages || route.packages.length === 0) {
      alert('No packages to install for this route');
      return;
    }

    if (!confirm(`Install ${route.packages.length} package(s) for "${route.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/custom-routes/${route.id}/install-packages`, {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        alert('Packages installed successfully!');
        fetchRoutes();
      } else {
        alert(`Failed to install packages: ${data.error || data.message}`);
      }
    } catch (error) {
      console.error('Failed to install packages:', error);
      alert('Failed to install packages');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-900/20 text-green-400 border-green-600/30',
      inactive: 'bg-gray-900/20 text-gray-400 border-gray-600/30',
      draft: 'bg-yellow-900/20 text-yellow-400 border-yellow-600/30'
    };
    return badges[status] || badges.draft;
  };

  const getMethodBadge = (method) => {
    const badges = {
      GET: 'bg-blue-900/20 text-blue-400 border-blue-600/30',
      POST: 'bg-green-900/20 text-green-400 border-green-600/30',
      PUT: 'bg-orange-900/20 text-orange-400 border-orange-600/30',
      DELETE: 'bg-red-900/20 text-red-400 border-red-600/30',
      PATCH: 'bg-purple-900/20 text-purple-400 border-purple-600/30'
    };
    return badges[method] || badges.GET;
  };

  if (loading) {
    return (
      <AdminLayout title="Backend Routes">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Backend Routes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Backend API Routes</h1>
            <p className="text-slate-400 mt-1">Create and manage custom API endpoints with Node.js</p>
          </div>
          <Link
            href="/admin/backend/routes/new"
            className="mt-4 sm:mt-0 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Create New Route</span>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex space-x-2">
          {['all', 'active', 'inactive', 'draft'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Routes List */}
        <div className="bg-slate-800 border border-slate-700 shadow-xl rounded-xl overflow-hidden">
          {routes.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔌</div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No API routes yet</h3>
              <p className="text-slate-400 mb-6">
                Create custom API endpoints with Node.js code
              </p>
              <Link
                href="/admin/backend/routes/new"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
              >
                <span>Create Your First Route</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Route</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Executions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Packages</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {routes.map((route) => (
                    <tr key={route.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-slate-200">{route.name}</div>
                          <div className="text-xs text-slate-400 font-mono">/api/custom/{route.slug}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getMethodBadge(route.method)}`}>
                          {route.method}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusBadge(route.status)}`}>
                          {route.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {route.execution_count || 0}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-300">
                            {route.packages?.length || 0}
                          </span>
                          {route.packages?.length > 0 && (
                            <button
                              onClick={() => installPackages(route)}
                              className="text-xs px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded border border-emerald-600/30 transition-colors"
                              title={`Install: ${route.packages.join(', ')}`}
                            >
                              📦 Install
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium space-x-2">
                        <Link
                          href={`/admin/backend/routes/${route.id}/logs`}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Logs
                        </Link>
                        <Link
                          href={`/admin/backend/routes/edit/${route.id}`}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => toggleStatus(route)}
                          className="text-yellow-400 hover:text-yellow-300"
                        >
                          {route.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteRoute(route.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
