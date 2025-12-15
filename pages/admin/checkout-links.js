import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function CheckoutLinksManager() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingLinks, setGeneratingLinks] = useState({});
  const [checkoutLinks, setCheckoutLinks] = useState({});

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setPlans(data.filter(plan => plan.price > 0 && plan.is_active));
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      setPlans([]);
    } finally {
      setLoading(false);
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
      } else {
        alert(data.error || 'Failed to generate checkout link');
      }
    } catch (error) {
      alert('Network error occurred');
    } finally {
      setGeneratingLinks(prev => ({ ...prev, [planId]: false }));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Link copied to clipboard!');
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

  if (loading) {
    return (
      <AdminLayout title="Checkout Links">
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <div className="text-lg text-slate-300">Loading plans...</div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Checkout Links Manager">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Checkout Links Manager</h1>
          <p className="text-slate-400">
            Generate direct Lemon Squeezy checkout links that can be embedded in custom pricing pages or shared directly with customers.
          </p>
        </div>

        {plans.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400">No paid plans available</div>
            <p className="text-sm text-slate-500 mt-2">
              Create some paid plans first to generate checkout links
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {plans.map((plan) => (
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
    </AdminLayout>
  );
}