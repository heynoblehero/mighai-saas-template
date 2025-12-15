import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function SubscriberLayout({ children, title = 'Subscriber Dashboard' }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState({
    showIntegrationsPage: false,
    availableOAuthServices: 0,
    availableAIServices: 0
  });
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    checkIntegrations();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/subscribe/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        router.push('/subscribe/login');
      }
    } catch (error) {
      router.push('/subscribe/login');
    } finally {
      setLoading(false);
    }
  };

  const checkIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations/available');
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data);
      }
    } catch (error) {
      console.error('Failed to fetch integration availability:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/subscribe/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="flex">
        {/* Sidebar */}
        <div className="subscriber-sidebar w-64 min-h-screen bg-slate-800 border-r border-slate-700 text-white p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Subscriber Portal</h1>
            <p className="text-sm text-slate-400">Welcome, {user.username}</p>
          </div>
          
          <nav className="space-y-2">
            <Link href="/dashboard" className="block px-4 py-2 text-slate-200 hover:bg-slate-700 rounded">
              Dashboard
            </Link>
            <Link href="/dashboard/profile" className="block px-4 py-2 text-slate-200 hover:bg-slate-700 rounded">
              My Profile
            </Link>
            
            {/* Conditionally show integrations section */}
            {integrations.showIntegrationsPage && (
              <>
                <div className="pt-4 pb-2">
                  <div className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Integrations
                  </div>
                </div>
                
                {integrations.availableOAuthServices > 0 && (
                  <Link href="/dashboard/connections" className="block px-4 py-2 text-slate-200 hover:bg-slate-700 rounded">
                    <div className="flex items-center justify-between">
                      <span>Connected Accounts</span>
                      <span className="bg-emerald-600 text-xs px-2 py-1 rounded-full">
                        {integrations.availableOAuthServices}
                      </span>
                    </div>
                  </Link>
                )}
                
                {integrations.availableAIServices > 0 && (
                  <Link href="/dashboard/ai-services" className="block px-4 py-2 text-slate-200 hover:bg-slate-700 rounded">
                    <div className="flex items-center justify-between">
                      <span>AI Services</span>
                      <span className="bg-emerald-600 text-xs px-2 py-1 rounded-full">
                        {integrations.availableAIServices}
                      </span>
                    </div>
                  </Link>
                )}
              </>
            )}
            
            <div className="pt-4 pb-2">
              <div className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Account
              </div>
            </div>
            <Link href="/dashboard/upgrade" className="block px-4 py-2 text-slate-200 hover:bg-slate-700 rounded">
              Upgrade Plan
            </Link>
            <Link href="/" className="block px-4 py-2 text-slate-200 hover:bg-slate-700 rounded">
              Back to Site
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-700 rounded"
            >
              Logout
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}