import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../../components/AdminLayout';

export default function EditBackendRoute() {
  const router = useRouter();
  const { id } = router.query;

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    method: 'GET',
    description: '',
    code: '',
    packages: [],
    status: 'draft',
    auth_required: false,
    rate_limit_per_day: null,
    plan_access: 'public'
  });

  const [packageInput, setPackageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [originalPackages, setOriginalPackages] = useState([]);

  useEffect(() => {
    if (id) {
      fetchRoute();
    }
  }, [id]);

  const fetchRoute = async () => {
    try {
      const response = await fetch(`/api/admin/custom-routes/${id}`);
      if (response.ok) {
        const data = await response.json();
        const packages = data.packages || [];
        setFormData({
          name: data.name,
          slug: data.slug,
          method: data.method,
          description: data.description || '',
          code: data.code,
          packages: packages,
          status: data.status,
          auth_required: data.auth_required === 1,
          rate_limit_per_day: data.rate_limit_per_day,
          plan_access: data.plan_access || 'public'
        });
        setOriginalPackages(packages);
      } else {
        setError('Failed to load route');
      }
    } catch (err) {
      setError('Failed to load route');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/custom-routes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Check if packages were modified
        const packagesChanged = JSON.stringify(originalPackages.sort()) !== JSON.stringify(formData.packages.sort());

        if (packagesChanged && formData.packages.length > 0) {
          if (confirm('Packages were modified. Install them now?')) {
            setError('Installing packages... This may take a minute.');

            try {
              const installResponse = await fetch(`/api/admin/custom-routes/${id}/install-packages`, {
                method: 'POST'
              });

              if (!installResponse.ok) {
                const installData = await installResponse.json();
                console.error('Package installation failed:', installData);
                setError(`Route updated, but package installation failed: ${installData.error || installData.message}. You can install packages manually from the routes list.`);
                setTimeout(() => router.push('/admin/backend/routes'), 3000);
                return;
              }
            } catch (installErr) {
              console.error('Package installation error:', installErr);
              setError('Route updated, but package installation failed. You can install packages manually from the routes list.');
              setTimeout(() => router.push('/admin/backend/routes'), 3000);
              return;
            }
          }
        }

        router.push('/admin/backend/routes');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update route');
      }
    } catch (err) {
      setError('Failed to update route');
    } finally {
      setSaving(false);
    }
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name)
    });
  };

  const addPackage = () => {
    if (packageInput.trim() && !formData.packages.includes(packageInput.trim())) {
      setFormData({
        ...formData,
        packages: [...formData.packages, packageInput.trim()]
      });
      setPackageInput('');
    }
  };

  const removePackage = (pkg) => {
    setFormData({
      ...formData,
      packages: formData.packages.filter(p => p !== pkg)
    });
  };

  if (loading) {
    return (
      <AdminLayout title="Edit Backend Route">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Edit Route - ${formData.name}`}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Edit Backend Route</h1>
          <p className="text-slate-400 mt-1">Modify your custom API endpoint</p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-600/30 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200">Basic Information</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Route Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="e.g., User Statistics"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Slug <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono">
                      /api/custom/
                    </span>
                    <input
                      type="text"
                      required
                      className="w-full pl-32 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-mono"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="user-stats"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    HTTP Method <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  >
                    <option value="GET">GET - Retrieve data</option>
                    <option value="POST">POST - Create data</option>
                    <option value="PUT">PUT - Update data (full)</option>
                    <option value="PATCH">PATCH - Update data (partial)</option>
                    <option value="DELETE">DELETE - Delete data</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Status <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="draft">Draft - Not accessible</option>
                    <option value="active">Active - Live and accessible</option>
                    <option value="inactive">Inactive - Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this route do?"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Access Control */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200">Access Control & Rate Limiting</h3>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  🎯 Access Level
                </label>
                <select
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  value={formData.plan_access}
                  onChange={(e) => setFormData({ ...formData, plan_access: e.target.value })}
                >
                  <option value="public">🌍 Public - Anyone can access (no login required)</option>
                  <option value="any_subscriber">👤 Any Subscriber - Requires login (free or paid)</option>
                  <option value="paid_only">💎 Paid Only - Requires paid subscription</option>
                </select>
                <p className="text-xs text-slate-400 mt-2">
                  {formData.plan_access === 'public' && '• No authentication needed - open to everyone'}
                  {formData.plan_access === 'any_subscriber' && '• Users must be logged in (includes free tier users)'}
                  {formData.plan_access === 'paid_only' && '• Only users with paid plans can access (plan_id > 1)'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  ⏱️ Rate Limit (per day)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  value={formData.rate_limit_per_day || ''}
                  onChange={(e) => setFormData({ ...formData, rate_limit_per_day: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Leave empty for unlimited"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Limit the number of calls per user/IP per day. Leave empty for unlimited.
                </p>
              </div>
            </div>
          </div>

          {/* Code Editor */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200">Route Handler Code</h3>
              <p className="text-sm text-slate-400 mt-1">
                Write plain JavaScript code (no export/import). Available: req, res, console, require()
              </p>
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <div>• Access request data: <code className="text-emerald-400">req.query</code>, <code className="text-emerald-400">req.body</code>, <code className="text-emerald-400">req.headers</code></div>
                <div>• Send response: <code className="text-emerald-400">res.json(&#123;data&#125;)</code> or <code className="text-emerald-400">res.status(200).json(&#123;...&#125;)</code></div>
                <div>• Load packages: <code className="text-emerald-400">const axios = require('axios')</code></div>
              </div>
            </div>
            <div className="p-6">
              <textarea
                required
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                rows={20}
                style={{ tabSize: 2 }}
              />
            </div>
          </div>

          {/* NPM Packages */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200">NPM Packages</h3>
              <p className="text-sm text-slate-400 mt-1">
                Add npm packages that your route needs (changes require package installation)
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-mono"
                  value={packageInput}
                  onChange={(e) => setPackageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPackage())}
                  placeholder="e.g., axios, moment, lodash"
                />
                <button
                  type="button"
                  onClick={addPackage}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  Add
                </button>
              </div>

              {formData.packages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.packages.map((pkg) => (
                    <div
                      key={pkg}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg"
                    >
                      <span className="text-slate-200 font-mono text-sm">{pkg}</span>
                      <button
                        type="button"
                        onClick={() => removePackage(pkg)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/admin/backend/routes')}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
