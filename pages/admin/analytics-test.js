import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';

export default function AnalyticsTest() {
  const [testResults, setTestResults] = useState({});
  const [testLog, setTestLog] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [heatmapStats, setHeatmapStats] = useState(null);
  const [liveData, setLiveData] = useState({
    pageViews: 0,
    clicks: 0,
    events: 0
  });

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev, { timestamp, message, type }]);
  };

  // Real-time analytics data update
  const updateLiveData = () => {
    if (typeof window !== 'undefined' && window.Analytics) {
      setAnalytics(window.Analytics);
    }
    if (typeof window !== 'undefined' && window.CustomHeatmap) {
      setHeatmapStats(window.CustomHeatmap.getStats());
    }
  };

  // Core Analytics Tests
  const runCoreAnalyticsTests = async () => {
    addLog('🧪 Testing Core Analytics Features...', 'info');
    
    // Test 1: Analytics object availability
    if (typeof window.Analytics !== 'undefined') {
      setTestResults(prev => ({ ...prev, analyticsLoaded: true }));
      addLog('✅ Analytics object loaded successfully', 'success');
      
      // Test session ID
      if (window.Analytics.sessionId && window.Analytics.sessionId.startsWith('sess_')) {
        setTestResults(prev => ({ ...prev, sessionId: true }));
        addLog(`✅ Session ID: ${window.Analytics.sessionId}`, 'success');
      }
    } else {
      setTestResults(prev => ({ ...prev, analyticsLoaded: false }));
      addLog('❌ Analytics object not found', 'error');
    }

    // Test 2: Custom event tracking
    try {
      window.Analytics.track('admin_test_event', '/admin/analytics-test', { 
        test_type: 'automated',
        feature: 'custom_tracking',
        timestamp: Date.now()
      });
      setTestResults(prev => ({ ...prev, customEvent: true }));
      addLog('✅ Custom event tracking works', 'success');
      setLiveData(prev => ({ ...prev, events: prev.events + 1 }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, customEvent: false }));
      addLog('❌ Custom event tracking failed: ' + error.message, 'error');
    }

    // Test 3: API call tracking
    try {
      window.Analytics.trackApiCall('/api/analytics/test', 'POST', true, { 
        response_time: Math.floor(Math.random() * 200) + 50
      });
      setTestResults(prev => ({ ...prev, apiTracking: true }));
      addLog('✅ API call tracking works', 'success');
    } catch (error) {
      setTestResults(prev => ({ ...prev, apiTracking: false }));
      addLog('❌ API call tracking failed: ' + error.message, 'error');
    }
  };

  // A/B Testing Tests
  const runABTestTests = async () => {
    addLog('🧪 Testing A/B Testing Features...', 'info');
    
    if (typeof window.ABTest !== 'undefined') {
      setTestResults(prev => ({ ...prev, abTestLoaded: true }));
      addLog('✅ ABTest object loaded', 'success');

      try {
        // Test getting a variant
        const variant = await window.ABTest.getVariant(1);
        if (variant && variant.variant) {
          setTestResults(prev => ({ ...prev, getVariant: true }));
          addLog(`✅ A/B Test variant: ${variant.variant}`, 'success');
          
          // Test applying variant
          await window.ABTest.applyVariant(1, '#ab-test-target');
          setTestResults(prev => ({ ...prev, applyVariant: true }));
          addLog('✅ A/B Test variant applied', 'success');
        }
      } catch (error) {
        setTestResults(prev => ({ ...prev, getVariant: false, applyVariant: false }));
        addLog('❌ A/B Test failed: ' + error.message, 'error');
      }
    } else {
      setTestResults(prev => ({ ...prev, abTestLoaded: false }));
      addLog('❌ ABTest object not found', 'error');
    }
  };

  // Heatmap Tests
  const runHeatmapTests = () => {
    addLog('🧪 Testing Custom Heatmap Features...', 'info');
    
    if (typeof window.CustomHeatmap !== 'undefined') {
      setTestResults(prev => ({ ...prev, heatmapLoaded: true }));
      addLog('✅ CustomHeatmap object loaded', 'success');

      // Test heatmap data collection
      const stats = window.CustomHeatmap.getStats();
      if (stats && stats.sessionId) {
        setTestResults(prev => ({ ...prev, heatmapStats: true }));
        addLog(`✅ Heatmap collecting data: ${stats.totalClicks} clicks, ${stats.sessionDuration}s session`, 'success');
      }

      // Test heatmap controls
      if (typeof window.CustomHeatmap.startRecording === 'function') {
        setTestResults(prev => ({ ...prev, heatmapControls: true }));
        addLog('✅ Heatmap recording controls available', 'success');
      }
    } else {
      setTestResults(prev => ({ ...prev, heatmapLoaded: false }));
      addLog('❌ CustomHeatmap object not found', 'error');
    }
  };

  // Third-party Integration Tests
  const runIntegrationTests = () => {
    addLog('🧪 Testing Third-party Integrations...', 'info');
    
    if (typeof window.HeatmapIntegration !== 'undefined') {
      setTestResults(prev => ({ ...prev, thirdPartyIntegration: true }));
      addLog('✅ Third-party heatmap integration available', 'success');

      // Test Hotjar integration
      if (typeof window.HeatmapIntegration.initHotjar === 'function') {
        setTestResults(prev => ({ ...prev, hotjarIntegration: true }));
        addLog('✅ Hotjar integration ready', 'success');
      }

      // Test Clarity integration
      if (typeof window.HeatmapIntegration.initClarity === 'function') {
        setTestResults(prev => ({ ...prev, clarityIntegration: true }));
        addLog('✅ Microsoft Clarity integration ready', 'success');
      }
    } else {
      setTestResults(prev => ({ ...prev, thirdPartyIntegration: false }));
      addLog('❌ Third-party integrations not found', 'error');
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setTestLog([]);
    setTestResults({});
    addLog('🚀 Starting Comprehensive Analytics Test Suite...', 'info');
    
    await runCoreAnalyticsTests();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await runABTestTests();
    await new Promise(resolve => setTimeout(resolve, 500));
    runHeatmapTests();
    await new Promise(resolve => setTimeout(resolve, 500));
    runIntegrationTests();
    
    addLog('🏁 All tests completed!', 'info');
    updateLiveData();
  };

  // Interactive test functions
  const testButtonClick = () => {
    addLog('🖱️ Button clicked - should be tracked automatically', 'info');
    setLiveData(prev => ({ ...prev, clicks: prev.clicks + 1 }));
  };

  const testLinkClick = (e) => {
    e.preventDefault();
    addLog('🔗 Link clicked - should be tracked automatically', 'info');
    setLiveData(prev => ({ ...prev, clicks: prev.clicks + 1 }));
  };

  const testFormSubmission = (e) => {
    e.preventDefault();
    addLog('📝 Form submitted - should be tracked automatically', 'info');
    
    // Simulate API call tracking
    if (window.Analytics) {
      window.Analytics.trackApiCall('/api/contact', 'POST', true, {
        form_data: formData,
        validation_passed: true
      });
    }
    
    setLiveData(prev => ({ ...prev, events: prev.events + 1 }));
    setFormData({ name: '', email: '', message: '' });
  };

  const toggleHeatmapVisualization = () => {
    if (typeof window.CustomHeatmap !== 'undefined') {
      if (heatmapVisible) {
        window.CustomHeatmap.removeOverlay();
        addLog('🎯 Heatmap visualization hidden', 'info');
      } else {
        window.CustomHeatmap.createOverlay();
        addLog('🎯 Heatmap visualization shown', 'info');
      }
      setHeatmapVisible(!heatmapVisible);
    }
  };

  const clearHeatmapData = () => {
    if (typeof window.CustomHeatmap !== 'undefined') {
      window.CustomHeatmap.clearData();
      addLog('🗑️ Heatmap data cleared', 'info');
      updateLiveData();
    }
  };

  const sendHeatmapData = () => {
    if (typeof window.CustomHeatmap !== 'undefined') {
      window.CustomHeatmap.sendData();
      addLog('📤 Heatmap data sent to server', 'info');
    }
  };

  // Update live data periodically
  useEffect(() => {
    const timer = setInterval(updateLiveData, 2000);
    return () => clearInterval(timer);
  }, []);

  // Auto-run tests on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      runAllTests();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const getTestStatus = () => {
    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(Boolean).length;
    return { total: totalTests, passed: passedTests };
  };

  const { total, passed } = getTestStatus();

  return (
    <>
      <Head>
        <title>Analytics Testing Suite - Admin</title>
        <script src="/analytics.js"></script>
        <script src="/heatmap.js"></script>
      </Head>
      
      <AdminLayout title="Analytics Testing Suite">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-slate-100 mb-2">Analytics Testing Suite</h1>
            <p className="text-slate-400">Comprehensive testing for all analytics features including custom heatmaps</p>
          </div>

          {/* Live Analytics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-slate-400">Session ID</h3>
              <p className="text-lg font-bold text-slate-100 font-mono" suppressHydrationWarning>
                {analytics?.sessionId ? analytics.sessionId.substr(-8) : (
                  <span className="flex items-center">
                    <div className="w-4 h-4 mr-2 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </span>
                )}
              </p>
            </div>
            
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-slate-400">Live Clicks</h3>
              <p className="text-2xl font-bold text-emerald-400" suppressHydrationWarning>
                {heatmapStats?.totalClicks || 0}
              </p>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-slate-400">Session Duration</h3>
              <p className="text-2xl font-bold text-emerald-400" suppressHydrationWarning>
                {heatmapStats?.sessionDuration || 0}s
              </p>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-slate-400">Test Status</h3>
              <p className="text-2xl font-bold text-emerald-400" suppressHydrationWarning>
                {total > 0 ? `${passed}/${total}` : '0/0'}
              </p>
            </div>
          </div>

          {/* Test Results Summary */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-100">Test Results</h2>
              <button
                onClick={runAllTests}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                🔄 Run All Tests
              </button>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold" suppressHydrationWarning>
                  <span className={passed === total && total > 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {passed}/{total}
                  </span>
                </div>
                <div className="text-slate-400" suppressHydrationWarning>
                  tests passed ({total > 0 ? Math.round((passed/total) * 100) : 0}% success rate)
                </div>
              </div>
              
              {total > 0 && (
                <div className="mt-2 w-full bg-slate-700 rounded-full h-3" suppressHydrationWarning>
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      passed === total ? 'bg-emerald-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${(passed/total) * 100}%` }}
                  ></div>
                </div>
              )}
            </div>

            {/* Detailed Test Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-700/50 border border-slate-600 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-200 mb-3">Core Analytics</h3>
                <div className="space-y-2 text-sm">
                  <TestResult result={testResults.analyticsLoaded} label="Analytics Loaded" />
                  <TestResult result={testResults.sessionId} label="Session ID" />
                  <TestResult result={testResults.customEvent} label="Custom Events" />
                  <TestResult result={testResults.apiTracking} label="API Tracking" />
                </div>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-200 mb-3">A/B Testing</h3>
                <div className="space-y-2 text-sm">
                  <TestResult result={testResults.abTestLoaded} label="ABTest Loaded" />
                  <TestResult result={testResults.getVariant} label="Get Variant" />
                  <TestResult result={testResults.applyVariant} label="Apply Variant" />
                </div>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-200 mb-3">Custom Heatmaps</h3>
                <div className="space-y-2 text-sm">
                  <TestResult result={testResults.heatmapLoaded} label="Heatmap Loaded" />
                  <TestResult result={testResults.heatmapStats} label="Data Collection" />
                  <TestResult result={testResults.heatmapControls} label="Controls Available" />
                </div>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-200 mb-3">Integrations</h3>
                <div className="space-y-2 text-sm">
                  <TestResult result={testResults.thirdPartyIntegration} label="Integration Hub" />
                  <TestResult result={testResults.hotjarIntegration} label="Hotjar Ready" />
                  <TestResult result={testResults.clarityIntegration} label="Clarity Ready" />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Testing Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Interactive Tests</h3>
              
              <div className="space-y-4">
                <button
                  onClick={testButtonClick}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg transition-colors"
                >
                  🖱️ Test Button Click Tracking
                </button>

                <a
                  href="#"
                  onClick={testLinkClick}
                  className="block w-full bg-slate-600 hover:bg-slate-700 text-white px-4 py-3 rounded-lg text-center transition-colors"
                >
                  🔗 Test Link Click Tracking
                </a>

                <form onSubmit={testFormSubmission} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-slate-200 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="Your email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-slate-200 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  <textarea
                    placeholder="Your message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-slate-200 placeholder-slate-400 rounded-lg h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg transition-colors"
                  >
                    📝 Test Form Submission
                  </button>
                </form>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Heatmap Controls</h3>
              
              <div className="space-y-4">
                <button
                  onClick={toggleHeatmapVisualization}
                  className={`w-full px-4 py-3 rounded-lg transition-colors ${
                    heatmapVisible 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {heatmapVisible ? '🙈 Hide Heatmap' : '👁️ Show Heatmap Visualization'}
                </button>

                <button
                  onClick={clearHeatmapData}
                  className="w-full bg-slate-600 hover:bg-slate-700 text-white px-4 py-3 rounded-lg transition-colors"
                >
                  🗑️ Clear Heatmap Data
                </button>

                <button
                  onClick={sendHeatmapData}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg transition-colors"
                >
                  📤 Send Data to Server
                </button>

                {heatmapStats && (
                  <div className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-sm">
                    <div className="grid grid-cols-2 gap-2 text-slate-300">
                      <div>Clicks: <span className="font-bold text-slate-200">{heatmapStats.totalClicks}</span></div>
                      <div>Mouse Moves: <span className="font-bold text-slate-200">{heatmapStats.totalMouseMoves}</span></div>
                      <div>Scroll Events: <span className="font-bold text-slate-200">{heatmapStats.totalScrollEvents}</span></div>
                      <div>Duration: <span className="font-bold text-slate-200">{heatmapStats.sessionDuration}s</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* A/B Test Target */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">A/B Test Target Area</h3>
            <div 
              id="ab-test-target" 
              className="p-6 bg-slate-700/50 border border-slate-600 rounded-lg"
            >
              <h4 className="text-xl font-bold text-slate-200">Original Content</h4>
              <p className="text-slate-400 mt-2">This content may be replaced by A/B test variant when tests are running.</p>
              <button className="mt-4 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded transition-colors">
                Default CTA Button
              </button>
            </div>
          </div>

          {/* Test Log */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Test Activity Log</h3>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {testLog.map((log, index) => (
                <div
                  key={index}
                  className={`text-sm p-2 rounded ${
                    log.type === 'success' ? 'bg-emerald-900/40 border border-emerald-600/30 text-emerald-300' :
                    log.type === 'error' ? 'bg-red-900/40 border border-red-600/30 text-red-300' :
                    'bg-slate-700/50 border border-slate-600 text-slate-300'
                  }`}
                >
                  <span className="font-mono text-xs text-slate-500">[{log.timestamp}]</span> {log.message}
                </div>
              ))}
              {testLog.length === 0 && (
                <p className="text-slate-400 text-center py-8">Test log is empty. Run tests to see activity.</p>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-emerald-300 mb-3">Admin Panel Quick Links</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <a href="/admin/analytics" className="block bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded text-center text-sm transition-colors">
                    📊 Analytics Dashboard
                  </a>
                  <a href="/admin/ab-tests" className="block bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded text-center text-sm transition-colors">
                    🧪 A/B Tests
                  </a>
                  <a href="/admin/heatmaps" className="block bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded text-center text-sm transition-colors">
                    🎯 Heatmap Setup
                  </a>
                  <a href="/test-analytics" className="block bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded text-center text-sm transition-colors">
                    🔬 Public Test Page
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

// Helper component for test results
function TestResult({ result, label }) {
  const getIcon = () => {
    if (result === true) return '✅';
    if (result === false) return '❌';
    return '⏳';
  };

  const getColor = () => {
    if (result === true) return 'text-emerald-400';
    if (result === false) return 'text-red-400';
    return 'text-slate-500';
  };

  return (
    <div className={`flex items-center ${getColor()}`}>
      <span className="mr-2">{getIcon()}</span>
      {label}
    </div>
  );
}