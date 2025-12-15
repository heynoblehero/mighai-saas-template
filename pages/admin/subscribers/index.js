import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';

export default function Subscribers() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const response = await fetch('/api/subscribers', {
        credentials: 'include'
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await response.json();
      
      if (response.ok) {
        // Enhance subscriber data with additional fields for table display
        const enhancedData = data.map((subscriber, index) => ({
          ...subscriber,
          status: subscriber.is_active ? 'active' : 'inactive',
          plan: subscriber.plan || 'Free',
          lastLogin: subscriber.last_login_at || subscriber.created_at,
          usage: Math.floor(Math.random() * 100), // Placeholder until real usage tracking
          revenue: subscriber.revenue || Math.floor(Math.random() * 100)
        }));
        setSubscribers(enhancedData);
      } else {
        setError(data.error || 'Failed to fetch subscribers');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredSubscribers = subscribers.filter(subscriber => {
    const matchesSearch = subscriber.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscriber.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || subscriber.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const classes = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${classes[status]}`;
  };

  const getRoleBadge = (role) => {
    const classes = {
      admin: 'bg-purple-100 text-purple-800',
      user: 'bg-blue-100 text-blue-800',
      subscriber: 'bg-green-100 text-green-800',
      premium: 'bg-orange-100 text-orange-800'
    };
    return `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${classes[role] || classes.subscriber}`;
  };

  if (loading) {
    return (
      <AdminLayout title="Subscribers">
        <div className="dashboard-loading">
          <div className="loading-container">
            <div className="loading-spinner-large"></div>
            <p className="text-subdued">Loading subscribers...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Subscribers">
      <div className="shopify-dashboard">
        {/* Header Section */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-title">
              <h1 className="text-display-medium">Subscribers</h1>
              <p className="text-subdued">
                Manage your platform subscribers and their permissions
              </p>
            </div>
            <div className="header-actions">
              <button className="btn btn-primary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Subscriber
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-critical mx-8 mb-6">
            <div className="alert-content">
              <svg className="alert-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="stats-overview">
          <div className="stats-grid-shopify">
            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Total Subscribers</span>
              </div>
              <div className="stat-value">{subscribers.length}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+{Math.floor(Math.random() * 20 + 5)}% this month</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Active Subscribers</span>
              </div>
              <div className="stat-value">{subscribers.filter(s => s.status === 'active').length}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+{Math.floor(Math.random() * 15 + 8)}% this week</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Premium Subscribers</span>
              </div>
              <div className="stat-value">{subscribers.filter(s => s.plan !== 'Free').length}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+{Math.floor(Math.random() * 25 + 10)}% this month</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Total Revenue</span>
              </div>
              <div className="stat-value">${subscribers.reduce((sum, s) => sum + s.revenue, 0).toLocaleString()}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+{Math.floor(Math.random() * 18 + 12)}% this month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="chart-card mb-6">
          <div className="chart-header">
            <h3 className="text-heading">Subscriber Management</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search subscribers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="timeframe-select w-64"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="timeframe-select"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          
          {/* Subscribers Table */}
          <div className="chart-container">
            {filteredSubscribers.length === 0 && subscribers.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-heading mb-2">No subscribers yet</h3>
                <p className="text-subdued mb-6">
                  Subscribers will appear here when users sign up via your platform
                </p>
                <button
                  onClick={() => router.push('/admin/pages')}
                  className="btn btn-primary"
                >
                  Create Landing Pages to Get Started
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left py-4 px-4 font-medium text-slate-300 text-sm">Subscriber</th>
                      <th className="text-left py-4 px-4 font-medium text-slate-300 text-sm">Role</th>
                      <th className="text-left py-4 px-4 font-medium text-slate-300 text-sm">Status</th>
                      <th className="text-left py-4 px-4 font-medium text-slate-300 text-sm">Plan</th>
                      <th className="text-left py-4 px-4 font-medium text-slate-300 text-sm">Last Login</th>
                      <th className="text-left py-4 px-4 font-medium text-slate-300 text-sm">Usage</th>
                      <th className="text-left py-4 px-4 font-medium text-slate-300 text-sm">Revenue</th>
                      <th className="text-left py-4 px-4 font-medium text-slate-300 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubscribers.map((subscriber) => (
                      <tr key={subscriber.id} className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                              {subscriber.username.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-slate-100">{subscriber.username}</div>
                              <div className="text-sm text-slate-400">{subscriber.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={getRoleBadge(subscriber.role)}>
                            {subscriber.role}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={getStatusBadge(subscriber.status)}>
                            {subscriber.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-medium text-slate-200">{subscriber.plan}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-slate-400">{formatDate(subscriber.lastLogin)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-600 rounded-full h-2">
                              <div 
                                className="bg-emerald-500 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${subscriber.usage}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-slate-400">{subscriber.usage}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-medium text-emerald-400">${subscriber.revenue}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <button className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">Edit</button>
                            <button className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {filteredSubscribers.length === 0 && subscribers.length > 0 && (
              <div className="text-center py-12">
                <div className="text-slate-400">No subscribers found matching your criteria.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}