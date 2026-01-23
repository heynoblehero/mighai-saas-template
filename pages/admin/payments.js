import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import TabNavigation from '../../components/admin/TabNavigation';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function PaymentsManagement() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingLinks, setGeneratingLinks] = useState({});
  const [checkoutLinks, setCheckoutLinks] = useState({});
  const [error, setError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, data: null });
  const toast = useToast();

  // Sync subscriptions state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

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

  const confirmDeletePlan = (id) => {
    setConfirmDialog({ isOpen: true, data: id });
  };

  const deletePlan = async (id) => {
    try {
      const response = await fetch(`/api/plans/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok) {
        setPlans(plans.filter(plan => plan.id !== id));
        toast.success('Plan deleted successfully');
      } else {
        toast.error(data.error || 'Failed to delete plan');
      }
    } catch (error) {
      toast.error('Failed to delete plan');
    }
  };

  const generateCheckoutLink = async (planId) => {
    setGeneratingLinks(prev => ({ ...prev, [planId]: true }));

    try {
      const response = await fetch(`/api/checkout-link/${planId}`);
      const data = await response.json();

      if (response.ok) {
        setCheckoutLinks(prev => ({
          ...prev,
          [planId]: data.checkout_url
        }));
        toast.success('Checkout link generated');
      } else {
        toast.error(data.error || 'Failed to generate checkout link');
      }
    } catch (error) {
      toast.error('Network error occurred');
    } finally {
      setGeneratingLinks(prev => ({ ...prev, [planId]: false }));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Link copied to clipboard');
    });
  };

  const getEmbedCode = (planId, planName, checkoutUrl) => {
    return `<!-- ${planName} Plan Checkout Button -->
<a href="${checkoutUrl}"
   target="_blank"
   style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
   Subscribe to ${planName} Plan
</a>`;
  };

  // Plans Management Component
  const PlansManagement = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <div className="text-lg text-slate-300">Loading plans...</div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Subscription Plans</h1>
            <p className="text-slate-400 mt-1">Manage your pricing tiers and subscriber limits</p>
          </div>
          <a
            href="/admin/plans/new"
            className="mt-4 sm:mt-0 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Create New Plan</span>
          </a>
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
              <a
                href="/admin/plans/new"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create your first plan</span>
              </a>
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
                          <a
                            href={`/admin/plans/edit/${plan.id}`}
                            className="text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            Edit
                          </a>
                          {plan.name !== 'free' && (
                            <button
                              onClick={() => confirmDeletePlan(plan.id)}
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
    );
  };

  // Checkout Links Component
  const CheckoutLinks = () => {
    if (loading) {
      return (
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <div className="text-lg text-slate-300">Loading plans...</div>
            </div>
          </div>
        </div>
      );
    }

    const paidPlans = plans.filter(plan => plan.price > 0 && plan.is_active);

    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Checkout Links Manager</h1>
          <p className="text-slate-400">
            Generate direct Lemon Squeezy checkout links that can be embedded in custom pricing pages or shared directly with customers.
          </p>
        </div>

        {paidPlans.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400">No paid plans available</div>
            <p className="text-sm text-slate-500 mt-2">
              Create some paid plans first to generate checkout links
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {paidPlans.map((plan) => (
              <div key={plan.id} className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-200 capitalize">
                      {plan.name} Plan
                    </h3>
                    <p className="text-sm text-slate-400">
                      ${plan.price}/month • {plan.api_limit} API calls • {plan.page_view_limit} page views
                    </p>
                  </div>
                  <button
                    onClick={() => generateCheckoutLink(plan.id)}
                    disabled={generatingLinks[plan.id]}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-emerald-600/50 transition-colors"
                  >
                    {generatingLinks[plan.id] ? 'Generating...' : 'Generate Link'}
                  </button>
                </div>

                {checkoutLinks[plan.id] && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Direct Checkout URL:
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={checkoutLinks[plan.id]}
                          readOnly
                          className="flex-1 px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(checkoutLinks[plan.id])}
                          className="px-3 py-2 bg-slate-600 text-slate-200 rounded-lg hover:bg-slate-500 text-sm transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        HTML Embed Code:
                      </label>
                      <div className="relative">
                        <pre className="bg-slate-900 text-emerald-400 p-4 rounded-lg text-xs overflow-x-auto border border-slate-700">
                          <code>{getEmbedCode(plan.id, plan.name, checkoutLinks[plan.id])}</code>
                        </pre>
                        <button
                          onClick={() => copyToClipboard(getEmbedCode(plan.id, plan.name, checkoutLinks[plan.id]))}
                          className="absolute top-2 right-2 px-2 py-1 bg-slate-700 text-slate-200 rounded text-xs hover:bg-slate-600 transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-emerald-300 mb-2">Usage Instructions:</h4>
                      <ul className="text-sm text-emerald-200/80 space-y-1">
                        <li>• Use the direct URL to redirect users to Lemon Squeezy checkout</li>
                        <li>• Embed the HTML code in your custom pricing page</li>
                        <li>• Customers will be prompted to create an account after payment</li>
                        <li>• Links automatically expire after 24 hours for security</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-emerald-300 mb-2">
                Important Notes
              </h3>
              <div className="text-emerald-200/80">
                <ul className="list-disc list-inside space-y-1">
                  <li>Checkout links are public and don't require user authentication</li>
                  <li>New customers will automatically get a subscriber account created</li>
                  <li>Existing customers (by email) will have their plan upgraded</li>
                  <li>Make sure your Lemon Squeezy webhook is configured to handle payments</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Sync Subscriptions functions
  const syncSubscriptions = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch('/api/admin/lemonsqueezy/sync-subscriptions', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setSyncResult({
          success: true,
          message: data.message,
          results: data.results
        });
      } else {
        setSyncResult({
          success: false,
          message: data.error || 'Sync failed'
        });
      }
    } catch (error) {
      setSyncResult({
        success: false,
        message: 'Failed to connect to server'
      });
    } finally {
      setSyncing(false);
    }
  };

  const verifySubscription = async (e) => {
    e.preventDefault();
    if (!verifyEmail.trim()) return;

    setVerifying(true);
    setVerifyResult(null);
    try {
      const response = await fetch('/api/admin/lemonsqueezy/verify-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail })
      });
      const data = await response.json();

      setVerifyResult(data);
    } catch (error) {
      setVerifyResult({
        success: false,
        error: 'Failed to verify subscription'
      });
    } finally {
      setVerifying(false);
    }
  };

  // Sync Subscriptions Component
  const SyncSubscriptions = () => {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Subscription Sync</h1>
          <p className="text-slate-400">
            Sync subscription data from LemonSqueezy API to verify and update user subscription statuses without relying on webhooks.
          </p>
        </div>

        {/* Sync All Subscriptions */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Sync All Subscriptions</h3>
          <p className="text-sm text-slate-400 mb-4">
            Fetch all subscriptions from LemonSqueezy and update user statuses in the database.
            This is useful if webhooks failed or you need to reconcile data.
          </p>

          <button
            onClick={syncSubscriptions}
            disabled={syncing}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {syncing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Now
              </>
            )}
          </button>

          {syncResult && (
            <div className={`mt-4 p-4 rounded-lg ${syncResult.success ? 'bg-emerald-900/20 border border-emerald-600/30' : 'bg-red-900/20 border border-red-600/30'}`}>
              <p className={syncResult.success ? 'text-emerald-300' : 'text-red-300'}>
                {syncResult.message}
              </p>
              {syncResult.results && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-slate-400">Processed</div>
                    <div className="text-xl font-semibold text-slate-200">{syncResult.results.processed}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-slate-400">Updated</div>
                    <div className="text-xl font-semibold text-emerald-400">{syncResult.results.updated}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-slate-400">Skipped</div>
                    <div className="text-xl font-semibold text-slate-300">{syncResult.results.skipped}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-slate-400">Errors</div>
                    <div className="text-xl font-semibold text-red-400">{syncResult.results.errors?.length || 0}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Verify Single Subscription */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Verify Single Subscription</h3>
          <p className="text-sm text-slate-400 mb-4">
            Check subscription status for a specific user by their email address.
          </p>

          <form onSubmit={verifySubscription} className="flex gap-3">
            <input
              type="email"
              value={verifyEmail}
              onChange={(e) => setVerifyEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={verifying || !verifyEmail.trim()}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {verifying ? 'Verifying...' : 'Verify'}
            </button>
          </form>

          {verifyResult && (
            <div className={`mt-4 p-4 rounded-lg ${verifyResult.hasActiveSubscription ? 'bg-emerald-900/20 border border-emerald-600/30' : 'bg-yellow-900/20 border border-yellow-600/30'}`}>
              <div className="flex items-center gap-2 mb-3">
                {verifyResult.hasActiveSubscription ? (
                  <>
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-300 font-medium">Active Subscription Found</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-yellow-300 font-medium">No Active Subscription</span>
                  </>
                )}
              </div>

              {verifyResult.subscriptions && verifyResult.subscriptions.length > 0 && (
                <div className="space-y-2">
                  {verifyResult.subscriptions.map((sub, idx) => (
                    <div key={idx} className="bg-slate-800/50 rounded p-3 text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-slate-200 font-medium">{sub.productName}</div>
                          <div className="text-slate-400">{sub.variantName}</div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          sub.status === 'active' ? 'bg-emerald-600/20 text-emerald-300' :
                          sub.status === 'on_trial' ? 'bg-blue-600/20 text-blue-300' :
                          'bg-slate-600/20 text-slate-300'
                        }`}>
                          {sub.statusFormatted || sub.status}
                        </span>
                      </div>
                      {sub.renewsAt && (
                        <div className="text-slate-500 text-xs mt-1">
                          Renews: {new Date(sub.renewsAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {verifyResult.error && (
                <p className="text-red-300">{verifyResult.error}</p>
              )}
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
                API-Based Verification
              </h3>
              <div className="text-emerald-200/80 space-y-2">
                <p>This feature uses the LemonSqueezy API to verify subscriptions directly, providing an alternative to webhook-based verification:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Use "Sync All" to batch update all subscription statuses</li>
                  <li>Use "Verify" to check a specific user's subscription status</li>
                  <li>Matches users by their email address in both systems</li>
                  <li>Requires LEMONSQUEEZY_API_KEY environment variable</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    {
      label: 'Plans',
      icon: '💳',
      content: <PlansManagement />
    },
    {
      label: 'Checkout Links',
      icon: '🔗',
      content: <CheckoutLinks />
    },
    {
      label: 'Sync Subscriptions',
      icon: '🔄',
      content: <SyncSubscriptions />
    }
  ];

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-100 mb-2">Payments Management</h1>
          <p className="text-slate-400">Manage subscription plans and checkout links in one place</p>
        </div>

        <TabNavigation tabs={tabs} />
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, data: null })}
        onConfirm={() => {
          deletePlan(confirmDialog.data);
          setConfirmDialog({ isOpen: false, data: null });
        }}
        title="Delete Plan"
        message="Are you sure you want to delete this plan? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </AdminLayout>
  );
}