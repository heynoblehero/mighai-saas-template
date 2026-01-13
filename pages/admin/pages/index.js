import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '../../../components/AdminLayout';

export default function UnifiedPagesAdmin() {
  const [pages, setPages] = useState([]);
  const [reservedPages, setReservedPages] = useState({});
  const [rules, setRules] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'regular', 'reserved'
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllPages();
  }, []);

  const fetchAllPages = async () => {
    try {
      // Fetch regular pages
      const pagesResponse = await fetch('/api/pages');
      const pagesData = await pagesResponse.json();

      // Fetch reserved pages
      const reservedPagesResponse = await fetch('/api/admin/reserved-pages');
      const reservedPagesData = await reservedPagesResponse.json();

      // Fetch rules for reserved pages
      const rulesResponse = await fetch('/api/admin/reserved-pages?pageType=rules');
      const rulesData = await rulesResponse.json();

      // Ensure data is valid
      if (Array.isArray(pagesData)) {
        setPages(pagesData);
      } else {
        console.error('Pages data is not an array:', pagesData);
        setPages([]);
      }

      if (reservedPagesData.success) {
        setReservedPages(reservedPagesData.pages);
      } else {
        console.error('Reserved pages data error:', reservedPagesData);
        setReservedPages({});
      }

      if (rulesData.success) {
        setRules(rulesData.rules);
      } else {
        console.error('Rules data error:', rulesData);
        setRules({});
      }
    } catch (error) {
      console.error('Failed to fetch pages:', error);
      setError('Failed to load pages data');
    } finally {
      setLoading(false);
    }
  };

  const deletePage = async (id) => {
    if (!confirm('Are you sure you want to delete this page?')) return;

    try {
      const response = await fetch(`/api/pages/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setPages(pages.filter(page => page.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete page:', error);
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

  const getLivePageUrl = (pageType) => {
    const urlMap = {
      'customer-login': '/customer/login',
      'customer-signup': '/customer/signup',
      'customer-dashboard': '/customer/dashboard',
      'customer-profile': '/customer/profile',
      'customer-billing': '/customer/billing',
      'password-reset': '/customer/reset-password',
      'customer-connections': '/customer/connections',
      'customer-ai-services': '/customer/ai-services',
      'landing-page': '/'
    };
    return urlMap[pageType] || '/';
  };

  // Combine regular and reserved pages
  const allPages = [
    ...pages.map(page => ({
      ...page,
      type: 'regular',
      id: page.id,
      title: page.title,
      slug: page.slug,
      is_published: page.is_published,
      access_level: page.access_level,
      created_at: page.created_at
    })),
    ...Object.entries(reservedPages).map(([pageType, pageData]) => ({
      type: 'reserved',
      id: pageType,
      title: pageTypeMapping[pageType] || pageType,
      slug: pageType,
      is_published: true, // Reserved pages are always considered published when customized
      access_level: 'public',
      created_at: pageData.lastModified,
      version: pageData.version,
      deployed: pageData.deployed
    }))
  ];

  const filteredPages = activeTab === 'all' 
    ? allPages 
    : activeTab === 'regular' 
      ? allPages.filter(page => page.type === 'regular') 
      : allPages.filter(page => page.type === 'reserved');

  filteredPages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (loading) {
    return (
      <AdminLayout title="Pages Management">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <div className="text-lg text-slate-300">Loading pages...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Pages Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Pages Management</h1>
            <p className="text-slate-400 mt-1">Create and manage your website pages</p>
          </div>
          
          {/* Create Page Button */}
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <Link
              href="/admin/pages/new"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Create Regular Page</span>
            </Link>
            
            <Link
              href="/admin/pages"
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Customize Reserved Pages</span>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
            onClick={() => setActiveTab('all')}
          >
            All Pages ({allPages.length})
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'regular'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
            onClick={() => setActiveTab('regular')}
          >
            Regular Pages ({pages.length})
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'reserved'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
            onClick={() => setActiveTab('reserved')}
          >
            Reserved Pages ({Object.keys(reservedPages).length})
          </button>
        </div>

        {/* Pages Table */}
        <div className="bg-slate-800 border border-slate-700 shadow-xl rounded-xl overflow-hidden">
          {filteredPages.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">
                {activeTab === 'regular' ? '📄' : activeTab === 'reserved' ? '⚙️' : '🌐'}
              </div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                {activeTab === 'regular' 
                  ? 'No regular pages created yet' 
                  : activeTab === 'reserved' 
                    ? 'No reserved pages customized yet' 
                    : 'No pages found'}
              </h3>
              <p className="text-slate-400 mb-6">
                {activeTab === 'regular' 
                  ? 'Start building your website with custom pages'
                  : activeTab === 'reserved' 
                    ? 'Customize customer-facing pages with required functionality'
                    : 'Create regular pages or customize reserved pages'}
              </p>
              
              {activeTab === 'regular' ? (
                <Link
                  href="/admin/pages/new"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Create your first regular page</span>
                </Link>
              ) : activeTab === 'reserved' ? (
                <Link
                  href="/admin/pages"
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Customize reserved pages</span>
                </Link>
              ) : (
                <div className="flex space-x-4 justify-center">
                  <Link
                    href="/admin/pages/new"
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create Regular Page</span>
                  </Link>
                  <Link
                    href="/admin/pages"
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Customize Reserved Page</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Access
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800 divide-y divide-slate-700">
                  {filteredPages.map((page, index) => (
                    <tr
                      key={page.id}
                      className="hover:bg-slate-700/50 transition-colors"
                      style={{
                        animationDelay: `${index * 100}ms`,
                        animation: 'fadeInUp 0.5s ease-out forwards'
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-semibold text-slate-200">
                          {page.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-sm font-medium rounded-full ${
                          page.type === 'regular'
                            ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-600/30'
                            : 'bg-purple-900/30 text-purple-300 border border-purple-600/30'
                        }`}>
                          {page.type === 'regular' ? 'Regular' : 'Reserved'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-slate-300 font-mono text-sm">
                          {page.type === 'regular' ? `/${page.slug}` : page.slug}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {page.type === 'regular' ? (
                          <span className={`px-3 py-1 inline-flex text-sm font-medium rounded-full ${
                            page.is_published
                              ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-600/30'
                              : 'bg-yellow-900/30 text-yellow-300 border border-yellow-600/30'
                          }`}>
                            {page.is_published ? 'Published' : 'Draft'}
                          </span>
                        ) : (
                          <span className={`px-3 py-1 inline-flex text-sm font-medium rounded-full ${
                            getPageStatus(page.id).color === 'green'
                              ? 'bg-green-900/30 text-green-300 border border-green-600/30'
                              : getPageStatus(page.id).color === 'blue'
                              ? 'bg-blue-900/30 text-blue-300 border border-blue-600/30'
                              : 'bg-gray-900/30 text-gray-300 border border-gray-600/30'
                          }`}>
                            {getPageStatus(page.id).status === 'not-customized' ? 'Default' :
                             getPageStatus(page.id).status === 'recently-updated' ? 'Updated' : 'Custom'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-sm font-medium rounded-full ${
                          page.access_level === 'subscriber'
                            ? 'bg-purple-900/30 text-purple-300 border border-purple-600/30'
                            : 'bg-blue-900/30 text-blue-300 border border-blue-600/30'
                        }`}>
                          {page.access_level === 'subscriber' ? 'Subscribers' : 'Public'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-slate-300">
                          {new Date(page.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          {page.type === 'regular' ? (
                            <>
                              {page.is_published && (
                                <a
                                  href={`/${page.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-colors flex items-center gap-1.5 border border-blue-600/30"
                                  title="View published page"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  View
                                </a>
                              )}
                              <Link
                                href={`/admin/pages/edit/${page.id}`}
                                className="text-emerald-400 hover:text-emerald-300 transition-colors"
                              >
                                Edit
                              </Link>
                              <button
                                onClick={() => deletePage(page.id)}
                                className="text-red-400 hover:text-red-300 transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              {page.deployed && (
                                <a
                                  href={getLivePageUrl(page.id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-colors flex items-center gap-1.5 border border-blue-600/30"
                                  title="View live page"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  View
                                </a>
                              )}
                              <Link
                                href={`/admin/reserved-pages/${page.id}`}
                                className="text-purple-400 hover:text-purple-300 transition-colors"
                              >
                                Customize
                              </Link>
                            </>
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
                Page Management Tips
              </h3>
              <div className="text-emerald-200/80 space-y-2">
                <p>• Regular pages: Create custom pages with full control over content and design</p>
                <p>• Reserved pages: Customize customer-facing pages while maintaining required functionality</p>
                <p>• Published regular pages will be accessible at /[page-slug] on your public site</p>
                <p>• Reserved pages are automatically deployed to their designated routes when customized</p>
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