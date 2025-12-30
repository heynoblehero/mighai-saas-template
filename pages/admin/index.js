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
    uptime: '99.9%',
    responseTime: '120ms',
    securityScore: 'A+',
    storageUsed: '2.4GB / 10GB'
  });
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7d');
  const router = useRouter();

  // Animated counters for main stats
  const animatedRevenue = useAnimatedCounter(stats.revenue, 1500, 0);
  const animatedSubscribers = useAnimatedCounter(stats.subscribers, 2200, 0);
  const animatedPages = useAnimatedCounter(stats.pages, 1200, 0);
  const animatedPlans = useAnimatedCounter(stats.plans, 1000, 0);

  // Generate minimal demo data since no analytics are configured yet
  const generatePerformanceData = () => {
    const now = new Date();
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: Math.floor(Math.random() * 100),
        subscribers: Math.floor(Math.random() * 5),
        pagesCreated: Math.floor(Math.random() * 3),
        systemHealth: Math.floor(Math.random() * 20) + 80 // 80-100%
      });
    }
    return data;
  };

  const performanceData = generatePerformanceData();

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
        action: () => router.push('/admin/reserved-pages'),
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
        title: 'AI Settings',
        description: 'Configure AI providers and keys',
        icon: '🤖',
        action: () => router.push('/admin/ai-settings'),
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

  // Generate recent activity
  const generateRecentActivity = () => {
    return [
      {
        id: 1,
        type: 'page_created',
        title: 'New page created',
        description: 'Landing page for marketing campaign',
        time: '2 minutes ago',
        icon: '📄',
        color: 'text-emerald-400'
      },
      {
        id: 2,
        type: 'subscriber_added',
        title: 'New subscriber',
        description: 'john@example.com subscribed to premium plan',
        time: '15 minutes ago',
        icon: '👤',
        color: 'text-blue-400'
      },
      {
        id: 3,
        type: 'plan_updated',
        title: 'Plan updated',
        description: 'Basic plan features modified',
        time: '1 hour ago',
        icon: '💳',
        color: 'text-purple-400'
      },
      {
        id: 4,
        type: 'blog_post',
        title: 'Blog post published',
        description: 'How to use AI page builder',
        time: '3 hours ago',
        icon: '📝',
        color: 'text-amber-400'
      },
      {
        id: 5,
        type: 'system_update',
        title: 'System update',
        description: 'Platform updated to v2.1.0',
        time: 'Yesterday',
        icon: '⚙️',
        color: 'text-slate-400'
      }
    ];
  };

  useEffect(() => {
    // Simulate loading data
    setLoading(true);
    setTimeout(() => {
      setStats({
        pages: 12,
        blogPosts: 5,
        subscribers: 42,
        plans: 3,
        revenue: 1250,
        orders: 8,
        conversionRate: 3.2,
        avgOrderValue: 156.25,
        visitors: 1240,
        bounceRate: 42.5,
        sessionDuration: 3.2
      });

      setQuickActions(generateQuickActions());
      setRecentActivity(generateRecentActivity());
      setLoading(false);
    }, 800);
  }, []);

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

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Pages</p>
                <p className="text-3xl font-bold text-slate-100">{animatedPages}</p>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-lg">
                <span className="text-emerald-400 text-xl">📄</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full" 
                  style={{ width: `${Math.min(100, (stats.pages / 50) * 100)}%` }}
                ></div>
              </div>
              <p className="text-slate-400 text-xs mt-2">0% of capacity used</p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Subscribers</p>
                <p className="text-3xl font-bold text-slate-100">{animatedSubscribers}</p>
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
              <p className="text-slate-400 text-xs mt-2">+12% from last week</p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Revenue</p>
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
                <p className="text-slate-400 text-sm">Pricing Plans</p>
                <p className="text-3xl font-bold text-slate-100">{animatedPlans}</p>
              </div>
              <div className="bg-amber-500/10 p-3 rounded-lg">
                <span className="text-amber-400 text-xl">📋</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full" 
                  style={{ width: `${Math.min(100, (stats.plans / 10) * 100)}%` }}
                ></div>
              </div>
              <p className="text-slate-400 text-xs mt-2">Active plans</p>
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