import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/AdminLayout';

export default function EditPlan() {
  const router = useRouter();
  const { id } = router.query;
  
  const [formData, setFormData] = useState({
    name: '',
    api_limit: 0,
    page_view_limit: 0,
    price: 0,
    is_active: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (id) {
      fetchPlan();
    }
  }, [id]);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/plans/${id}`);
      const data = await response.json();

      if (response.ok) {
        setFormData({
          name: data.name || '',
          api_limit: data.api_limit || 0,
          page_view_limit: data.page_view_limit || 0,
          price: data.price || 0,
          is_active: data.is_active !== undefined ? data.is_active : true
        });
      } else {
        setError(data.error || 'Failed to fetch plan');
      }
    } catch (err) {
      setError('Failed to fetch plan');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Plan updated successfully!');
        setTimeout(() => {
          router.push('/admin/plans');
        }, 1500);
      } else {
        setError(data.error || 'Failed to update plan');
      }
    } catch (err) {
      setError('Failed to update plan');
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

  if (loading && formData.name === '') {
    return (
      <AdminLayout title="Edit Plan">
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <div className="text-lg text-slate-300">Loading plan...</div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Edit Plan: ${formData.name}`}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Edit Plan: {formData.name}</h1>
          <p className="text-slate-400 mt-1">Update pricing and limits for this subscription plan</p>
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

                {success && (
                  <div className="bg-emerald-900/20 border border-emerald-600/30 text-emerald-300 px-4 py-3 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{success}</span>
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
                    {loading ? 'Updating Plan...' : 'Update Plan'}
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
                <h3 className="text-lg font-semibold text-emerald-300 mb-3">💡 Plan Editing Best Practices</h3>
                <div className="text-emerald-200/80 space-y-2">
                  <p>• Be careful when changing limits for existing subscribers</p>
                  <p>• Consider grandfathering existing subscribers if reducing benefits</p>
                  <p>• Update your pricing page to reflect any changes</p>
                  <p>• Test the new limits with a sample account</p>
                  <p>• Communicate changes to your subscribers in advance</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}