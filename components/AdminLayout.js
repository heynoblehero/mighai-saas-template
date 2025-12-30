import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const navigation = [
  {
    name: 'Main',
    items: [
      { name: 'Dashboard', href: '/admin', icon: 'dashboard', current: false },
      { name: 'Subscribers', href: '/admin/subscribers', icon: 'users', current: false },
    ]
  },
  {
    name: 'Analytics',
    items: [
      { name: 'Analytics Overview', href: '/admin/analytics', icon: 'chart', current: false },
      { name: 'A/B Tests', href: '/admin/ab-tests', icon: 'activity', current: false },
      { name: 'Heatmaps', href: '/admin/heatmaps', icon: 'target', current: false },
    ]
  },
  {
    name: 'Business',
    items: [
      { name: 'Plans', href: '/admin/plans', icon: 'credit-card', current: false },
      { name: 'Checkout Links', href: '/admin/checkout-links', icon: 'link', current: false },
      { name: 'Pricing Table', href: '/admin/pricing-table', icon: 'table', current: false },
      { name: 'Chat with Customers', href: '/admin/support-messages', icon: 'message-circle', current: false },
    ]
  },
  {
    name: 'Content',
    items: [
      { name: 'Pages', href: '/admin/pages', icon: 'file-text', current: false },
      { name: 'Reserved Pages', href: '/admin/reserved-pages', icon: 'palette', current: false },
      { name: 'Blog', href: '/admin/blog', icon: 'edit', current: false },
    ]
  },
  {
    name: 'Email',
    items: [
      { name: 'Campaigns', href: '/admin/campaigns', icon: 'mail', current: false },
      { name: 'Templates', href: '/admin/email-templates', icon: 'file-text', current: false },
      { name: 'Email Settings', href: '/admin/email-settings', icon: 'mail-settings', current: false },
    ]
  },
  {
    name: 'Backend',
    items: [
      { name: 'Database', href: '/admin/database', icon: 'database', current: false },
      { name: 'Storage', href: '/admin/storage', icon: 'hard-drive', current: false },
      { name: 'API Routes', href: '/admin/backend/routes', icon: 'code', current: false },
      { name: 'Server Logs', href: '/admin/backend/server-logs', icon: 'file-text', current: false },
      { name: 'Integrations', href: '/admin/integrations', icon: 'zap', current: false },
    ]
  },
  {
    name: 'Development',
    items: [
      { name: 'Connect Telegram', href: '/admin/telegram-bots', icon: 'message-square', current: false },
      { name: 'Logs', href: '/admin/error-monitoring', icon: 'alert-triangle', current: false, badge: '3' },
    ]
  },
  {
    name: 'System',
    items: [
      { name: 'Platform Update', href: '/admin/platform-update', icon: 'refresh', current: false },
      { name: 'Settings', href: '/admin/settings', icon: 'settings', current: false },
    ]
  }
];

const icons = {
  'dashboard': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
    </svg>
  ),
  'chart': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  'code': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  'credit-card': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  'users': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  'dollar-sign': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  ),
  'file-text': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  'edit': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  'mail': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  'mail-settings': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  'message-circle': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  'alert-triangle': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  'activity': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  'settings': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  'refresh': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  'database': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  'hard-drive': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h.01M12 16h.01" />
    </svg>
  ),
  'shopping-cart': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
    </svg>
  ),
  'user-check': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'link': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  'table': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0V4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H5a1 1 0 01-1-1z" />
    </svg>
  ),
  'zap': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  'target': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  'key': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  'zap': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  'palette': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
      <circle cx="12" cy="8" r="1" />
      <circle cx="16" cy="12" r="1" />
      <circle cx="8" cy="16" r="1" />
    </svg>
  ),
  'message-square': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
    </svg>
  ),
  'cpu': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  ),
  'bot': (
    <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      <circle cx="9" cy="9" r="1" />
      <circle cx="15" cy="9" r="1" />
    </svg>
  ),
};

// Cache auth state globally to prevent redundant checks and logout loops
let cachedUser = null;
let authCheckInProgress = false;

export default function AdminLayout({ children, title = 'Dashboard' }) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);

  // Set current navigation item based on current route
  const currentNavigation = navigation.map(section => ({
    ...section,
    items: section.items.map(item => ({
      ...item,
      current: router.pathname === item.href
    }))
  }));

  useEffect(() => {
    // Skip auth check if we already have a cached user
    if (cachedUser) {
      setUser(cachedUser);
      setLoading(false);
      return;
    }

    // Skip if already on login page to prevent redirect loops
    if (router.pathname === '/admin/login') {
      setLoading(false);
      return;
    }

    checkAuth();
  }, [router.pathname]);

  const checkAuth = async (retryCount = 0) => {
    // Prevent concurrent auth checks
    if (authCheckInProgress) {
      return;
    }
    authCheckInProgress = true;

    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.role === 'admin') {
          cachedUser = data.user;
          setUser(data.user);
        } else {
          // Not an admin, redirect to dashboard
          cachedUser = null;
          router.push('/dashboard');
        }
      } else if (response.status === 401) {
        // Only redirect on explicit 401 (unauthorized)
        cachedUser = null;
        router.push('/admin/login');
      } else {
        // For other errors (500, network issues), retry once
        if (retryCount < 1) {
          authCheckInProgress = false;
          setTimeout(() => checkAuth(retryCount + 1), 500);
          return;
        }
        // After retry, still fail - redirect to login
        cachedUser = null;
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Network error - retry once before giving up
      if (retryCount < 1) {
        authCheckInProgress = false;
        setTimeout(() => checkAuth(retryCount + 1), 500);
        return;
      }
      cachedUser = null;
      router.push('/admin/login');
    } finally {
      authCheckInProgress = false;
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      // Clear the cached user on logout
      cachedUser = null;
      setUser(null);
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear cache and redirect even if logout API fails
      cachedUser = null;
      setUser(null);
      router.push('/admin/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="admin-layout">
      {/* Skip Link for Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      {/* Sidebar */}
      <div className={`admin-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="nav-brand">
          <h2>
            <span>🚀</span>
            Mighai
          </h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1" role="navigation" aria-label="Admin navigation">
          {currentNavigation.map((section) => (
            <div key={section.name} className="nav-section">
              <div className="nav-section-title">{section.name}</div>
              {section.items.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`nav-item ${item.current ? 'active' : ''}`}
                  aria-current={item.current ? 'page' : undefined}
                  aria-label={`${item.name}${item.badge ? ` (${item.badge} notifications)` : ''}`}
                >
                  {icons[item.icon]}
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="nav-badge" aria-label={`${item.badge} notifications`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="nav-section border-t border-gray-700 mt-auto">
          {user && (
            <div className="px-4 py-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    Administrator
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left nav-item text-red-300 hover:text-red-200 hover:bg-red-900/20"
              >
                <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-100">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="hidden md:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-64 pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                />
                <svg
                  className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Notifications */}
            <button className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-lg relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-3.5-3.5a5.98 5.98 0 000-8.48L18.5 3.5 15 7V3a1 1 0 00-1-1h-4a1 1 0 00-1 1v4L5.5 3.5 7.93 5.93a5.98 5.98 0 000 8.48L5 17h5m5 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            {/* Profile */}
            {user && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:block text-sm font-medium text-slate-200">
                  {user.username}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" className="admin-content" role="main" aria-label={`${title} page content`}>
          {children}
        </main>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}