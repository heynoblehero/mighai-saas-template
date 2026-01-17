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
            Create products in Lemon Squeezy first
          </h3>
          <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
            <li>
              <a href="https://app.lemonsqueezy.com/products" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                Open Lemon Squeezy Products
              </a>
            </li>
            <li>Create a product for each paid plan (Pro, Enterprise)</li>
            <li>Copy the Product ID and Variant ID for each</li>
            <li>Enter them below</li>
          </ol>
        </div>

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
                      <p className="text-xs text-slate-400">Lemon Squeezy IDs (for paid plans)</p>
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
