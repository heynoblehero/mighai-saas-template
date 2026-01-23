import { useState, useEffect } from 'react';
import { useSetupWizard } from '../SetupWizardContext';

const DEFAULT_PLANS = [
  {
    name: 'Free',
    price: 0,
    api_limit: 100,
    page_view_limit: 1000,
    features: ['Basic features', 'Community support'],
    lemonsqueezy_product_id: '',
    lemonsqueezy_variant_id: ''
  },
  {
    name: 'Pro',
    price: 29,
    api_limit: 5000,
    page_view_limit: 50000,
    features: ['All Free features', 'Priority support', 'Advanced analytics'],
    lemonsqueezy_product_id: '',
    lemonsqueezy_variant_id: ''
  },
  {
    name: 'Enterprise',
    price: 99,
    api_limit: -1, // unlimited
    page_view_limit: -1, // unlimited
    features: ['All Pro features', 'Dedicated support', 'Custom integrations', 'SLA'],
    lemonsqueezy_product_id: '',
    lemonsqueezy_variant_id: ''
  }
];

export default function PlansSetupStep() {
  const { wizardState, updateState, isSaving } = useSetupWizard();

  const [plans, setPlans] = useState(wizardState?.plans_data?.length > 0 ? wizardState.plans_data : DEFAULT_PLANS);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [expandedPlan, setExpandedPlan] = useState(null);

  // LemonSqueezy products and variants state
  const [lsProducts, setLsProducts] = useState([]);
  const [lsVariants, setLsVariants] = useState({}); // { productId: [variants] }
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState({});
  const [lsError, setLsError] = useState(null);
  const [useManualEntry, setUseManualEntry] = useState(false);

  // Fetch LemonSqueezy products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    setLsError(null);

    // Get API key from wizard state
    const lsApiKey = wizardState?.lemonsqueezy_api_key;

    try {
      // Use POST with API key from wizard state, or GET to use env var
      const fetchOptions = lsApiKey
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: lsApiKey })
          }
        : { method: 'GET' };

      const response = await fetch('/api/admin/lemonsqueezy/products', fetchOptions);
      const data = await response.json();

      if (data.success && data.products) {
        setLsProducts(data.products);
        // If no products found, switch to manual entry
        if (data.products.length === 0) {
          setUseManualEntry(true);
        }
      } else if (data.error) {
        setLsError(data.message || data.error);
        setUseManualEntry(true);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setLsError('Failed to connect to LemonSqueezy');
      setUseManualEntry(true);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchVariants = async (productId) => {
    if (lsVariants[productId]) return; // Already fetched

    // Get API key from wizard state
    const lsApiKey = wizardState?.lemonsqueezy_api_key;

    setLoadingVariants(prev => ({ ...prev, [productId]: true }));
    try {
      // Use POST with API key from wizard state, or GET to use env var
      const fetchOptions = lsApiKey
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: lsApiKey, productId })
          }
        : { method: 'GET' };

      const url = lsApiKey
        ? '/api/admin/lemonsqueezy/variants'
        : `/api/admin/lemonsqueezy/variants?productId=${productId}`;

      const response = await fetch(url, fetchOptions);
      const data = await response.json();

      if (data.success && data.variants) {
        setLsVariants(prev => ({ ...prev, [productId]: data.variants }));
      }
    } catch (error) {
      console.error('Error fetching variants:', error);
    } finally {
      setLoadingVariants(prev => ({ ...prev, [productId]: false }));
    }
  };

  const handleProductChange = (planIndex, productId) => {
    const newPlans = [...plans];
    newPlans[planIndex] = {
      ...newPlans[planIndex],
      lemonsqueezy_product_id: productId,
      lemonsqueezy_variant_id: '' // Reset variant when product changes
    };
    setPlans(newPlans);

    // Fetch variants for this product
    if (productId) {
      fetchVariants(productId);
    }
  };

  const handleVariantChange = (planIndex, variantId) => {
    const newPlans = [...plans];
    const selectedVariant = Object.values(lsVariants)
      .flat()
      .find(v => v.id === variantId);

    newPlans[planIndex] = {
      ...newPlans[planIndex],
      lemonsqueezy_variant_id: variantId,
      // Auto-fill price from variant if available
      price: selectedVariant?.price ? selectedVariant.price / 100 : newPlans[planIndex].price
    };
    setPlans(newPlans);
  };

  const updatePlan = (index, field, value) => {
    const newPlans = [...plans];
    newPlans[index] = { ...newPlans[index], [field]: value };
    setPlans(newPlans);
  };

  const savePlans = async () => {
    setSaving(true);
    setSaveResult(null);

    try {
      // Save each plan to the database
      for (const plan of plans) {
        const response = await fetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: plan.name.toLowerCase(),
            api_limit: plan.api_limit,
            page_view_limit: plan.page_view_limit,
            price: plan.price,
            lemonsqueezy_product_id: plan.lemonsqueezy_product_id || null,
            lemonsqueezy_variant_id: plan.lemonsqueezy_variant_id || null
          })
        });

        if (!response.ok) {
          // Plan might already exist, try updating
          await fetch(`/api/plans/${plan.name.toLowerCase()}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_limit: plan.api_limit,
              page_view_limit: plan.page_view_limit,
              price: plan.price,
              lemonsqueezy_product_id: plan.lemonsqueezy_product_id || null,
              lemonsqueezy_variant_id: plan.lemonsqueezy_variant_id || null
            })
          });
        }
      }

      // Update wizard state
      await updateState({
        plans_configured: true,
        plans_data: plans
      });

      setSaveResult({ success: true, message: 'Plans saved successfully!' });
    } catch (error) {
      console.error('Error saving plans:', error);
      setSaveResult({ success: false, message: 'Failed to save plans' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Plans Setup</h2>
        <p className="text-slate-400">Configure your subscription tiers and connect them to Lemon Squeezy.</p>
      </div>

      <div className="space-y-6">
        {/* Instructions */}
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <h3 className="font-medium text-yellow-400 mb-2 flex items-center gap-2">
            <span>🍋</span>
            Connect to Lemon Squeezy
          </h3>
          {loadingProducts ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin"></div>
              Loading your LemonSqueezy products...
            </div>
          ) : lsProducts.length > 0 ? (
            <div className="text-sm text-slate-400 space-y-2">
              <p className="text-emerald-400">✓ Connected! Found {lsProducts.length} product(s) in your store.</p>
              <p>Select a product and variant for each paid plan below.</p>
              <button
                type="button"
                onClick={() => setUseManualEntry(!useManualEntry)}
                className="text-xs text-slate-500 hover:text-slate-400 underline"
              >
                {useManualEntry ? 'Use dropdown selection' : 'Enter IDs manually instead'}
              </button>
            </div>
          ) : (
            <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
              <li>
                <a href="https://app.lemonsqueezy.com/products" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                  Open Lemon Squeezy Products
                </a>
              </li>
              <li>Create a product for each paid plan (Pro, Enterprise)</li>
              <li>
                {lsError ? (
                  <span className="text-red-400">{lsError}. </span>
                ) : null}
                Enter the IDs manually below, or{' '}
                <button
                  type="button"
                  onClick={fetchProducts}
                  className="text-emerald-400 hover:text-emerald-300 underline"
                >
                  retry fetching products
                </button>
              </li>
            </ol>
          )}
        </div>

        {/* How Payments Work Guide */}
        <details className="bg-slate-800/50 border border-slate-700 rounded-xl group">
          <summary className="px-4 py-3 cursor-pointer text-emerald-400 font-medium flex items-center justify-between hover:bg-slate-800/80 transition-colors rounded-xl">
            <span className="flex items-center gap-2">
              <span>📖</span>
              How Payments Work (Click to learn more)
            </span>
            <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-4 pb-4 pt-2 space-y-4 text-sm border-t border-slate-700">
            {/* Overview */}
            <div>
              <h4 className="text-white font-medium mb-2">Overview</h4>
              <p className="text-slate-400">
                This template uses LemonSqueezy for payment processing. Users sign up on your site,
                then upgrade their plan through LemonSqueezy's secure checkout. After payment,
                their account is automatically upgraded.
              </p>
            </div>

            {/* Setup Steps */}
            <div>
              <h4 className="text-white font-medium mb-2">Setup Steps</h4>
              <ol className="text-slate-400 space-y-1 list-decimal list-inside">
                <li>Create products in your <a href="https://app.lemonsqueezy.com/products" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">LemonSqueezy dashboard</a></li>
                <li>Select products via dropdowns above (or enter IDs manually)</li>
                <li>Set your API limits and pricing for each plan</li>
                <li>Configure your webhook URL in LemonSqueezy (see below)</li>
              </ol>
            </div>

            {/* Customer Flow */}
            <div>
              <h4 className="text-white font-medium mb-2">Customer Flow</h4>
              <div className="flex items-center gap-2 text-slate-400 flex-wrap">
                <span className="bg-slate-700 px-2 py-1 rounded">Sign Up</span>
                <span>→</span>
                <span className="bg-slate-700 px-2 py-1 rounded">Select Plan</span>
                <span>→</span>
                <span className="bg-slate-700 px-2 py-1 rounded">LemonSqueezy Checkout</span>
                <span>→</span>
                <span className="bg-emerald-600/30 text-emerald-300 px-2 py-1 rounded">Account Upgraded</span>
              </div>
            </div>

            {/* Webhook Setup */}
            <div>
              <h4 className="text-white font-medium mb-2">Webhook Configuration</h4>
              <p className="text-slate-400 mb-2">
                In your LemonSqueezy dashboard, go to Settings → Webhooks and add:
              </p>
              <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400">{typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/lemonsqueezy-webhook</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/lemonsqueezy-webhook`);
                    }}
                    className="text-slate-400 hover:text-white text-xs ml-2"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <p className="text-slate-500 text-xs mt-2">
                Enable events: <code className="text-slate-400">order_created</code>, <code className="text-slate-400">subscription_payment_success</code>, <code className="text-slate-400">subscription_cancelled</code>
              </p>
            </div>

            {/* Environment Variables */}
            <div>
              <h4 className="text-white font-medium mb-2">Required Environment Variables</h4>
              <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs space-y-1">
                <div><span className="text-purple-400">LEMONSQUEEZY_API_KEY</span>=<span className="text-slate-500">your_api_key</span></div>
                <div><span className="text-purple-400">LEMONSQUEEZY_STORE_ID</span>=<span className="text-slate-500">your_store_id</span></div>
                <div><span className="text-purple-400">LEMONSQUEEZY_WEBHOOK_SECRET</span>=<span className="text-slate-500">your_webhook_secret</span></div>
              </div>
            </div>

            {/* Troubleshooting */}
            <div>
              <h4 className="text-white font-medium mb-2">Troubleshooting</h4>
              <ul className="text-slate-400 space-y-1 list-disc list-inside">
                <li>If webhooks fail, use <strong className="text-slate-300">Payments → Sync Subscriptions</strong> in admin to manually sync</li>
                <li>Verify your API key is set correctly in environment variables</li>
                <li>Check webhook logs in LemonSqueezy dashboard for errors</li>
              </ul>
            </div>
          </div>
        </details>

        {/* Plans list */}
        <div className="space-y-4">
          {plans.map((plan, index) => (
            <div
              key={index}
              className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden"
            >
              {/* Plan header */}
              <button
                onClick={() => setExpandedPlan(expandedPlan === index ? null : index)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/80 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    index === 0 ? 'bg-slate-600' : index === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {index === 0 ? '🆓' : index === 1 ? '⭐' : '💎'}
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-white">{plan.name}</h3>
                    <p className="text-sm text-slate-400">
                      ${plan.price}/mo • {plan.api_limit === -1 ? 'Unlimited' : plan.api_limit} API calls
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform ${expandedPlan === index ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded content */}
              {expandedPlan === index && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-700 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Price ($/mo)</label>
                      <input
                        type="number"
                        value={plan.price}
                        onChange={(e) => updatePlan(index, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">API Limit (-1 = unlimited)</label>
                      <input
                        type="number"
                        value={plan.api_limit}
                        onChange={(e) => updatePlan(index, 'api_limit', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Page View Limit (-1 = unlimited)</label>
                    <input
                      type="number"
                      value={plan.page_view_limit}
                      onChange={(e) => updatePlan(index, 'page_view_limit', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {plan.price > 0 && (
                    <div className="pt-2 border-t border-slate-700/50 space-y-3">
                      <p className="text-xs text-slate-400">Lemon Squeezy Connection (for paid plans)</p>

                      {/* Dropdown Selection Mode */}
                      {!useManualEntry && lsProducts.length > 0 ? (
                        <div className="space-y-3">
                          {/* Product Dropdown */}
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Select Product</label>
                            <select
                              value={plan.lemonsqueezy_product_id || ''}
                              onChange={(e) => handleProductChange(index, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="">-- Select a product --</option>
                              {lsProducts.map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.name} {product.priceFormatted ? `(${product.priceFormatted})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Variant Dropdown */}
                          {plan.lemonsqueezy_product_id && (
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Select Variant</label>
                              {loadingVariants[plan.lemonsqueezy_product_id] ? (
                                <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                                  <div className="w-3 h-3 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin"></div>
                                  Loading variants...
                                </div>
                              ) : (
                                <select
                                  value={plan.lemonsqueezy_variant_id || ''}
                                  onChange={(e) => handleVariantChange(index, e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                  <option value="">-- Select a variant --</option>
                                  {(lsVariants[plan.lemonsqueezy_product_id] || []).map(variant => (
                                    <option key={variant.id} value={variant.id}>
                                      {variant.name} - {variant.priceFormatted}
                                      {variant.interval ? ` / ${variant.interval}` : ' (one-time)'}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          )}

                          {/* Show selected IDs for reference */}
                          {plan.lemonsqueezy_variant_id && (
                            <p className="text-xs text-slate-500">
                              Product ID: {plan.lemonsqueezy_product_id} | Variant ID: {plan.lemonsqueezy_variant_id}
                            </p>
                          )}
                        </div>
                      ) : (
                        /* Manual Entry Mode */
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Product ID</label>
                            <input
                              type="text"
                              value={plan.lemonsqueezy_product_id}
                              onChange={(e) => updatePlan(index, 'lemonsqueezy_product_id', e.target.value)}
                              placeholder="123456"
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Variant ID</label>
                            <input
                              type="text"
                              value={plan.lemonsqueezy_variant_id}
                              onChange={(e) => updatePlan(index, 'lemonsqueezy_variant_id', e.target.value)}
                              placeholder="789012"
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Save button */}
        <button
          onClick={savePlans}
          disabled={saving}
          className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Saving Plans...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Plans
            </>
          )}
        </button>

        {/* Result */}
        {saveResult && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${saveResult.success ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
            {saveResult.success ? (
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={saveResult.success ? 'text-emerald-400' : 'text-red-400'}>
              {saveResult.message}
            </span>
          </div>
        )}

        {/* Already configured */}
        {wizardState?.plans_configured && !saveResult && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-emerald-400">Plans already configured</span>
          </div>
        )}
      </div>
    </div>
  );
}
