import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/AdminLayout';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  RadialBarChart, RadialBar, Legend, ComposedChart
} from 'recharts';

// Animated counter hook
const useAnimatedCounter = (end, duration = 2000, decimals = 0) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const requestRef = useRef();
  const startTimeRef = useRef();

  useEffect(() => {
    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);

      countRef.current = end * progress;
      setCount(Number(countRef.current.toFixed(decimals)));

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [end, duration, decimals]);

  return count;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    pages: 0,
    blogPosts: 0,
    subscribers: 0,
    plans: 0,
    revenue: 0,
    orders: 0,
    conversionRate: 0,
    avgOrderValue: 0,
    visitors: 0,
    bounceRate: 0,
    sessionDuration: 0
  });
  const [displayStats, setDisplayStats] = useState(stats);
  const [recentActivity, setRecentActivity] = useState([]);
  const [quickActions, setQuickActions] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    uptime: '...',
    responseTime: '...',
    securityScore: '...',
    storageUsed: '...'
  });
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7d');
  const router = useRouter();

  // Animated counters for main stats
  const animatedRevenue = useAnimatedCounter(stats.revenue, 1500, 0);
  const animatedSubscribers = useAnimatedCounter(stats.subscribers, 2200, 0);
  const animatedPages = useAnimatedCounter(stats.pages, 1200, 0);
  const animatedPlans = useAnimatedCounter(stats.plans, 1000, 0);

  // State for real dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);

  // Generate performance data from real daily views
  const generatePerformanceData = (dailyViews = []) => {
    const now = new Date();
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const data = [];

    // Create a map of daily views for quick lookup
    const viewsMap = {};
    dailyViews.forEach(day => {
      viewsMap[day.date] = day;
    });

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = viewsMap[dateStr];

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: 0, // Will be calculated from subscribers if available
        subscribers: dayData?.unique_visitors || 0,
        pagesCreated: dayData?.views || 0,
        systemHealth: 95 // System health placeholder
      });
    }
    return data;
  };

  // Generate quick actions
  const generateQuickActions = () => {
    return [
      {
        id: 'create-page',
        title: 'Create New Page',
        description: 'Build a new page with AI assistance',
        icon: '📄',
        action: () => router.push('/admin/pages/new'),
        color: 'bg-emerald-600'
      },
      {
        id: 'customize-reserved',
        title: 'Customize Reserved Pages',
        description: 'Update customer login, signup, and dashboard',
        icon: '🎨',
        action: () => router.push('/admin/pages'),
        color: 'bg-blue-600'
      },
      {
        id: 'manage-plans',
        title: 'Manage Pricing Plans',
        description: 'Set up subscription tiers and features',
        icon: '💳',
        action: () => router.push('/admin/plans'),
        color: 'bg-purple-600'
      },
      {
        id: 'view-blog',
        title: 'Manage Blog',
        description: 'Create and edit blog posts',
        icon: '📝',
        action: () => router.push('/admin/blog'),
        color: 'bg-amber-600'
      },
      {
        id: 'ai-settings',
        title: 'AI Page Builder',
        description: 'Generate pages with AI assistance',
        icon: '🤖',
        action: () => router.push('/admin/ai-page-builder'),
        color: 'bg-teal-600'
      },
      {
        id: 'system-settings',
        title: 'System Settings',
        description: 'Configure platform settings',
        icon: '⚙️',
        action: () => router.push('/admin/settings'),
        color: 'bg-slate-600'
      }
    ];
  };

  // Generate recent activity from real data
  const generateRecentActivity = (analytics, subscribers) => {
    const activities = [];

    // Add recent subscribers
    if (subscribers && subscribers.length > 0) {
      const recentSubs = subscribers.slice(0, 3);
      recentSubs.forEach((sub, idx) => {
        const createdDate = new Date(sub.created_at);
        const now = new Date();
        const diffMs = now - createdDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        let timeAgo = 'Just now';
        if (diffDays > 0) timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        else if (diffHours > 0) timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        else if (diffMins > 0) timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

        activities.push({
          id: `sub-${sub.id}`,
          type: 'subscriber_added',
          title: 'New subscriber',
          description: `${sub.email} ${sub.plan ? `subscribed to ${sub.plan.name}` : 'signed up'}`,
          time: timeAgo,
          icon: '👤',
          color: 'text-blue-400'
        });
      });
    }

    // Add top blog posts as activity
    if (analytics?.topBlogPosts && analytics.topBlogPosts.length > 0) {
      const topPost = analytics.topBlogPosts[0];
      activities.push({
        id: `blog-${topPost.slug}`,
        type: 'blog_popular',
        title: 'Popular blog post',
        description: `"${topPost.title}" has ${topPost.view_count} views`,
        time: 'This month',
        icon: '📝',
        color: 'text-amber-400'
      });
    }

    // Add page view milestone if available
    if (analytics?.pageViewStats?.total_views > 0) {
      activities.push({
        id: 'pageviews',
        type: 'milestone',
        title: 'Page views milestone',
        description: `${analytics.pageViewStats.total_views} total page views this month`,
        time: 'Last 30 days',
        icon: '📊',
        color: 'text-emerald-400'
      });
    }

    // If no real activity, show a welcome message
    if (activities.length === 0) {
      activities.push({
        id: 'welcome',
        type: 'system',
        title: 'Welcome to your dashboard',
        description: 'Start by creating your first page or blog post',
        time: 'Now',
        icon: '🎉',
        color: 'text-purple-400'
      });
    }

    return activities.slice(0, 5);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch all data in parallel
        const [analyticsRes, subscribersRes, plansRes, healthRes] = await Promise.all([
          fetch('/api/analytics/dashboard'),
          fetch('/api/subscribers'),
          fetch('/api/plans'),
          fetch('/api/admin/system-health')
        ]);

        // Update system health if available
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setSystemHealth({
            uptime: healthData.uptime || '99.9%',
            responseTime: healthData.responseTime || '< 100ms',
            securityScore: healthData.securityScore || 'A',
            storageUsed: healthData.storageUsed || '0 / 10GB'
          });
        }

        const analyticsData = analyticsRes.ok ? await analyticsRes.json() : null;
        const subscribers = subscribersRes.ok ? await subscribersRes.json() : [];
        const plans = plansRes.ok ? await plansRes.json() : [];

        // Calculate real stats
        const activeSubscribers = subscribers.filter(s => s.subscription_status === 'active');
        const totalRevenue = activeSubscribers.reduce((sum, s) => sum + (s.plan?.price || 0), 0);

        setStats({
          pages: analyticsData?.blogStats?.total_posts || 0,
          blogPosts: analyticsData?.blogStats?.published_posts || 0,
          subscribers: subscribers.length,
          plans: plans.length,
          revenue: totalRevenue,
          orders: activeSubscribers.length,
          conversionRate: subscribers.length > 0 ? ((activeSubscribers.length / subscribers.length) * 100).toFixed(1) : 0,
          avgOrderValue: activeSubscribers.length > 0 ? Math.round(totalRevenue / activeSubscribers.length) : 0,
          visitors: analyticsData?.pageViewStats?.total_views || 0,
          bounceRate: 0, // Not tracked
          sessionDuration: 0 // Not tracked
        });

        setDashboardData(analyticsData);
        setPerformanceData(generatePerformanceData(analyticsData?.dailyViews || []));
        setQuickActions(generateQuickActions());
        setRecentActivity(generateRecentActivity(analyticsData, subscribers));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Set empty state on error
        setStats({
          pages: 0, blogPosts: 0, subscribers: 0, plans: 0, revenue: 0,
          orders: 0, conversionRate: 0, avgOrderValue: 0, visitors: 0,
          bounceRate: 0, sessionDuration: 0
        });
        setQuickActions(generateQuickActions());
        setRecentActivity([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Regenerate performance data when timeframe changes
  useEffect(() => {
    if (dashboardData?.dailyViews) {
      setPerformanceData(generatePerformanceData(dashboardData.dailyViews));
    }
  }, [timeframe, dashboardData]);

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
            <p className="text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="p-6 space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Welcome back!</h1>
              <p className="text-slate-400 mt-1">Here's what's happening with your platform today.</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">System Status</div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-emerald-400 font-medium">Operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Business Stats - Revenue, New Signups, New Customers, Total Views */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold text-slate-100">${animatedRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-purple-500/10 p-3 rounded-lg">
                <span className="text-purple-400 text-xl">💰</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${Math.min(100, (stats.revenue / 5000) * 100)}%` }}
                ></div>
              </div>
              <p className="text-slate-400 text-xs mt-2">Monthly recurring</p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">New Signups</p>
                <p className="text-3xl font-bold text-slate-100">{stats.subscribers}</p>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-lg">
                <span className="text-blue-400 text-xl">👤</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.min(100, (stats.subscribers / 100) * 100)}%` }}
                ></div>
              </div>
              <p className="text-slate-400 text-xs mt-2">Total signups</p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Active Customers</p>
                <p className="text-3xl font-bold text-slate-100">{stats.orders}</p>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-lg">
                <span className="text-emerald-400 text-xl">👥</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(100, (stats.orders / 100) * 100)}%` }}
                ></div>
              </div>
              <p className="text-slate-400 text-xs mt-2">{stats.conversionRate}% conversion rate</p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Views</p>
                <p className="text-3xl font-bold text-slate-100">{stats.visitors}</p>
              </div>
              <div className="bg-amber-500/10 p-3 rounded-lg">
                <span className="text-amber-400 text-xl">👁️</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.min(100, (stats.visitors / 2000) * 100)}%` }}
                ></div>
              </div>
              <p className="text-slate-400 text-xs mt-2">Last 30 days</p>
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-200">Platform Performance</h2>
            <div className="flex bg-slate-700 rounded-lg p-1">
              {['7d', '30d', '90d'].map((period) => (
                <button
                  key={period}
                  onClick={() => setTimeframe(period)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    timeframe === period
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSubscribers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#F1F5F9'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="subscribers"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className={`${action.color} hover:opacity-90 text-white p-4 rounded-lg transition-opacity flex items-center space-x-3`}
                >
                  <span className="text-2xl">{action.icon}</span>
                  <div className="text-left">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-sm opacity-80">{action.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-slate-700/50 last:border-0 last:pb-0">
                  <div className={`text-xl ${activity.color}`}>{activity.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 font-medium">{activity.title}</p>
                    <p className="text-slate-400 text-sm truncate">{activity.description}</p>
                    <p className="text-slate-500 text-xs mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">System Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="text-2xl mb-2">⏱️</div>
              <div className="text-slate-200 font-medium">Response Time</div>
              <div className="text-slate-400 text-sm">{systemHealth.responseTime}</div>
            </div>
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="text-2xl mb-2">🔄</div>
              <div className="text-slate-200 font-medium">Uptime</div>
              <div className="text-slate-400 text-sm">{systemHealth.uptime}</div>
            </div>
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="text-2xl mb-2">🛡️</div>
              <div className="text-slate-200 font-medium">Security</div>
              <div className="text-slate-400 text-sm">{systemHealth.securityScore}</div>
            </div>
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="text-2xl mb-2">💾</div>
              <div className="text-slate-200 font-medium">Storage</div>
              <div className="text-slate-400 text-sm">{systemHealth.storageUsed}</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}