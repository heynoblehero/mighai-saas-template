import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';

export default function ReservedPagesIndex() {
  const [rules, setRules] = useState({});
  const [reservedPages, setReservedPages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchRulesAndPages();
  }, []);

  const fetchRulesAndPages = async () => {
    try {
      // Fetch rules
      const rulesResponse = await fetch('/api/admin/reserved-pages?pageType=rules');
      const rulesData = await rulesResponse.json();
      
      if (rulesData.success) {
        setRules(rulesData.rules);
      }

      // Fetch existing reserved pages
      const pagesResponse = await fetch('/api/admin/reserved-pages');
      const pagesData = await pagesResponse.json();
      
      if (pagesData.success) {
        setReservedPages(pagesData.pages);
      }
    } catch (err) {
      setError('Failed to load reserved pages data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getPageStatus = (pageType) => {
    const page = reservedPages[pageType];
    if (!page) return { status: 'not-customized', color: 'gray' };
    
    const hoursSinceUpdate = (new Date() - new Date(page.lastModified)) / (1000 * 60 * 60);
    if (hoursSinceUpdate < 24) {
      return { status: 'recently-updated', color: 'green' };
    } else if (page.version > 1) {
      return { status: 'customized', color: 'blue' };
    } else {
      return { status: 'customized', color: 'blue' };
    }
  };

  const handleCustomizePage = (pageType) => {
    router.push(`/admin/reserved-pages/${pageType}`);
  };

  if (loading) {
    return (
      <AdminLayout title="Reserved Pages">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <div className="text-lg text-slate-300">Loading reserved pages...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const pageTypeMapping = {
    'landing-page': 'Landing Page',
    'customer-login': 'Customer Login Page',
    'customer-signup': 'Customer Signup Page', 
    'customer-dashboard': 'Customer Dashboard',
    'customer-profile': 'Customer Profile Page',
    'customer-billing': 'Billing & Upgrade Page',
    'password-reset': 'Password Reset Page',
    'customer-layout-sidebar': 'Customer Layout - Sidebar',
    'customer-layout-chat': 'Customer Layout - Chat',
    'customer-connections': 'OAuth Connections Page',
    'customer-ai-services': 'AI Services Page'
  };

  return (
    <AdminLayout title="Reserved Pages">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Reserved Pages</h1>
          <p className="text-slate-400 mt-1">
            Customize customer-facing pages while maintaining required functionality
          </p>
        </div>

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

        {/* Page Overview */}
        <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-emerald-300 mb-2">
                About Reserved Pages
              </h3>
              <div className="text-emerald-200/80 space-y-2">
                <p>• Reserved pages are customer-facing pages with predefined functionality requirements</p>
                <p>• You can customize the theme, styling, and layout while maintaining core features</p>
                <p>• AI will ensure all required elements and functionality are preserved</p>
                <p>• Changes are versioned and can be rolled back if needed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(pageTypeMapping).map(([pageType, displayName]) => {
            const rule = rules[pageType];
            const status = getPageStatus(pageType);
            const page = reservedPages[pageType];

            return (
              <div 
                key={pageType} 
                className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden hover:border-emerald-500 transition-colors"
              >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-200">{displayName}</h3>
                      <p className="text-slate-400 text-sm mt-1">
                        {rule?.description || 'Customer page customization'}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      status.color === 'green' 
                        ? 'bg-green-900/30 text-green-300 border border-green-600/30'
                        : status.color === 'blue'
                        ? 'bg-blue-900/30 text-blue-300 border border-blue-600/30' 
                        : 'bg-gray-900/30 text-gray-300 border border-gray-600/30'
                    }`}>
                      {status.status === 'not-customized' ? 'Default' : 
                       status.status === 'recently-updated' ? 'Updated' : 'Custom'}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {page && (
                    <div className="mb-4 space-y-2 text-sm text-slate-400">
                      <div>Version: {page.version}</div>
                      <div>Last modified: {new Date(page.lastModified).toLocaleDateString()}</div>
                    </div>
                  )}

                  {rule && (
                    <div className="mb-4">
                      <div className="text-xs text-slate-500 mb-2">Required elements:</div>
                      <div className="flex flex-wrap gap-1">
                        {rule.required_elements.slice(0, 4).map((element, index) => (
                          <span 
                            key={index} 
                            className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded"
                          >
                            {element.type}
                          </span>
                        ))}
                        {rule.required_elements.length > 4 && (
                          <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded">
                            +{rule.required_elements.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleCustomizePage(pageType)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    {page ? 'Edit Customization' : 'Customize Page'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Customization Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-200">
                {Object.keys(reservedPages).length}
              </div>
              <div className="text-sm text-slate-400">Pages Customized</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-200">
                {Object.keys(rules).length}
              </div>
              <div className="text-sm text-slate-400">Available Pages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-200">
                {Object.values(reservedPages).reduce((sum, page) => sum + (page?.version || 0), 0)}
              </div>
              <div className="text-sm text-slate-400">Total Versions</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}