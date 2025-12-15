import { useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';

export default function NewPlan() {
  const [formData, setFormData] = useState({
    name: '',
    api_limit: 0,
    page_view_limit: 0,
    price: 0,
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin/plans');
      } else {
        setError(data.error || 'Failed to create plan');
      }
    } catch (err) {
      setError('Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <AdminLayout title="Create New Plan">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Create New Plan</h1>
          <p className="text-slate-400 mt-1">Configure pricing and limits for your new subscription plan</p>
        </div>

        <div className="max-w-3xl">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200">Plan Configuration</h3>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-900/20 border border-red-600/30 text-red-300 px-4 py-3 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Plan Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Basic, Pro, Enterprise"
                  />
                  <p className="text-sm text-slate-400 mt-1">
                    Choose a clear, descriptive name for your subscription plan
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      API Call Limit <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-400">🔧</span>
                      </div>
                      <input
                        type="number"
                        name="api_limit"
                        required
                        min="0"
                        className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                        value={formData.api_limit}
                        onChange={handleChange}
                        placeholder="e.g., 1000"
                      />
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      Maximum number of API calls subscribers can make per month
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Page View Limit <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-400">👁️</span>
                      </div>
                      <input
                        type="number"
                        name="page_view_limit"
                        required
                        min="0"
                        className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                        value={formData.page_view_limit}
                        onChange={handleChange}
                        placeholder="e.g., 10000"
                      />
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      Maximum number of pages subscribers can view per month
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Monthly Price (USD)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-400">$</span>
                    </div>
                    <input
                      type="number"
                      name="price"
                      step="0.01"
                      min="0"
                      className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    Set to $0.00 for free plans. Price is charged monthly.
                  </p>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="is_active"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium text-slate-300">
                      Plan is active and available for new subscribers
                    </span>
                  </label>
                  <p className="text-sm text-slate-400 mt-1 ml-6">
                    Inactive plans won't be shown to customers during signup
                  </p>
                </div>

                <div className="flex space-x-3 pt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50"
                  >
                    {loading ? 'Creating Plan...' : 'Create Plan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/admin/plans')}
                    className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6 mt-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-emerald-300 mb-3">💡 Plan Creation Best Practices</h3>
                <div className="text-emerald-200/80 space-y-2">
                  <p>• Start with conservative limits and increase based on user feedback</p>
                  <p>• Consider offering a free tier to attract users</p>
                  <p>• Set clear value propositions for each pricing tier</p>
                  <p>• API limits should scale proportionally with price</p>
                  <p>• Test your pricing strategy with a small group first</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}