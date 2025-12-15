import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function PricingTableManager() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pricingTableConfig, setPricingTableConfig] = useState({
    title: 'Choose Your Plan',
    subtitle: 'Select the perfect plan for your needs',
    customCss: '',
    showFeatures: true,
    allowPromoCodes: true
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setPlans(data.filter(plan => plan.is_active));
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const generatePricingTableCode = () => {
    const lemonSqueezyVariantIds = plans
      .filter(plan => plan.lemonsqueezy_variant_id)
      .map(plan => plan.lemonsqueezy_variant_id);

    if (lemonSqueezyVariantIds.length === 0) {
      return 'No Lemon Squeezy variant IDs found. Create paid plans first.';
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pricingTableConfig.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 40px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            text-align: center;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            color: white;
            margin-bottom: 40px;
        }
        .header h1 {
            font-size: 3rem;
            font-weight: 700;
            margin: 0 0 16px 0;
        }
        .header p {
            font-size: 1.25rem;
            opacity: 0.9;
            margin: 0;
        }
        .notice {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 20px;
            color: white;
            margin: 20px 0;
        }
        ${pricingTableConfig.customCss}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${pricingTableConfig.title}</h1>
            <p>${pricingTableConfig.subtitle}</p>
        </div>
        
        <div class="notice">
            <h3>Lemon Squeezy Integration</h3>
            <p>Lemon Squeezy doesn't provide embedded pricing tables like Stripe.</p>
            <p>Please use the Custom HTML Pricing Page option below for a complete pricing solution.</p>
        </div>
    </div>
</body>
</html>`;
  };

  const generateBasicPricingPage = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pricingTableConfig.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8fafc;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 60px 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 60px;
        }
        .header h1 {
            font-size: 3rem;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 16px;
        }
        .header p {
            font-size: 1.25rem;
            color: #718096;
        }
        .pricing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            max-width: 1000px;
            margin: 0 auto;
        }
        .plan-card {
            background: white;
            border-radius: 12px;
            padding: 40px 30px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
            position: relative;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .plan-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
        }
        .plan-card.featured {
            border: 2px solid #4f46e5;
            transform: scale(1.05);
        }
        .plan-card.featured::before {
            content: 'POPULAR';
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            background: #4f46e5;
            color: white;
            padding: 6px 20px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .plan-name {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1a202c;
            margin-bottom: 8px;
            text-transform: capitalize;
        }
        .plan-price {
            font-size: 3rem;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 8px;
        }
        .plan-period {
            color: #718096;
            margin-bottom: 30px;
        }
        .plan-features {
            list-style: none;
            margin-bottom: 40px;
        }
        .plan-features li {
            padding: 8px 0;
            display: flex;
            align-items: center;
        }
        .plan-features li::before {
            content: '✓';
            color: #10b981;
            font-weight: bold;
            margin-right: 12px;
            font-size: 1.2rem;
        }
        .plan-button {
            width: 100%;
            padding: 16px 24px;
            background: #4f46e5;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
            text-decoration: none;
            display: inline-block;
            text-align: center;
        }
        .plan-button:hover {
            background: #4338ca;
        }
        .plan-card.free .plan-button {
            background: #6b7280;
        }
        .plan-card.free .plan-button:hover {
            background: #4b5563;
        }
        ${pricingTableConfig.customCss}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${pricingTableConfig.title}</h1>
            <p>${pricingTableConfig.subtitle}</p>
        </div>
        
        <div class="pricing-grid">
            ${plans.map((plan, index) => `
            <div class="plan-card ${plan.name.toLowerCase() === 'pro' ? 'featured' : ''} ${plan.price === 0 ? 'free' : ''}">
                <div class="plan-name">${plan.name}</div>
                <div class="plan-price">$${plan.price}</div>
                <div class="plan-period">per month</div>
                
                <ul class="plan-features">
                    <li>${plan.api_limit} API calls per month</li>
                    <li>${plan.page_view_limit} page views per month</li>
                    <li>24/7 support</li>
                    <li>Cancel anytime</li>
                </ul>
                
                ${plan.price > 0 ? 
                    `<a href="/api/checkout-link/${plan.id}" class="plan-button">
                        Subscribe to ${plan.name}
                    </a>` : 
                    `<a href="/subscribe/signup" class="plan-button">
                        Get Started Free
                    </a>`
                }
            </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Code copied to clipboard!');
    });
  };

  if (loading) {
    return (
      <AdminLayout title="Pricing Table">
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <div className="text-lg text-slate-300">Loading...</div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Pricing Table Generator">
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Pricing Table Generator</h1>
          <p className="text-slate-400">
            Generate customizable pricing tables or create a custom HTML pricing page. Note: Lemon Squeezy does not have an embedded pricing table widget like Stripe.
          </p>
        </div>

        {/* Configuration */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Pricing Table Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
              <input
                type="text"
                value={pricingTableConfig.title}
                onChange={(e) => setPricingTableConfig(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Subtitle</label>
              <input
                type="text"
                value={pricingTableConfig.subtitle}
                onChange={(e) => setPricingTableConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Custom CSS</label>
            <textarea
              value={pricingTableConfig.customCss}
              onChange={(e) => setPricingTableConfig(prev => ({ ...prev, customCss: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
              placeholder="Add custom CSS styles here..."
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={pricingTableConfig.allowPromoCodes}
                onChange={(e) => setPricingTableConfig(prev => ({ ...prev, allowPromoCodes: e.target.checked }))}
                className="mr-2"
              />
              Allow promotion codes
            </label>
          </div>
        </div>

        {/* Generated Code Options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lemon Squeezy Pricing Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-100">Lemon Squeezy Pricing Page</h3>
              <button
                onClick={() => copyToClipboard(generatePricingTableCode())}
                className="px-3 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm"
              >
                Copy Code
              </button>
            </div>
            <pre className="bg-slate-900 text-emerald-400 border border-slate-700 p-4 rounded-md text-xs overflow-x-auto max-h-96">
              <code>{generatePricingTableCode()}</code>
            </pre>
          </div>

          {/* Custom HTML Pricing Page */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-100">Custom HTML Pricing Page</h3>
              <button
                onClick={() => copyToClipboard(generateBasicPricingPage())}
                className="px-3 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm"
              >
                Copy Code
              </button>
            </div>
            <pre className="bg-slate-900 text-emerald-400 border border-slate-700 p-4 rounded-md text-xs overflow-x-auto max-h-96">
              <code>{generateBasicPricingPage()}</code>
            </pre>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-md p-6">
          <h4 className="text-lg font-semibold text-emerald-300 mb-4">Setup Instructions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-semibold text-emerald-200/80 mb-2">Lemon Squeezy Pricing:</h5>
              <ol className="text-sm text-emerald-200/80 list-decimal list-inside space-y-1">
                <li>Lemon Squeezy doesn't have embedded pricing tables</li>
                <li>Use the custom HTML pricing page instead</li>
                <li>Checkout links redirect directly to Lemon Squeezy</li>
                <li>All checkout handling is done server-side</li>
                <li>No additional client-side setup required</li>
              </ol>
            </div>
            <div>
              <h5 className="font-semibold text-emerald-200/80 mb-2">Custom HTML Page:</h5>
              <ol className="text-sm text-emerald-200/80 list-decimal list-inside space-y-1">
                <li>Copy the generated HTML code</li>
                <li>Save as an HTML file or create as a page</li>
                <li>Customize styles and content as needed</li>
                <li>Checkout links automatically redirect to Lemon Squeezy</li>
                <li>No additional setup required</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}