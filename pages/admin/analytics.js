import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'heatmaps', 'ab-tests'
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [analyticsData, setAnalyticsData] = useState(null);

  // Handle URL hash routing to select the correct tab on page load
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1); // Remove the '#' character
      if (hash === 'heatmaps' || hash === 'ab-tests') {
        setActiveTab(hash);
      } else {
        setActiveTab('analytics'); // Default to analytics tab
      }
    };

    // Check hash on initial load
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    // Clean up the event listener
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Heatmap state
  const [heatmapConfig, setHeatmapConfig] = useState({
    hotjar: { enabled: false, hjid: '', hjsv: '6' },
    clarity: { enabled: false, clarity_id: '' },
    custom_scripts: []
  });
  const [heatmapSessions, setHeatmapSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapError, setHeatmapError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showCustomScript, setShowCustomScript] = useState(false);
  const [customScript, setCustomScript] = useState({ name: '', script: '' });
  const [heatmapFilters, setHeatmapFilters] = useState({
    page_path: '',
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  // In-house heatmap state
  const [heatmapPages, setHeatmapPages] = useState([]);
  const [selectedHeatmapPage, setSelectedHeatmapPage] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [heatmapViewType, setHeatmapViewType] = useState('clicks'); // 'clicks', 'movements', 'scroll'
  const [heatmapDataLoading, setHeatmapDataLoading] = useState(false);
  const heatmapCanvasRef = useRef(null);

  const [abTestFormData, setAbTestFormData] = useState({
    name: '',
    description: '',
    page_path: '',
    status: 'active',
    variants: [
      { name: 'A', traffic_split: 50, content: '' },
      { name: 'B', traffic_split: 50, content: '' }
    ]
  });
  const [experiments, setExperiments] = useState([]);
  const [abTestsLoading, setAbTestsLoading] = useState(false);
  const [abTestsError, setAbTestsError] = useState(null);
  const [editingExperiment, setEditingExperiment] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedExperimentResults, setSelectedExperimentResults] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Fetch analytics data from API
  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/dashboard?period=${timeframe}`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      } else {
        console.error('Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get values from analytics data or use defaults
  const overview = analyticsData?.overview || {};
  const totalPageViews = overview.totalViews || 0;
  const totalVisitors = overview.uniqueVisitors || 0;
  const totalSessions = overview.totalSessions || 0;
  const avgBounceRate = overview.bounceRate || 0;
  const avgSessionDuration = overview.avgSessionDuration || 0;
  const avgScrollDepth = overview.avgScrollDepth || 0;
  const realtimeVisitors = overview.realtimeVisitors || 0;

  // Animated counters
  const animatedPageViews = useAnimatedCounter(totalPageViews, 1500, 0);
  const animatedVisitors = useAnimatedCounter(totalVisitors, 1800, 0);
  const animatedSessions = useAnimatedCounter(totalSessions, 1600, 0);
  const animatedBounceRate = useAnimatedCounter(avgBounceRate, 1400, 1);
  const animatedSessionDuration = useAnimatedCounter(avgSessionDuration, 1700, 0);
  const animatedScrollDepth = useAnimatedCounter(avgScrollDepth, 1500, 0);

  // Traffic sources data from API
  const trafficSources = (analyticsData?.trafficSources || []).map((source, index) => {
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];
    const total = analyticsData?.trafficSources?.reduce((sum, s) => sum + s.visits, 0) || 1;
    return {
      name: source.source,
      value: Math.round((source.visits / total) * 100),
      users: source.visits,
      color: colors[index % colors.length]
    };
  });

  // Device types data from API
  const deviceData = (analyticsData?.deviceStats || []).map(d => ({
    name: d.device,
    sessions: d.visits
  }));

  // Daily trends for chart
  const dailyTrends = (analyticsData?.dailyTrends || []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: d.date,
    pageViews: d.views,
    uniqueVisitors: d.unique_visitors,
    sessions: d.sessions
  }));

  // Top pages data
  const topPages = analyticsData?.topPages || [];

  // Fetch data when component mounts and when active tab or timeframe changes
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalyticsData();
    } else if (activeTab === 'heatmaps') {
      loadHeatmapConfig();
    } else if (activeTab === 'ab-tests') {
      fetchExperiments();
    }
  }, [activeTab, timeframe]);

  // Draw heatmap when data changes
  useEffect(() => {
    if (heatmapCanvasRef.current && heatmapData) {
      drawHeatmap(heatmapCanvasRef.current, heatmapData, heatmapViewType);
    }
  }, [heatmapData, heatmapViewType]);

  // Heatmap functions - uses localStorage for configuration
  const loadHeatmapConfig = () => {
    setHeatmapLoading(true);
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('heatmapConfig') : null;
      if (saved) {
        const data = JSON.parse(saved);
        const defaultConfig = {
          hotjar: { enabled: false, hjid: '', hjsv: '6' },
          clarity: { enabled: false, clarity_id: '' },
          custom_scripts: []
        };
        setHeatmapConfig({
          hotjar: { ...defaultConfig.hotjar, ...data.hotjar },
          clarity: { ...defaultConfig.clarity, ...data.clarity },
          custom_scripts: Array.isArray(data.custom_scripts) ? data.custom_scripts : defaultConfig.custom_scripts
        });
      }
      // Also fetch in-house heatmap pages
      fetchHeatmapPages();
    } catch (error) {
      console.error('Failed to load heatmap config:', error);
    } finally {
      setHeatmapLoading(false);
    }
  };

  // Fetch pages with heatmap data
  const fetchHeatmapPages = async () => {
    try {
      const response = await fetch(`/api/heatmap/pages?start_date=${heatmapFilters.start_date}&end_date=${heatmapFilters.end_date}`);
      if (response.ok) {
        const data = await response.json();
        setHeatmapPages(data.pages || []);
      }
    } catch (error) {
      console.error('Failed to fetch heatmap pages:', error);
    }
  };

  // Fetch heatmap data for a specific page
  const fetchHeatmapData = async (pagePath, type = 'clicks') => {
    setHeatmapDataLoading(true);
    try {
      const response = await fetch(
        `/api/heatmap/data?page_path=${encodeURIComponent(pagePath)}&type=${type}&start_date=${heatmapFilters.start_date}&end_date=${heatmapFilters.end_date}`
      );
      if (response.ok) {
        const data = await response.json();
        setHeatmapData(data);
        setSelectedHeatmapPage(pagePath);
        setHeatmapViewType(type);
      }
    } catch (error) {
      console.error('Failed to fetch heatmap data:', error);
    } finally {
      setHeatmapDataLoading(false);
    }
  };

  // Draw heatmap on canvas
  const drawHeatmap = (canvasEl, data, type) => {
    if (!canvasEl || !data) return;

    const ctx = canvasEl.getContext('2d');
    const width = canvasEl.width;
    const height = canvasEl.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (type === 'clicks' && data.heatmap) {
      // Find max count for normalization
      const maxCount = Math.max(...data.heatmap.map(h => h.count), 1);

      data.heatmap.forEach(point => {
        const x = (point.x / 100) * width;
        const y = (point.y / 100) * height;
        const intensity = point.count / maxCount;

        // Draw gradient circle
        const radius = 20 + intensity * 30;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

        // Color based on intensity (green -> yellow -> red)
        const alpha = 0.3 + intensity * 0.5;
        if (intensity < 0.33) {
          gradient.addColorStop(0, `rgba(0, 255, 0, ${alpha})`);
          gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
        } else if (intensity < 0.66) {
          gradient.addColorStop(0, `rgba(255, 255, 0, ${alpha})`);
          gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
        } else {
          gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
          gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        }

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });
    } else if (type === 'movements' && data.attention_map) {
      data.attention_map.forEach(point => {
        const x = (point.x / 1920) * width; // Assuming 1920 base width
        const y = (point.y / 1080) * height;
        const intensity = point.intensity;

        const radius = 15;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(59, 130, 246, ${intensity * 0.6})`);
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });
    } else if (type === 'scroll' && data.depth_distribution) {
      // Draw scroll depth bars
      const barHeight = height / 4;
      const depths = ['0-25', '25-50', '50-75', '75-100'];
      const colors = ['#10B981', '#84CC16', '#F59E0B', '#EF4444'];
      const total = Object.values(data.depth_distribution).reduce((a, b) => a + b, 1);

      depths.forEach((depth, i) => {
        const count = data.depth_distribution[depth] || 0;
        const barWidth = (count / total) * width * 0.8;

        ctx.fillStyle = colors[i];
        ctx.globalAlpha = 0.7;
        ctx.fillRect(width * 0.1, i * barHeight + 10, barWidth, barHeight - 20);

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = '14px sans-serif';
        ctx.fillText(`${depth}%: ${count} (${Math.round(count/total*100)}%)`, width * 0.1 + 10, i * barHeight + barHeight/2 + 5);
      });
    }
  };

  // A/B Tests functions with loading and error handling
  const fetchExperiments = async () => {
    setAbTestsLoading(true);
    setAbTestsError(null);
    try {
      const response = await fetch('/api/ab-test');
      if (response.ok) {
        const data = await response.json();
        setExperiments(data || []);
      } else {
        setAbTestsError('Failed to fetch experiments');
      }
    } catch (error) {
      console.error('Failed to fetch experiments:', error);
      setAbTestsError('Error fetching experiments: ' + error.message);
    } finally {
      setAbTestsLoading(false);
    }
  };

  // Fetch results for a specific experiment
  const fetchExperimentResults = async (experimentId) => {
    setResultsLoading(true);
    try {
      const response = await fetch(`/api/ab-test/results/${experimentId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedExperimentResults(data);
      } else {
        alert('Failed to fetch experiment results');
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
      alert('Error fetching results: ' + error.message);
    } finally {
      setResultsLoading(false);
    }
  };

  const saveHeatmapConfig = () => {
    setSaving(true);
    try {
      localStorage.setItem('heatmapConfig', JSON.stringify(heatmapConfig));
      alert('Heatmap configuration saved successfully!');
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const addCustomScript = () => {
    if (!customScript.name || !customScript.script) {
      alert('Please provide both name and script');
      return;
    }

    setHeatmapConfig(prev => ({
      ...prev,
      custom_scripts: [...prev.custom_scripts, { ...customScript, id: Date.now() }]
    }));

    setCustomScript({ name: '', script: '' });
    setShowCustomScript(false);
  };

  const removeCustomScript = (id) => {
    setHeatmapConfig(prev => ({
      ...prev,
      custom_scripts: prev.custom_scripts.filter(script => script.id !== id)
    }));
  };

  const generateImplementationCode = () => {
    let code = '<!-- Add this to your page head section -->\n';
    code += '<script src="/analytics.js"></script>\n';
    code += '<script>\n';

    if (heatmapConfig.hotjar?.enabled && heatmapConfig.hotjar?.hjid) {
      code += `  // Initialize Hotjar\n`;
      code += `  HeatmapIntegration.initHotjar('${heatmapConfig.hotjar.hjid || ''}', ${heatmapConfig.hotjar.hjsv || '6'});\n\n`;
    }

    if (heatmapConfig.clarity?.enabled && heatmapConfig.clarity?.clarity_id) {
      code += `  // Initialize Microsoft Clarity\n`;
      code += `  HeatmapIntegration.initClarity('${heatmapConfig.clarity.clarity_id || ''}');\n\n`;
    }

    if (Array.isArray(heatmapConfig.custom_scripts) && heatmapConfig.custom_scripts.length > 0) {
      code += `  // Custom tracking scripts\n`;
      heatmapConfig.custom_scripts.forEach(script => {
        code += `  // ${script.name || ''}\n`;
        code += `  ${script.script || ''}\n\n`;
      });
    }

    code += '</script>';
    return code;
  };

  const handleAbTestSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingExperiment ? `/api/ab-test/${editingExperiment.id}` : '/api/ab-test';
      const method = editingExperiment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(abTestFormData)
      });

      if (response.ok) {
        setShowCreateForm(false);
        setEditingExperiment(null);
        resetAbTestForm();
        fetchExperiments();
      } else {
        alert('Failed to save experiment. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save experiment:', error);
      alert('Error saving experiment: ' + error.message);
    }
  };

  const handleAbTestDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this experiment?')) return;

    try {
      const response = await fetch(`/api/ab-test/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchExperiments();
      }
    } catch (error) {
      console.error('Failed to delete experiment:', error);
    }
  };

  const resetAbTestForm = () => {
    setAbTestFormData({
      name: '',
      description: '',
      page_path: '',
      status: 'active',
      variants: [
        { name: 'A', traffic_split: 50, content: '' },
        { name: 'B', traffic_split: 50, content: '' }
      ]
    });
  };

  const editExperiment = (experiment) => {
    setEditingExperiment(experiment);
    setAbTestFormData({
      name: experiment.name,
      description: experiment.description || '',
      page_path: experiment.page_path || '',
      status: experiment.status,
      variants: experiment.variants || [
        { name: 'A', traffic_split: 50, content: '' },
        { name: 'B', traffic_split: 50, content: '' }
      ]
    });
    setShowCreateForm(true);
  };

  const updateVariant = (index, field, value) => {
    const newVariants = [...abTestFormData.variants];
    newVariants[index][field] = value;
    setAbTestFormData({ ...abTestFormData, variants: newVariants });
  };

  const addVariant = () => {
    const newVariants = [...abTestFormData.variants];
    const splitPercentage = Math.floor(100 / (newVariants.length + 1));

    // Redistribute traffic evenly
    newVariants.forEach(v => v.traffic_split = splitPercentage);
    newVariants.push({
      name: String.fromCharCode(65 + newVariants.length),
      traffic_split: splitPercentage,
      content: ''
    });

    setAbTestFormData({ ...abTestFormData, variants: newVariants });
  };

  const removeVariant = (index) => {
    if (abTestFormData.variants.length <= 2) return; // Must have at least 2 variants

    const newVariants = abTestFormData.variants.filter((_, i) => i !== index);
    const splitPercentage = Math.floor(100 / newVariants.length);
    newVariants.forEach(v => v.traffic_split = splitPercentage);

    setAbTestFormData({ ...abTestFormData, variants: newVariants });
  };

  if (loading && activeTab === 'analytics') {
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
    <AdminLayout title="Analytics Dashboard">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Analytics Dashboard</h1>
            <p className="text-slate-400 mt-1">Comprehensive insights and performance metrics for your platform</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                setActiveTab('analytics');
                window.location.hash = 'analytics';
              }}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analytics'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              📊 Analytics
            </button>
            <button
              onClick={() => {
                setActiveTab('heatmaps');
                window.location.hash = 'heatmaps';
              }}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'heatmaps'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              🔥 Heatmaps
            </button>
            <button
              onClick={() => {
                setActiveTab('ab-tests');
                window.location.hash = 'ab-tests';
              }}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'ab-tests'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              🧪 A/B Tests
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'heatmaps' && renderHeatmapsTab()}
        {activeTab === 'ab-tests' && renderAbTestsTab()}
      </div>
    </AdminLayout>
  );

  function renderAnalyticsTab() {
    return (
      <div className="space-y-6">
        {/* Timeframe and Metric Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="timeframe-select bg-slate-700 border border-slate-600 rounded-lg text-slate-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 3 months</option>
            </select>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="timeframe-select bg-slate-700 border border-slate-600 rounded-lg text-slate-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            >
              <option value="all">All Metrics</option>
              <option value="traffic">Traffic</option>
              <option value="engagement">Engagement</option>
              <option value="conversion">Conversion</option>
            </select>
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
                <span className="stat-label">Avg Scroll Depth</span>
              </div>
              <div className="stat-value">{animatedScrollDepth}%</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>User engagement</span>
              </div>
            </div>

            {realtimeVisitors > 0 && (
              <div className="stat-card-shopify" style={{ borderColor: '#10B981' }}>
                <div className="stat-header">
                  <span className="stat-label">Live Visitors</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div className="stat-value text-green-400">{realtimeVisitors}</div>
                <div className="stat-trend positive">
                  <span>Active now</span>
                </div>
              </div>
            )}
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
                  <ComposedChart data={dailyTrends}>
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

            {/* Top Pages */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="text-heading">Top Pages</h3>
              </div>
              <div className="chart-container">
                <div className="geo-list">
                  {topPages.length === 0 ? (
                    <div className="text-center text-slate-400 py-4">
                      No page view data yet. Start browsing your site to collect data.
                    </div>
                  ) : (
                    topPages.slice(0, 5).map((page, index) => {
                      const maxViews = topPages[0]?.views || 1;
                      const percentage = Math.round((page.views / maxViews) * 100);
                      return (
                        <div key={index} className="geo-item">
                          <div className="geo-info">
                            <span className="geo-country">{page.page_path}</span>
                            <span className="geo-users">{page.views.toLocaleString()} views</span>
                          </div>
                          <div className="geo-bar-container">
                            <div
                              className="geo-bar"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: 'var(--color-primary)'
                              }}
                            ></div>
                            <span className="geo-percentage">{page.unique_visitors} unique</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderHeatmapsTab() {
    if (heatmapLoading && heatmapSessions.length === 0) {
      return (
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <div className="text-lg text-slate-300">Loading heatmap data...</div>
            </div>
          </div>
        </div>
      );
    }

    if (heatmapError) {
      return (
        <div className="p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error! </strong>
            <span className="block sm:inline">{heatmapError}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Heatmap Configuration Tab */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Heatmap Management</h2>
            <p className="text-slate-400 mt-1">Track user interactions and configure heatmap services</p>
          </div>
          <button
            onClick={saveHeatmapConfig}
            disabled={saving}
            className="mt-4 sm:mt-0 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        {/* Custom Heatmap Status */}
        <div className="bg-emerald-900/30 border border-emerald-600/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-emerald-300">🎯 In-House Heatmap Tracking</h3>
              <p className="text-sm text-emerald-400/80">Built-in heatmap solution - no external services needed</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-emerald-400">Active</div>
              <div className="text-sm text-emerald-400/80">Auto-collecting data</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-800 p-3 rounded border border-slate-700">
              <div className="font-medium text-emerald-400">✅ Click Tracking</div>
              <div className="text-slate-400">Position, element, timestamp</div>
            </div>
            <div className="bg-slate-800 p-3 rounded border border-slate-700">
              <div className="font-medium text-emerald-400">✅ Mouse Movement</div>
              <div className="text-slate-400">Attention & hover patterns</div>
            </div>
            <div className="bg-slate-800 p-3 rounded border border-slate-700">
              <div className="font-medium text-emerald-400">✅ Scroll Depth</div>
              <div className="text-slate-400">Fold views & engagement</div>
            </div>
          </div>
        </div>

        {/* In-House Heatmap Viewer */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200">Heatmap Viewer</h3>
            <p className="text-sm text-slate-400">Select a page to view interaction data</p>
          </div>

          <div className="p-6">
            {/* Date Filter */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={heatmapFilters.start_date}
                  onChange={(e) => setHeatmapFilters(prev => ({ ...prev, start_date: e.target.value }))}
                  className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={heatmapFilters.end_date}
                  onChange={(e) => setHeatmapFilters(prev => ({ ...prev, end_date: e.target.value }))}
                  className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-200"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchHeatmapPages}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded transition-colors"
                >
                  Refresh Data
                </button>
              </div>
            </div>

            {/* Pages List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <h4 className="text-slate-300 font-medium mb-3">Pages with Data</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {heatmapPages.length === 0 ? (
                    <div className="text-slate-500 text-sm p-4 bg-slate-700/50 rounded">
                      No heatmap data collected yet. Browse your site to start collecting data.
                    </div>
                  ) : (
                    heatmapPages.map((page, idx) => (
                      <div
                        key={idx}
                        onClick={() => fetchHeatmapData(page.page_path, 'clicks')}
                        className={`p-3 rounded cursor-pointer transition-colors ${
                          selectedHeatmapPage === page.page_path
                            ? 'bg-emerald-900/50 border border-emerald-600'
                            : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
                        }`}
                      >
                        <div className="text-slate-200 font-medium truncate">{page.page_path}</div>
                        <div className="text-sm text-slate-400 mt-1">
                          {page.total_clicks} clicks • {page.unique_sessions} sessions
                        </div>
                        {page.avg_scroll_depth > 0 && (
                          <div className="text-sm text-slate-500">
                            Avg scroll: {page.avg_scroll_depth}%
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="lg:col-span-2">
                {selectedHeatmapPage ? (
                  <div>
                    {/* View Type Tabs */}
                    <div className="flex gap-2 mb-4">
                      {['clicks', 'movements', 'scroll'].map(type => (
                        <button
                          key={type}
                          onClick={() => fetchHeatmapData(selectedHeatmapPage, type)}
                          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                            heatmapViewType === type
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {type === 'clicks' && '🖱️ Clicks'}
                          {type === 'movements' && '👆 Movement'}
                          {type === 'scroll' && '📜 Scroll'}
                        </button>
                      ))}
                    </div>

                    {/* Heatmap Canvas */}
                    {heatmapDataLoading ? (
                      <div className="flex items-center justify-center h-64 bg-slate-700/50 rounded">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                      </div>
                    ) : (
                      <div className="relative bg-slate-900 rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
                        {/* Page screenshot would go here as background */}
                        <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">
                          Page: {selectedHeatmapPage}
                        </div>
                        <canvas
                          ref={heatmapCanvasRef}
                          width={800}
                          height={600}
                          className="w-full h-auto relative z-10"
                          style={{ background: 'transparent' }}
                        />
                      </div>
                    )}

                    {/* Stats Summary */}
                    {heatmapData && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {heatmapViewType === 'clicks' && (
                          <>
                            <div className="bg-slate-700/50 rounded p-3">
                              <div className="text-slate-400 text-sm">Total Clicks</div>
                              <div className="text-xl font-bold text-slate-200">{heatmapData.total_clicks || 0}</div>
                            </div>
                            <div className="bg-slate-700/50 rounded p-3">
                              <div className="text-slate-400 text-sm">Hot Zones</div>
                              <div className="text-xl font-bold text-slate-200">{heatmapData.heatmap?.length || 0}</div>
                            </div>
                          </>
                        )}
                        {heatmapViewType === 'movements' && (
                          <>
                            <div className="bg-slate-700/50 rounded p-3">
                              <div className="text-slate-400 text-sm">Sessions</div>
                              <div className="text-xl font-bold text-slate-200">{heatmapData.total_sessions || 0}</div>
                            </div>
                            <div className="bg-slate-700/50 rounded p-3">
                              <div className="text-slate-400 text-sm">Total Points</div>
                              <div className="text-xl font-bold text-slate-200">{heatmapData.total_points || 0}</div>
                            </div>
                          </>
                        )}
                        {heatmapViewType === 'scroll' && (
                          <>
                            <div className="bg-slate-700/50 rounded p-3">
                              <div className="text-slate-400 text-sm">Sessions</div>
                              <div className="text-xl font-bold text-slate-200">{heatmapData.total_sessions || 0}</div>
                            </div>
                            <div className="bg-slate-700/50 rounded p-3">
                              <div className="text-slate-400 text-sm">Avg Scroll Depth</div>
                              <div className="text-xl font-bold text-slate-200">{heatmapData.avg_scroll_depth || 0}%</div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Top Clicked Elements */}
                    {heatmapViewType === 'clicks' && heatmapData?.element_stats?.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-slate-300 font-medium mb-2">Top Clicked Elements</h5>
                        <div className="bg-slate-700/50 rounded overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-700">
                              <tr>
                                <th className="text-left text-slate-400 px-3 py-2">Element</th>
                                <th className="text-left text-slate-400 px-3 py-2">ID/Class</th>
                                <th className="text-right text-slate-400 px-3 py-2">Clicks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {heatmapData.element_stats.slice(0, 5).map((el, idx) => (
                                <tr key={idx} className="border-t border-slate-600">
                                  <td className="px-3 py-2 text-slate-300">&lt;{el.tag?.toLowerCase()}&gt;</td>
                                  <td className="px-3 py-2 text-slate-400 truncate max-w-xs">
                                    {el.id ? `#${el.id}` : el.class ? `.${el.class.split(' ')[0]}` : '-'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-emerald-400">{el.count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-slate-700/30 rounded-lg border-2 border-dashed border-slate-600">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🔥</div>
                      <div className="text-slate-400">Select a page to view heatmap data</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Third-Party Integrations Header */}
        <div className="border-t border-slate-700 pt-6">
          <h3 className="text-lg font-semibold text-slate-300 mb-4">Third-Party Integrations (Optional)</h3>
          <p className="text-slate-500 text-sm mb-4">Connect external heatmap services for additional features like session recordings.</p>
        </div>

        {/* Hotjar Configuration */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Hotjar</h3>
              <p className="text-sm text-gray-600">Record user sessions and generate heatmaps</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={!!heatmapConfig.hotjar?.enabled}
                onChange={(e) => setHeatmapConfig(prev => ({
                  ...prev,
                  hotjar: { ...prev.hotjar, enabled: e.target.checked }
                }))}
                className="rounded border-gray-300"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Enable</span>
            </label>
          </div>

          {heatmapConfig.hotjar?.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hotjar ID (hjid)
                </label>
                <input
                  type="text"
                  value={heatmapConfig.hotjar?.hjid || ''}
                  onChange={(e) => setHeatmapConfig(prev => ({
                    ...prev,
                    hotjar: { ...prev.hotjar, hjid: e.target.value }
                  }))}
                  placeholder="1234567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Find this in your Hotjar dashboard under Settings → Sites & Organizations
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hotjar Snippet Version (hjsv)
                </label>
                <input
                  type="text"
                  value={heatmapConfig.hotjar?.hjsv || ''}
                  onChange={(e) => setHeatmapConfig(prev => ({
                    ...prev,
                    hotjar: { ...prev.hotjar, hjsv: e.target.value }
                  }))}
                  placeholder="6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usually '6' (current version)
                </p>
              </div>
            </div>
          )}

          {heatmapConfig.hotjar?.enabled && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
              <p className="text-sm text-orange-800">
                <strong>Note:</strong> Make sure you have a Hotjar account and have added your domain to your Hotjar site settings.
                <a
                  href="https://help.hotjar.com/hc/en-us/articles/115009336727-How-to-Install-your-Hotjar-Tracking-Code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 underline ml-1"
                >
                  Learn more →
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Microsoft Clarity Configuration */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Microsoft Clarity</h3>
              <p className="text-sm text-gray-600">Free heatmaps and session recordings</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={!!heatmapConfig.clarity?.enabled}
                onChange={(e) => setHeatmapConfig(prev => ({
                  ...prev,
                  clarity: { ...prev.clarity, enabled: e.target.checked }
                }))}
                className="rounded border-gray-300"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Enable</span>
            </label>
          </div>

          {heatmapConfig.clarity?.enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clarity Project ID
              </label>
              <input
                type="text"
                value={heatmapConfig.clarity?.clarity_id || ''}
                onChange={(e) => setHeatmapConfig(prev => ({
                  ...prev,
                  clarity: { ...prev.clarity, clarity_id: e.target.value }
                }))}
                placeholder="abcdefghij"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">
                Find this in your Microsoft Clarity dashboard under Setup
              </p>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Free:</strong> Microsoft Clarity is completely free with unlimited heatmaps and recordings.
                  <a
                    href="https://docs.microsoft.com/en-us/clarity/setup-and-installation/clarity-setup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline ml-1"
                  >
                    Get started →
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Custom Scripts */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Custom Tracking Scripts</h3>
              <p className="text-sm text-gray-600">Add custom JavaScript for other analytics tools</p>
            </div>
            <button
              onClick={() => setShowCustomScript(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
            >
              Add Script
            </button>
          </div>

          {/* Custom Script Form */}
          {showCustomScript && (
            <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Add Custom Script</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Script Name
                  </label>
                  <input
                    type="text"
                    value={customScript.name}
                    onChange={(e) => setCustomScript(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Google Analytics, FullStory, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    JavaScript Code
                  </label>
                  <textarea
                    value={customScript.script}
                    onChange={(e) => setCustomScript(prev => ({ ...prev, script: e.target.value }))}
                    placeholder="// Your tracking code here"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                    rows="4"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={addCustomScript}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Add Script
                  </button>
                  <button
                    onClick={() => setShowCustomScript(false)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Custom Scripts List */}
          {Array.isArray(heatmapConfig.custom_scripts) && heatmapConfig.custom_scripts.length > 0 && (
            <div className="space-y-2">
              {heatmapConfig.custom_scripts.map((script) => (
                <div key={script.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <h5 className="font-medium text-gray-900">{script.name}</h5>
                    <p className="text-sm text-gray-500 font-mono">
                      {script.script.length} characters
                    </p>
                  </div>
                  <button
                    onClick={() => removeCustomScript(script.id)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {(!Array.isArray(heatmapConfig.custom_scripts) || heatmapConfig.custom_scripts.length === 0) && !showCustomScript && (
            <p className="text-gray-500 text-center py-4">
              No custom scripts configured
            </p>
          )}
        </div>

        {/* Implementation Code */}
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Implementation Code</h3>
          <p className="text-sm text-gray-600 mb-3">
            Add this code to your page templates or use our analytics script:
          </p>

          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
              {generateImplementationCode()}
            </pre>
          </div>

          <div className="mt-4 flex items-center space-x-4">
            <button
              onClick={() => navigator.clipboard.writeText(generateImplementationCode())}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
            >
              Copy Code
            </button>
            <p className="text-sm text-gray-600">
              Our analytics.js script includes the HeatmapIntegration helper functions
            </p>
          </div>
        </div>

        {/* Heatmap Services Comparison */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-blue-900 mb-4">Heatmap Services Comparison</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left">
                  <th className="text-blue-800 font-medium p-2">Service</th>
                  <th className="text-blue-800 font-medium p-2">Free Plan</th>
                  <th className="text-blue-800 font-medium p-2">Features</th>
                  <th className="text-blue-800 font-medium p-2">Best For</th>
                </tr>
              </thead>
              <tbody className="text-blue-700 text-sm">
                <tr className="border-t border-blue-200">
                  <td className="p-2 font-medium">Microsoft Clarity</td>
                  <td className="p-2">✅ Unlimited</td>
                  <td className="p-2">Heatmaps, Session recordings, Insights</td>
                  <td className="p-2">Most users (free & powerful)</td>
                </tr>
                <tr className="border-t border-blue-200">
                  <td className="p-2 font-medium">Hotjar</td>
                  <td className="p-2">Limited (35 sessions/day)</td>
                  <td className="p-2">Heatmaps, Recordings, Surveys, Funnels</td>
                  <td className="p-2">Advanced feedback features</td>
                </tr>
                <tr className="border-t border-blue-200">
                  <td className="p-2 font-medium">FullStory</td>
                  <td className="p-2">Limited (1000 sessions/month)</td>
                  <td className="p-2">Complete session replay, Search</td>
                  <td className="p-2">Detailed user behavior analysis</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Configuration Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-gray-700">Hotjar Integration</span>
              <span className={`px-2 py-1 text-xs rounded ${
                heatmapConfig.hotjar?.enabled && heatmapConfig.hotjar?.hjid
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {heatmapConfig.hotjar?.enabled && heatmapConfig.hotjar?.hjid ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-gray-700">Microsoft Clarity Integration</span>
              <span className={`px-2 py-1 text-xs rounded ${
                heatmapConfig.clarity?.enabled && heatmapConfig.clarity?.clarity_id
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {heatmapConfig.clarity?.enabled && heatmapConfig.clarity?.clarity_id ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-gray-700">Custom Scripts</span>
              <span className={`px-2 py-1 text-xs rounded ${
                Array.isArray(heatmapConfig.custom_scripts) && heatmapConfig.custom_scripts.length > 0
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {Array.isArray(heatmapConfig.custom_scripts) ? heatmapConfig.custom_scripts.length : 0} configured
              </span>
            </div>
          </div>
        </div>

        {/* External Heatmap Services Info */}
        <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-4">View Heatmap Data</h3>
          <p className="text-slate-300 mb-4">
            Once you've configured Hotjar or Microsoft Clarity above, you can view your heatmap data,
            session recordings, and user behavior analytics directly in their dashboards.
          </p>
          <div className="flex flex-wrap gap-4">
            {heatmapConfig.hotjar?.enabled && heatmapConfig.hotjar?.hjid && (
              <a
                href={`https://insights.hotjar.com/sites/${heatmapConfig.hotjar.hjid}/heatmaps`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                Open Hotjar Dashboard
              </a>
            )}
            {heatmapConfig.clarity?.enabled && heatmapConfig.clarity?.clarity_id && (
              <a
                href="https://clarity.microsoft.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Open Clarity Dashboard
              </a>
            )}
            {(!heatmapConfig.hotjar?.enabled && !heatmapConfig.clarity?.enabled) && (
              <p className="text-slate-400">
                Enable Hotjar or Clarity above to start collecting heatmap data.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderAbTestsTab() {
    if (abTestsLoading && experiments.length === 0) {
      return (
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <div className="text-lg text-slate-300">Loading A/B tests data...</div>
            </div>
          </div>
        </div>
      );
    }

    if (abTestsError) {
      return (
        <div className="p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error! </strong>
            <span className="block sm:inline">{abTestsError}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">A/B Testing Experiments</h2>
            <p className="text-slate-400 mt-1">Create and manage split tests to optimize conversions</p>
          </div>
          <button
            onClick={() => { setShowCreateForm(true); resetAbTestForm(); }}
            className="mt-4 sm:mt-0 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Create Experiment
          </button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200">
                {editingExperiment ? 'Edit Experiment' : 'Create New Experiment'}
              </h3>
            </div>
            <div className="p-6">
              <form onSubmit={handleAbTestSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Experiment Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={abTestFormData.name}
                    onChange={(e) => setAbTestFormData({ ...abTestFormData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={abTestFormData.description}
                    onChange={(e) => setAbTestFormData({ ...abTestFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows="2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Path (optional - for specific pages)
                  </label>
                  <input
                    type="text"
                    value={abTestFormData.page_path}
                    onChange={(e) => setAbTestFormData({ ...abTestFormData, page_path: e.target.value })}
                    placeholder="/pricing"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={abTestFormData.status}
                    onChange={(e) => setAbTestFormData({ ...abTestFormData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {/* Variants */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Variants
                    </label>
                    <button
                      type="button"
                      onClick={addVariant}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      + Add Variant
                    </button>
                  </div>

                  <div className="space-y-3">
                    {abTestFormData.variants.map((variant, index) => (
                      <div key={index} className="border border-gray-200 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">Variant {variant.name}</span>
                          {abTestFormData.variants.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeVariant(index)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Traffic Split (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={variant.traffic_split}
                              onChange={(e) => updateVariant(index, 'traffic_split', parseInt(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">HTML Content</label>
                          <textarea
                            value={variant.content}
                            onChange={(e) => updateVariant(index, 'content', e.target.value)}
                            placeholder="<h1>Variant content...</h1>"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            rows="3"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    {editingExperiment ? 'Update Experiment' : 'Create Experiment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreateForm(false); setEditingExperiment(null); }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Experiments List */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200">Experiments</h3>
          </div>

          {experiments.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              No experiments created yet. Create your first A/B test to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Experiment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Page
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Variants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800 divide-y divide-slate-700">
                  {experiments.map((experiment) => (
                    <tr key={experiment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{experiment.name}</div>
                          {experiment.description && (
                            <div className="text-sm text-gray-500">{experiment.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {experiment.page_path || 'All pages'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          experiment.status === 'active' ? 'bg-green-100 text-green-800' :
                          experiment.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {experiment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {experiment.variants ? experiment.variants.length : 2} variants
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(experiment.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => fetchExperimentResults(experiment.experiment_id || experiment.id)}
                          className="text-emerald-400 hover:text-emerald-300 mr-3"
                        >
                          Results
                        </button>
                        <button
                          onClick={() => editExperiment(experiment)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleAbTestDelete(experiment.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Results Modal/Panel */}
        {selectedExperimentResults && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-200">
                Results: {selectedExperimentResults.experiment?.name || 'Experiment'}
              </h3>
              <button
                onClick={() => setSelectedExperimentResults(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-6">
              {resultsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading results...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm">Total Assignments</p>
                      <p className="text-2xl font-bold text-slate-100">
                        {selectedExperimentResults.summary?.total_assignments || 0}
                      </p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm">Total Conversions</p>
                      <p className="text-2xl font-bold text-emerald-400">
                        {selectedExperimentResults.summary?.total_conversions || 0}
                      </p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm">Overall Conversion Rate</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {selectedExperimentResults.summary?.overall_conversion_rate?.toFixed(2) || 0}%
                      </p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm">Statistical Confidence</p>
                      <p className={`text-2xl font-bold ${
                        selectedExperimentResults.statistical_significance?.is_significant
                          ? 'text-green-400'
                          : 'text-yellow-400'
                      }`}>
                        {selectedExperimentResults.statistical_significance?.confidence_level?.toFixed(1) || 0}%
                      </p>
                    </div>
                  </div>

                  {/* Variant Comparison */}
                  <div>
                    <h4 className="text-slate-300 font-medium mb-4">Variant Performance</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedExperimentResults.variants?.map((variant, index) => (
                        <div
                          key={variant.variant}
                          className={`rounded-lg p-4 border ${
                            selectedExperimentResults.statistical_significance?.winner === variant.variant
                              ? 'bg-emerald-900/30 border-emerald-500'
                              : 'bg-slate-700/50 border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-lg font-semibold text-slate-200">
                              Variant {variant.variant}
                              {selectedExperimentResults.statistical_significance?.winner === variant.variant && (
                                <span className="ml-2 text-xs bg-emerald-500 text-white px-2 py-1 rounded">
                                  WINNER
                                </span>
                              )}
                            </h5>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Assignments:</span>
                              <span className="text-slate-200">{variant.assignments}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Conversions:</span>
                              <span className="text-slate-200">{variant.conversions}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Conversion Rate:</span>
                              <span className="text-emerald-400 font-semibold">
                                {variant.conversion_rate?.toFixed(2)}%
                              </span>
                            </div>
                            {variant.total_value > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Total Value:</span>
                                <span className="text-blue-400">${variant.total_value?.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${variant.conversion_rate || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Statistical Significance */}
                  <div className={`rounded-lg p-4 ${
                    selectedExperimentResults.statistical_significance?.is_significant
                      ? 'bg-green-900/30 border border-green-600'
                      : 'bg-yellow-900/30 border border-yellow-600'
                  }`}>
                    <h4 className={`font-medium mb-2 ${
                      selectedExperimentResults.statistical_significance?.is_significant
                        ? 'text-green-300'
                        : 'text-yellow-300'
                    }`}>
                      {selectedExperimentResults.statistical_significance?.is_significant
                        ? '✓ Statistically Significant'
                        : '⚠ Not Yet Significant'}
                    </h4>
                    <p className="text-slate-300 text-sm">
                      {selectedExperimentResults.statistical_significance?.is_significant
                        ? `Variant ${selectedExperimentResults.statistical_significance.winner} is performing better with ${selectedExperimentResults.statistical_significance.confidence_level?.toFixed(1)}% confidence. The improvement is ${selectedExperimentResults.statistical_significance.improvement?.toFixed(2)}%.`
                        : selectedExperimentResults.statistical_significance?.message || 'Collect more data to reach statistical significance (95% confidence).'}
                    </p>
                    {selectedExperimentResults.statistical_significance?.z_score && (
                      <p className="text-slate-400 text-xs mt-2">
                        Z-Score: {selectedExperimentResults.statistical_significance.z_score?.toFixed(3)} |
                        P-Value: {selectedExperimentResults.statistical_significance.p_value?.toFixed(4)}
                      </p>
                    )}
                  </div>

                  {/* Conversion Types Breakdown */}
                  {selectedExperimentResults.conversion_types?.length > 0 && (
                    <div>
                      <h4 className="text-slate-300 font-medium mb-3">Conversion Types</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-700">
                          <thead className="bg-slate-900/50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-300 uppercase">Type</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-300 uppercase">Count</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-300 uppercase">Total Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {selectedExperimentResults.conversion_types.map((type, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-2 text-slate-200">{type.type}</td>
                                <td className="px-4 py-2 text-slate-200">{type.count}</td>
                                <td className="px-4 py-2 text-slate-200">${type.total_value?.toFixed(2) || '0.00'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Implementation Guide */}
        <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-emerald-300 mb-4">Implementation Guide</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-emerald-300 mb-2">JavaScript Implementation:</h5>
              <pre className="bg-slate-800 text-slate-200 p-3 rounded text-xs overflow-x-auto border border-slate-700">
{`// Apply A/B test variant
ABTest.applyVariant(1, '#hero-section').then(variant => {
  console.log('Applied variant:', variant.variant);
});

// Get variant data only
ABTest.getVariant(1).then(variant => {
  if (variant.variant === 'B') {
    // Custom logic for variant B
  }
});`}
              </pre>
            </div>
            <div>
              <h5 className="font-medium text-emerald-300 mb-2">HTML Target Example:</h5>
              <pre className="bg-slate-800 text-slate-200 p-3 rounded text-xs overflow-x-auto border border-slate-700">
{`<!-- Original content -->
<div id="hero-section">
  <h1>Original headline</h1>
  <p>Original description</p>
</div>

<!-- Will be replaced by variant content -->`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }
}