import { useState, useEffect } from 'react';
import { useSetupWizard } from '../SetupWizardContext';

export default function PaymentKeysStep() {
  const { wizardState, updateState, isSaving } = useSetupWizard();

  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(wizardState?.payment_api_key_configured || false);
  const [storeId, setStoreId] = useState(wizardState?.lemonsqueezy_store_id || '');
  const [verifyError, setVerifyError] = useState(null);

  // Products state
  const [products, setProducts] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState({}); // variantId -> { product, variant, apiLimit, pageViewLimit }

  // Saving state
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  // Load existing plans if already configured
  useEffect(() => {
    if (wizardState?.plans_configured && wizardState?.plans_data) {
      // Pre-select variants from existing plans
      const existingSelections = {};
      wizardState.plans_data.forEach(plan => {
        if (plan.lemonsqueezy_variant_id) {
          existingSelections[plan.lemonsqueezy_variant_id] = {
            product: { id: plan.lemonsqueezy_product_id, name: plan.name },
            variant: { id: plan.lemonsqueezy_variant_id, price: plan.price * 100 },
            apiLimit: plan.api_limit || 5000,
            pageViewLimit: plan.page_view_limit || 50000
          };
        }
      });
      setSelectedVariants(existingSelections);
    }
  }, [wizardState?.plans_configured, wizardState?.plans_data]);

  // Verify API Key and fetch products
  const verifyApiKey = async () => {
    if (!apiKey.trim()) {
      setVerifyError('Please enter an API key');
      return;
    }

    setVerifying(true);
    setVerifyError(null);

    try {
      const response = await fetch('/api/admin/lemonsqueezy/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setVerifyError(data.error || 'Verification failed');
        return;
      }

      // Save to wizard state
      await updateState({
        lemonsqueezy_api_key: apiKey,
        lemonsqueezy_store_id: data.storeId?.toString() || '',
        payment_api_key_configured: true
      });

      setVerified(true);
      setStoreId(data.storeId);
      setProducts(data.products || []);
    } catch (error) {
      setVerifyError('Failed to verify API key. Please check your connection.');
    } finally {
      setVerifying(false);
    }
  };

  // Toggle variant selection
  const toggleVariant = (product, variant) => {
    const key = variant.id;
    setSelectedVariants(prev => {
      if (prev[key]) {
        const { [key]: removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [key]: {
          product,
          variant,
          apiLimit: 5000,
          pageViewLimit: 50000
        }
      };
    });
  };

  // Update API limits for a variant
  const updateLimits = (variantId, field, value) => {
    setSelectedVariants(prev => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        [field]: parseInt(value) || 0
      }
    }));
  };

  // Save plans
  const savePlans = async () => {
    if (Object.keys(selectedVariants).length === 0) {
      setSaveResult({ success: false, message: 'Please select at least one product variant' });
      return;
    }

    setSaving(true);
    setSaveResult(null);

    try {
      const plansData = [];

      for (const [variantId, config] of Object.entries(selectedVariants)) {
        // Create plan name from product + variant
        const planName = config.variant.name && config.variant.name !== 'Default'
          ? `${config.product.name} ${config.variant.name}`.toLowerCase().replace(/\s+/g, '_')
          : config.product.name.toLowerCase().replace(/\s+/g, '_');

        const planData = {
          name: planName,
          price: (config.variant.price || 0) / 100, // cents to dollars
          lemonsqueezy_product_id: config.product.id,
          lemonsqueezy_variant_id: variantId,
          api_limit: config.apiLimit,
          page_view_limit: config.pageViewLimit
        };

        // Save to database
        const response = await fetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(planData)
        });

        if (!response.ok) {
          // Try updating if plan already exists
          await fetch(`/api/plans/${planName}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(planData)
          });
        }

        plansData.push({
          ...planData,
          lemonsqueezy_variant_id: variantId
        });
      }

      // Update wizard state
      await updateState({
        plans_configured: true,
        plans_data: plansData
      });

      setSaveResult({
        success: true,
        message: `${plansData.length} plan(s) configured successfully!`
      });
    } catch (error) {
      console.error('Error saving plans:', error);
      setSaveResult({ success: false, message: 'Failed to save plans' });
    } finally {
      setSaving(false);
    }
  };

  // Format price from cents
  const formatPrice = (cents, interval) => {
    const dollars = (cents || 0) / 100;
    const suffix = interval === 'month' ? '/mo' : interval === 'year' ? '/yr' : '';
    return `$${dollars.toFixed(2)}${suffix}`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Payment & Plans Setup</h2>
        <p className="text-slate-400">Connect LemonSqueezy and configure your subscription plans.</p>
      </div>

      <div className="space-y-6">
        {/* Step 1: API Key Verification */}
        <div className="p-5 bg-slate-800/50 rounded-xl border border-slate-700">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🍋</span>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white mb-1">LemonSqueezy API Key</h3>
              <p className="text-sm text-slate-400">
                Get your API key from{' '}
                <a
                  href="https://app.lemonsqueezy.com/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  LemonSqueezy Settings → API
                </a>
              </p>
            </div>
          </div>

          {!verified ? (
            <div className="space-y-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="eyJ..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
              />
              <button
                onClick={verifyApiKey}
                disabled={verifying || !apiKey.trim()}
                className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Verify & Load Products
                  </>
                )}
              </button>
              {verifyError && (
                <p className="text-red-400 text-sm">{verifyError}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div className="flex-1">
                <span className="text-emerald-400">API Key Verified</span>
                {storeId && <span className="text-slate-500 text-sm ml-2">Store ID: {storeId}</span>}
              </div>
              <button
                onClick={() => {
                  setVerified(false);
                  setProducts([]);
                  setSelectedVariants({});
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Product Selection */}
        {verified && products.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Select Products & Variants</h3>
            <p className="text-sm text-slate-400">
              Choose which LemonSqueezy products to enable as subscription plans.
            </p>

            {products.map(product => (
              <div key={product.id} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-sm">📦</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-white">{product.name}</h4>
                    {product.description && (
                      <p className="text-xs text-slate-500">{product.description}</p>
                    )}
                  </div>
                </div>

                {product.variants && product.variants.length > 0 ? (
                  <div className="space-y-2 pl-11">
                    {product.variants.map(variant => {
                      const isSelected = !!selectedVariants[variant.id];
                      return (
                        <div
                          key={variant.id}
                          className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                          }`}
                          onClick={() => toggleVariant(product, variant)}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleVariant(product, variant)}
                              className="w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 bg-slate-800"
                            />
                            <div className="flex-1">
                              <span className="text-white">{variant.name || 'Default'}</span>
                              <span className="text-emerald-400 ml-2 font-medium">
                                {formatPrice(variant.price, variant.interval)}
                              </span>
                              {variant.isSubscription && (
                                <span className="text-slate-500 text-xs ml-2">
                                  ({variant.interval || 'subscription'})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* API Limits (only show when selected) */}
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-2 gap-3" onClick={e => e.stopPropagation()}>
                              <div>
                                <label className="block text-xs text-slate-400 mb-1">API Limit</label>
                                <input
                                  type="number"
                                  value={selectedVariants[variant.id]?.apiLimit || 5000}
                                  onChange={(e) => updateLimits(variant.id, 'apiLimit', e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  placeholder="-1 for unlimited"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-400 mb-1">Page View Limit</label>
                                <input
                                  type="number"
                                  value={selectedVariants[variant.id]?.pageViewLimit || 50000}
                                  onChange={(e) => updateLimits(variant.id, 'pageViewLimit', e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  placeholder="-1 for unlimited"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm pl-11">No variants found for this product.</p>
                )}
              </div>
            ))}

            {/* Selection Summary */}
            {Object.keys(selectedVariants).length > 0 && (
              <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <h4 className="text-sm font-medium text-slate-300 mb-2">
                  Selected Plans ({Object.keys(selectedVariants).length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedVariants).map(([variantId, config]) => (
                    <span
                      key={variantId}
                      className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-sm text-emerald-400"
                    >
                      {config.product.name} {config.variant.name !== 'Default' ? config.variant.name : ''} - {formatPrice(config.variant.price, config.variant.interval)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={savePlans}
              disabled={saving || Object.keys(selectedVariants).length === 0}
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
                  Save & Configure Plans
                </>
              )}
            </button>
          </div>
        )}

        {/* No products message */}
        {verified && products.length === 0 && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400">
              No products found in your LemonSqueezy store.{' '}
              <a
                href="https://app.lemonsqueezy.com/products"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-yellow-300"
              >
                Create a product first
              </a>
              , then come back here.
            </p>
          </div>
        )}

        {/* Save Result */}
        {saveResult && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            saveResult.success
              ? 'bg-emerald-500/10 border border-emerald-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}>
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

        {/* Already configured indicator */}
        {wizardState?.plans_configured && !saveResult && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-emerald-400">Payment & Plans already configured</span>
          </div>
        )}
      </div>
    </div>
  );
}
