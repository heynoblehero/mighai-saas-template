import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '../../../components/AdminLayout';

export default function PlansAdmin() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setPlans(data);
      } else {
        console.error('Plans data is not an array:', data);
        setPlans([]);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      setError('Failed to load plans');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async (id) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    
    try {
      const response = await fetch(`/api/plans/${id}`, { method: 'DELETE' });
      const data = await response.json();
      
      if (response.ok) {
        setPlans(plans.filter(plan => plan.id !== id));
      } else {
        alert(data.error || 'Failed to delete plan');
      }
    } catch (error) {
      alert('Failed to delete plan');
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Plans">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <div className="text-lg text-slate-300">Loading plans...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Plans Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Subscription Plans</h1>
            <p className="text-slate-400 mt-1">Manage your pricing tiers and subscriber limits</p>
          </div>
          <Link 
            href="/admin/plans/new" 
            className="mt-4 sm:mt-0 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Create New Plan</span>
          </Link>
        </div>

        {/* Error Alert */}
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

        {/* Plans Table/Grid */}
        <div className="bg-slate-800 border border-slate-700 shadow-xl rounded-xl overflow-hidden">
          {plans.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">💳</div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No plans found</h3>
              <p className="text-slate-400 mb-6">
                Create subscription plans to monetize your SaaS platform
              </p>
              <Link 
                href="/admin/plans/new" 
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create your first plan</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Plan Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      API Calls
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Page Views
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Price
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
                  {plans.map((plan, index) => (
                    <tr 
                      key={plan.id} 
                      className="hover:bg-slate-700/50 transition-colors"
                      style={{ 
                        animationDelay: `${index * 100}ms`,
                        animation: 'fadeInUp 0.5s ease-out forwards'
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="text-lg font-semibold text-slate-200">
                            {plan.name}
                          </div>
                          {plan.name === 'free' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-300 border border-emerald-600/30">
                              Default
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-slate-300 font-medium">
                          {plan.api_limit === -1 ? (
                            <span className="text-emerald-400">Unlimited</span>
                          ) : (
                            `${plan.api_limit.toLocaleString()} calls`
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-slate-300 font-medium">
                          {plan.page_view_limit === -1 ? (
                            <span className="text-emerald-400">Unlimited</span>
                          ) : (
                            `${plan.page_view_limit.toLocaleString()} views`
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xl font-bold text-slate-200">
                          {plan.price === 0 ? (
                            <span className="text-emerald-400">Free</span>
                          ) : (
                            `$${plan.price}`
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-sm font-medium rounded-full ${
                          plan.is_active 
                            ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-600/30' 
                            : 'bg-red-900/30 text-red-300 border border-red-600/30'
                        }`}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <Link
                            href={`/admin/plans/edit/${plan.id}`}
                            className="text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            Edit
                          </Link>
                          {plan.name !== 'free' && (
                            <button
                              onClick={() => deletePlan(plan.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
                About Subscription Plans
              </h3>
              <div className="text-emerald-200/80 space-y-2">
                <p>• Plans control how many API calls and page views subscribers can access</p>
                <p>• New subscribers are automatically assigned to the "free" plan by default</p>
                <p>• Set limits to -1 for unlimited access on premium plans</p>
                <p>• Use pricing to monetize your SaaS and generate revenue</p>
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