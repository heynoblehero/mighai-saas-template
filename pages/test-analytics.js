import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function TestAnalytics() {
  const [testResults, setTestResults] = useState({});
  const [testLog, setTestLog] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '' });
  
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev, { timestamp, message, type }]);
  };

  // Test criteria functions
  const runAnalyticsTests = async () => {
    addLog('🧪 Starting Analytics Tests...', 'info');
    
    // Test 1: Check if Analytics object exists
    if (typeof window.Analytics !== 'undefined') {
      setTestResults(prev => ({ ...prev, analyticsLoaded: true }));
      addLog('✅ Analytics object loaded successfully', 'success');
    } else {
      setTestResults(prev => ({ ...prev, analyticsLoaded: false }));
      addLog('❌ Analytics object not found', 'error');
      return;
    }

    // Test 2: Check session ID generation
    if (window.Analytics.sessionId && window.Analytics.sessionId.startsWith('sess_')) {
      setTestResults(prev => ({ ...prev, sessionId: true }));
      addLog(`✅ Session ID generated: ${window.Analytics.sessionId}`, 'success');
    } else {
      setTestResults(prev => ({ ...prev, sessionId: false }));
      addLog('❌ Session ID not properly generated', 'error');
    }

    // Test 3: Custom event tracking
    try {
      window.Analytics.track('test_event', '/test-analytics', { test_data: 'custom_value' });
      setTestResults(prev => ({ ...prev, customEvent: true }));
      addLog('✅ Custom event tracked successfully', 'success');
    } catch (error) {
      setTestResults(prev => ({ ...prev, customEvent: false }));
      addLog('❌ Custom event tracking failed: ' + error.message, 'error');
    }

    // Test 4: API call tracking
    try {
      window.Analytics.trackApiCall('/api/test', 'GET', true, { response_time: 150 });
      setTestResults(prev => ({ ...prev, apiTracking: true }));
      addLog('✅ API call tracking works', 'success');
    } catch (error) {
      setTestResults(prev => ({ ...prev, apiTracking: false }));
      addLog('❌ API call tracking failed: ' + error.message, 'error');
    }
  };

  const runABTestTests = async () => {
    addLog('🧪 Starting A/B Testing Tests...', 'info');
    
    // Test 1: Check if ABTest object exists
    if (typeof window.ABTest !== 'undefined') {
      setTestResults(prev => ({ ...prev, abTestLoaded: true }));
      addLog('✅ ABTest object loaded successfully', 'success');
    } else {
      setTestResults(prev => ({ ...prev, abTestLoaded: false }));
      addLog('❌ ABTest object not found', 'error');
      return;
    }

    // Test 2: Get variant (will create test experiment first)
    try {
      const variant = await window.ABTest.getVariant(1);
      if (variant && variant.variant) {
        setTestResults(prev => ({ ...prev, getVariant: true }));
        addLog(`✅ Get variant works: ${variant.variant}`, 'success');
      } else {
        setTestResults(prev => ({ ...prev, getVariant: false }));
        addLog('❌ Get variant returned invalid data', 'error');
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, getVariant: false }));
      addLog('❌ Get variant failed: ' + error.message, 'error');
    }

    // Test 3: Apply variant to element
    try {
      const variant = await window.ABTest.applyVariant(1, '#ab-test-target');
      if (variant) {
        setTestResults(prev => ({ ...prev, applyVariant: true }));
        addLog('✅ Apply variant works', 'success');
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, applyVariant: false }));
      addLog('❌ Apply variant failed: ' + error.message, 'error');
    }
  };

  const runHeatmapTests = () => {
    addLog('🧪 Starting Heatmap Integration Tests...', 'info');
    
    // Test 1: Check if HeatmapIntegration object exists
    if (typeof window.HeatmapIntegration !== 'undefined') {
      setTestResults(prev => ({ ...prev, heatmapLoaded: true }));
      addLog('✅ HeatmapIntegration object loaded successfully', 'success');
    } else {
      setTestResults(prev => ({ ...prev, heatmapLoaded: false }));
      addLog('❌ HeatmapIntegration object not found', 'error');
    }

    // Test 2: Check CustomHeatmap object exists
    if (typeof window.CustomHeatmap !== 'undefined') {
      setTestResults(prev => ({ ...prev, customHeatmap: true }));
      addLog('✅ CustomHeatmap object loaded successfully', 'success');
      
      // Test heatmap data collection
      const stats = window.CustomHeatmap.getStats();
      if (stats && stats.sessionId) {
        addLog(`✅ Custom heatmap collecting data: ${stats.totalClicks} clicks recorded`, 'success');
      }
    } else {
      setTestResults(prev => ({ ...prev, customHeatmap: false }));
      addLog('❌ CustomHeatmap object not found', 'error');
    }

    // Test 3: Check Hotjar initialization function
    if (typeof window.HeatmapIntegration !== 'undefined' && typeof window.HeatmapIntegration.initHotjar === 'function') {
      setTestResults(prev => ({ ...prev, hotjarInit: true }));
      addLog('✅ Hotjar initialization function available', 'success');
    } else {
      setTestResults(prev => ({ ...prev, hotjarInit: false }));
      addLog('❌ Hotjar initialization function not available', 'error');
    }

    // Test 4: Check Clarity initialization function
    if (typeof window.HeatmapIntegration !== 'undefined' && typeof window.HeatmapIntegration.initClarity === 'function') {
      setTestResults(prev => ({ ...prev, clarityInit: true }));
      addLog('✅ Clarity initialization function available', 'success');
    } else {
      setTestResults(prev => ({ ...prev, clarityInit: false }));
      addLog('❌ Clarity initialization function not available', 'error');
    }
  };

  const testFormSubmission = (e) => {
    e.preventDefault();
    addLog('📝 Form submitted - Analytics should track this automatically', 'info');
  };

  const testButtonClick = () => {
    addLog('🖱️ Button clicked - Analytics should track this automatically', 'info');
  };

  const testLinkClick = (e) => {
    e.preventDefault();
    addLog('🔗 Link clicked - Analytics should track this automatically', 'info');
  };

  const runAllTests = async () => {
    setTestLog([]);
    setTestResults({});
    
    await runAnalyticsTests();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for async operations
    await runABTestTests();
    await new Promise(resolve => setTimeout(resolve, 500));
    runHeatmapTests();
    
    addLog('🏁 All tests completed!', 'info');
  };

  useEffect(() => {
    // Auto-run tests when page loads (after analytics script loads)
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
        <title>Analytics Testing Page</title>
        <script src="/analytics.js"></script>
        <script src="/heatmap.js"></script>
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Analytics Feature Testing</h1>
            
            {/* Test Status Summary */}
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h2 className="text-xl font-semibold text-blue-900 mb-2">Test Results Summary</h2>
              <div className="text-lg">
                <span className={`font-bold ${passed === total && total > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {passed}/{total} tests passed
                </span>
                {total > 0 && (
                  <span className="ml-4 text-sm text-gray-600">
                    ({Math.round((passed/total) * 100)}% success rate)
                  </span>
                )}
              </div>
            </div>

            {/* Test Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Test Actions</h3>
                
                <button
                  onClick={runAllTests}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  🔄 Run All Tests
                </button>

                <button
                  onClick={testButtonClick}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  🖱️ Test Button Click Tracking
                </button>

                <a
                  href="#"
                  onClick={testLinkClick}
                  className="block w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-center"
                >
                  🔗 Test Link Click Tracking
                </a>

                <form onSubmit={testFormSubmission} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="email"
                    placeholder="Your email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg"
                  >
                    📝 Test Form Submission Tracking
                  </button>
                </form>
              </div>

              {/* A/B Test Target */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">A/B Test Target</h3>
                <div 
                  id="ab-test-target" 
                  className="p-4 bg-gray-100 border border-gray-300 rounded-lg"
                >
                  <h4 className="font-medium">Original Content</h4>
                  <p>This content may be replaced by A/B test variant.</p>
                </div>

                <div className="text-sm text-gray-600">
                  <p>This element (#ab-test-target) will show A/B test variant content if an experiment is active.</p>
                </div>
              </div>
            </div>

            {/* Detailed Test Results */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3">Analytics Tests</h3>
                <div className="space-y-2 text-sm">
                  <div className={`flex items-center ${testResults.analyticsLoaded ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-2">{testResults.analyticsLoaded ? '✅' : '❌'}</span>
                    Analytics Object Loaded
                  </div>
                  <div className={`flex items-center ${testResults.sessionId ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-2">{testResults.sessionId ? '✅' : '❌'}</span>
                    Session ID Generated
                  </div>
                  <div className={`flex items-center ${testResults.customEvent ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-2">{testResults.customEvent ? '✅' : '❌'}</span>
                    Custom Event Tracking
                  </div>
                  <div className={`flex items-center ${testResults.apiTracking ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-2">{testResults.apiTracking ? '✅' : '❌'}</span>
                    API Call Tracking
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">A/B Testing Tests</h3>
                <div className="space-y-2 text-sm">
                  <div className={`flex items-center ${testResults.abTestLoaded ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-2">{testResults.abTestLoaded ? '✅' : '❌'}</span>
                    ABTest Object Loaded
                  </div>
                  <div className={`flex items-center ${testResults.getVariant ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-2">{testResults.getVariant ? '✅' : '❌'}</span>
                    Get Variant Function
                  </div>
                  <div className={`flex items-center ${testResults.applyVariant ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-2">{testResults.applyVariant ? '✅' : '❌'}</span>
                    Apply Variant Function
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-3">Heatmap Tests</h3>
                <div className="space-y-2 text-sm">
                  <div className={`flex items-center ${testResults.heatmapLoaded ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-2">{testResults.heatmapLoaded ? '✅' : '❌'}</span>
                    HeatmapIntegration Loaded
                  </div>
                  <div className={`flex items-center ${testResults.hotjarInit ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-2">{testResults.hotjarInit ? '✅' : '❌'}</span>
                    Hotjar Init Function
                  </div>
                  <div className={`flex items-center ${testResults.clarityInit ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-2">{testResults.clarityInit ? '✅' : '❌'}</span>
                    Clarity Init Function
                  </div>
                </div>
              </div>
            </div>

            {/* Test Log */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Test Log</h3>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {testLog.map((log, index) => (
                  <div
                    key={index}
                    className={`text-sm p-2 rounded ${
                      log.type === 'success' ? 'bg-green-100 text-green-800' :
                      log.type === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}
                  >
                    <span className="font-mono text-xs text-gray-500">[{log.timestamp}]</span> {log.message}
                  </div>
                ))}
                {testLog.length === 0 && (
                  <p className="text-gray-500 text-center">No test logs yet. Click "Run All Tests" to start.</p>
                )}
              </div>
            </div>

            {/* Custom Heatmap Controls */}
            <div className="mt-8 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-900 mb-3">Custom Heatmap Testing</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => {
                    if (typeof window.CustomHeatmap !== 'undefined') {
                      window.CustomHeatmap.createOverlay();
                      addLog('👁️ Heatmap visualization overlay created', 'info');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
                >
                  👁️ Show Heatmap
                </button>
                <button
                  onClick={() => {
                    if (typeof window.CustomHeatmap !== 'undefined') {
                      window.CustomHeatmap.removeOverlay();
                      addLog('🙈 Heatmap visualization hidden', 'info');
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
                >
                  🙈 Hide Heatmap
                </button>
                <button
                  onClick={() => {
                    if (typeof window.CustomHeatmap !== 'undefined') {
                      window.CustomHeatmap.clearData();
                      addLog('🗑️ Heatmap data cleared', 'info');
                    }
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm"
                >
                  🗑️ Clear Data
                </button>
                <button
                  onClick={() => {
                    if (typeof window.CustomHeatmap !== 'undefined') {
                      const stats = window.CustomHeatmap.getStats();
                      addLog(`📊 Heatmap Stats: ${stats.totalClicks} clicks, ${stats.sessionDuration}s duration`, 'info');
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm"
                >
                  📊 Show Stats
                </button>
              </div>
            </div>

            {/* Admin Panel Links */}
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-900 mb-3">Admin Panel Testing</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <a href="/admin/analytics" className="block bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-center text-sm">
                  Analytics Dashboard
                </a>
                <a href="/admin/ab-tests" className="block bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-center text-sm">
                  A/B Tests
                </a>
                <a href="/admin/heatmaps" className="block bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-center text-sm">
                  Heatmap Setup
                </a>
                <a href="/admin/integrations" className="block bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-center text-sm">
                  Integrations
                </a>
                <a href="/admin/analytics-test" className="block bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-center text-sm">
                  🧪 Admin Test Suite
                </a>
              </div>
            </div>

            {/* Implementation Status */}
            <div className="mt-6 text-sm text-gray-600">
              <p><strong>Session ID:</strong> <span suppressHydrationWarning>{typeof window !== 'undefined' && window.Analytics ? window.Analytics.sessionId : 'Not loaded'}</span></p>
              <p><strong>Page Path:</strong> /test-analytics</p>
              <p><strong>Auto-tracking:</strong> Page views, clicks, and form submissions are automatically tracked</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}