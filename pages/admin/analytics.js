import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  RadialBarChart, RadialBar, Legend, ComposedChart, ScatterChart, Scatter
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

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('all');

  // Generate empty analytics data (no tracking configured yet)
  const generateAnalyticsData = () => {
    const now = new Date();
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date.toISOString().split('T')[0],
        pageViews: 0,
        uniqueVisitors: 0,
        sessions: 0,
        bounceRate: 0,
        avgSessionDuration: 0,
        conversions: 0,
        revenue: 0
      });
    }
    return data;
  };

  const analyticsData = generateAnalyticsData();
  
  // Calculate totals for animated counters
  const totalPageViews = analyticsData.reduce((sum, item) => sum + item.pageViews, 0);
  const totalVisitors = analyticsData.reduce((sum, item) => sum + item.uniqueVisitors, 0);
  const totalSessions = analyticsData.reduce((sum, item) => sum + item.sessions, 0);
  const totalRevenue = analyticsData.reduce((sum, item) => sum + item.revenue, 0);
  const avgBounceRate = (analyticsData.reduce((sum, item) => sum + parseFloat(item.bounceRate), 0) / analyticsData.length).toFixed(1);
  const avgSessionDuration = Math.floor(analyticsData.reduce((sum, item) => sum + item.avgSessionDuration, 0) / analyticsData.length);

  // Animated counters
  const animatedPageViews = useAnimatedCounter(totalPageViews, 1500, 0);
  const animatedVisitors = useAnimatedCounter(totalVisitors, 1800, 0);
  const animatedSessions = useAnimatedCounter(totalSessions, 1600, 0);
  const animatedRevenue = useAnimatedCounter(totalRevenue, 2000, 0);
  const animatedBounceRate = useAnimatedCounter(parseFloat(avgBounceRate), 1400, 1);
  const animatedSessionDuration = useAnimatedCounter(avgSessionDuration, 1700, 0);

  useEffect(() => {
    // Simulate data loading
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 800);
  }, [timeframe]);

  // Traffic sources data
  const trafficSources = [];

  // Device types data
  const deviceData = [];

  // Geographic data
  const geoData = [];

  if (loading) {
    return (
      <AdminLayout title="Analytics">
        <div className="dashboard-loading">
          <div className="loading-container">
            <div className="loading-spinner-large"></div>
            <p className="text-subdued">Loading analytics data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Analytics">
      <div className="shopify-dashboard">
        {/* Header Section */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-title">
              <h1 className="text-display-medium">Analytics Dashboard</h1>
              <p className="text-subdued">
                Comprehensive insights and performance metrics for your platform
              </p>
            </div>
            <div className="header-actions">
              <select 
                value={timeframe} 
                onChange={(e) => setTimeframe(e.target.value)}
                className="timeframe-select"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 3 months</option>
              </select>
              <select 
                value={selectedMetric} 
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="timeframe-select"
              >
                <option value="all">All Metrics</option>
                <option value="traffic">Traffic</option>
                <option value="engagement">Engagement</option>
                <option value="conversion">Conversion</option>
              </select>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="stats-overview">
          <div className="stats-grid-shopify">
            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Page Views</span>
                <div className="stat-menu">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-subdued">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div className="stat-value">{animatedPageViews.toLocaleString()}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+18% vs last period</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Unique Visitors</span>
              </div>
              <div className="stat-value">{animatedVisitors.toLocaleString()}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+22% vs last period</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Sessions</span>
              </div>
              <div className="stat-value">{animatedSessions.toLocaleString()}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+15% vs last period</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Bounce Rate</span>
              </div>
              <div className="stat-value">{animatedBounceRate}%</div>
              <div className="stat-trend negative">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>-3% vs last period</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Avg Session Duration</span>
              </div>
              <div className="stat-value">{Math.floor(animatedSessionDuration / 60)}m {animatedSessionDuration % 60}s</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+12% vs last period</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Revenue Impact</span>
              </div>
              <div className="stat-value">${animatedRevenue.toLocaleString()}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+28% vs last period</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          <div className="charts-grid">
            {/* Traffic Overview */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="text-heading">Traffic Overview</h3>
                <div className="chart-actions">
                  <button className="btn btn-secondary btn-sm">Export Data</button>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={analyticsData}>
                    <defs>
                      <linearGradient id="pageViewsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="var(--color-text-subdued)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="pageViews"
                      stroke="var(--color-text-subdued)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="visitors"
                      orientation="right"
                      stroke="var(--color-text-subdued)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-large)',
                        color: 'var(--color-text)',
                        boxShadow: 'var(--shadow-popover)'
                      }}
                    />
                    <Area 
                      yAxisId="pageViews"
                      type="monotone" 
                      dataKey="pageViews" 
                      stroke="var(--color-primary)" 
                      fillOpacity={1} 
                      fill="url(#pageViewsGradient)" 
                      strokeWidth={3}
                      animationDuration={2000}
                    />
                    <Line 
                      yAxisId="visitors"
                      type="monotone" 
                      dataKey="uniqueVisitors" 
                      stroke="var(--color-accent-blue)" 
                      strokeWidth={2}
                      dot={{ fill: 'var(--color-accent-blue)', strokeWidth: 2, r: 3 }}
                      animationDuration={2000}
                      animationDelay={500}
                    />
                    <Bar 
                      yAxisId="visitors"
                      dataKey="sessions" 
                      fill="var(--color-accent-orange)" 
                      opacity={0.6}
                      animationDuration={1500}
                      animationDelay={1000}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Traffic Sources */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="text-heading">Traffic Sources</h3>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={trafficSources}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      animationDuration={1500}
                    >
                      {trafficSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-large)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="traffic-sources-legend">
                  {trafficSources.map((source, index) => (
                    <div key={index} className="source-item">
                      <div className="source-info">
                        <div 
                          className="legend-color" 
                          style={{ backgroundColor: source.color }}
                        ></div>
                        <span className="source-name">{source.name}</span>
                      </div>
                      <div className="source-stats">
                        <span className="source-users">{source.users.toLocaleString()}</span>
                        <span className="source-percentage">{source.value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Analytics */}
          <div className="charts-grid mt-6">
            {/* Device Breakdown */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="text-heading">Device Breakdown</h3>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={deviceData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis type="number" stroke="var(--color-text-subdued)" fontSize={11} />
                    <YAxis type="category" dataKey="name" stroke="var(--color-text-subdued)" fontSize={11} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-large)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <Bar 
                      dataKey="sessions" 
                      fill="var(--color-primary)"
                      radius={[0, 4, 4, 0]}
                      animationDuration={1500}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Geographic Distribution */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="text-heading">Top Countries</h3>
              </div>
              <div className="chart-container">
                <div className="geo-list">
                  {geoData.map((country, index) => (
                    <div key={index} className="geo-item">
                      <div className="geo-info">
                        <span className="geo-country">{country.country}</span>
                        <span className="geo-users">{country.users.toLocaleString()} users</span>
                      </div>
                      <div className="geo-bar-container">
                        <div 
                          className="geo-bar"
                          style={{ 
                            width: `${country.percentage}%`,
                            backgroundColor: 'var(--color-primary)'
                          }}
                        ></div>
                        <span className="geo-percentage">{country.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}