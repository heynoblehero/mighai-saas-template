import { useState, useEffect } from 'react';
import CustomerLayout from '../../components/CustomerLayout';
import fs from 'fs';
import path from 'path';

export async function getServerSideProps() {
  // Check if there's a customized version of the billing page CONTENT ONLY
  try {
    const reservedPagePath = path.join(process.cwd(), 'data', 'reserved-pages', 'customer-billing.json');
    
    if (fs.existsSync(reservedPagePath)) {
      const data = fs.readFileSync(reservedPagePath, 'utf8');
      const reservedPage = JSON.parse(data);
      
      if (reservedPage.html_code) {
        // Return customized content to be rendered INSIDE CustomerLayout
        return {
          props: {
            useCustomContent: true,
            customContentHtml: reservedPage.html_code
          }
        };
      }
    }
  } catch (error) {
    console.error('Error checking for customized billing page:', error);
  }
  
  // Use default React component content
  return {
    props: {
      useCustomContent: false
    }
  };
}

export default function UpgradePlan({ useCustomContent, customContentHtml }) {
  const [plans, setPlans] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlans();
    fetchUserInfo();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans/public');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.filter(plan => plan.is_active && plan.price > 0));
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/subscribe/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    setUpgrading(true);
    setError('');

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan_id: planId })
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Lemon Squeezy checkout
        window.location.href = data.checkout_url;
      } else {
        setError(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <CustomerLayout title="Upgrade Plan">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading plans...</div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout title="Upgrade Your Plan">
      {useCustomContent && customContentHtml ? (
        <div dangerouslySetInnerHTML={{ __html: customContentHtml }} />
      ) : (
        <div className="space-y-6">
        {/* Current Plan */}
        {currentUser && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Current Plan: {currentUser.plan_name || 'Free'} Plan
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                <span className="font-medium">API Calls:</span> {currentUser.api_calls_used}/{currentUser.api_limit}
              </div>
              <div>
                <span className="font-medium">Page Views:</span> {currentUser.page_views_used}/{currentUser.page_view_limit}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Available Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="border border-gray-200 rounded-lg p-6 relative">
              {plan.name.toLowerCase() === 'pro' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-indigo-600 text-white px-3 py-1 text-xs font-semibold rounded-full">
                    POPULAR
                  </span>
                </div>
              )}
              
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 capitalize mb-2">
                  {plan.name} Plan
                </h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500">/month</span>
                </div>
                
                <ul className="space-y-3 mb-6 text-sm text-gray-600">
                  <li className="flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {plan.api_limit} API calls per month
                  </li>
                  <li className="flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {plan.page_view_limit} page views per month
                  </li>
                  <li className="flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Priority support
                  </li>
                  <li className="flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Cancel anytime
                  </li>
                </ul>
                
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={upgrading}
                  className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {upgrading ? 'Processing...' : `Upgrade to ${plan.name}`}
                </button>
              </div>
            </div>
          ))}
        </div>

        {plans.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">No upgrade plans available</div>
            <p className="text-sm text-gray-400 mt-2">
              Check back later or contact support for custom plans
            </p>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            How Billing Works
          </h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <svg className="w-4 h-4 text-gray-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Your usage counters reset at the start of each billing cycle
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 text-gray-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              You can upgrade or downgrade your plan anytime
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 text-gray-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Secure payments processed by Lemon Squeezy
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 text-gray-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No setup fees or hidden charges
            </li>
          </ul>
        </div>
        </div>
      )}
    </CustomerLayout>
  );
}