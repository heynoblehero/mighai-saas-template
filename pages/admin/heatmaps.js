import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function Heatmaps() {
  const [activeTab, setActiveTab] = useState('view'); // 'view', 'config'
  const [heatmapConfig, setHeatmapConfig] = useState({
    hotjar: { enabled: false, hjid: '', hjsv: '6' },
    clarity: { enabled: false, clarity_id: '' },
    custom_scripts: []
  });
  const [heatmapSessions, setHeatmapSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCustomScript, setShowCustomScript] = useState(false);
  const [customScript, setCustomScript] = useState({ name: '', script: '' });
  const [filters, setFilters] = useState({
    page_path: '',
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchHeatmapConfig();
    if (activeTab === 'view') {
      fetchHeatmapSessions();
    }
  }, [activeTab, filters]);

  const fetchHeatmapConfig = async () => {
    try {
      const response = await fetch('/api/heatmaps/config');
      if (response.ok) {
        const data = await response.json();
        setHeatmapConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch heatmap config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHeatmapSessions = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.page_path) params.append('page_path', filters.page_path);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      params.append('limit', '50');

      const response = await fetch(`/api/heatmap/sessions?${params}`);
      if (response.ok) {
        const sessions = await response.json();
        setHeatmapSessions(sessions);
      }
    } catch (error) {
      console.error('Failed to fetch heatmap sessions:', error);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/heatmaps/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(heatmapConfig)
      });

      if (response.ok) {
        alert('Heatmap configuration saved successfully!');
      } else {
        alert('Failed to save configuration');
      }
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

    if (heatmapConfig.hotjar.enabled && heatmapConfig.hotjar.hjid) {
      code += `  // Initialize Hotjar\n`;
      code += `  HeatmapIntegration.initHotjar('${heatmapConfig.hotjar.hjid}', ${heatmapConfig.hotjar.hjsv});\n\n`;
    }

    if (heatmapConfig.clarity.enabled && heatmapConfig.clarity.clarity_id) {
      code += `  // Initialize Microsoft Clarity\n`;
      code += `  HeatmapIntegration.initClarity('${heatmapConfig.clarity.clarity_id}');\n\n`;
    }

    if (heatmapConfig.custom_scripts.length > 0) {
      code += `  // Custom tracking scripts\n`;
      heatmapConfig.custom_scripts.forEach(script => {
        code += `  // ${script.name}\n`;
        code += `  ${script.script}\n\n`;
      });
    }

    code += '</script>';
    return code;
  };

  if (loading) {
    return (
      <AdminLayout title="Heatmap Integration">
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <div className="text-lg text-slate-300">Loading configuration...</div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Heatmap Management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Heatmap Management</h1>
            <p className="text-slate-400 mt-1">Track user interactions and configure heatmap services</p>
          </div>
          {activeTab === 'config' && (
            <button
              onClick={saveConfig}
              disabled={saving}
              className="mt-4 sm:mt-0 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('view')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'view'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              🎯 View Heatmaps
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'config'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              ⚙️ Configuration
            </button>
          </nav>
        </div>

        {activeTab === 'view' ? renderHeatmapViewer() : renderConfiguration()}
      </div>
    </AdminLayout>
  );

  function renderHeatmapViewer() {
    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Filter Heatmap Data</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Page Path</label>
              <input
                type="text"
                value={filters.page_path}
                onChange={(e) => setFilters(prev => ({ ...prev, page_path: e.target.value }))}
                placeholder="/example-page"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Heatmap Sessions */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200">Heatmap Sessions ({heatmapSessions.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Session
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Clicks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {heatmapSessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {session.session_id.substr(-8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.page_path}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.total_clicks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Math.round((new Date(session.end_time) - new Date(session.start_time)) / 1000)}s
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(session.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {heatmapSessions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No heatmap sessions found for the selected criteria.</p>
              <p className="text-sm text-gray-400 mt-2">Visit pages with heatmap tracking enabled to collect data.</p>
            </div>
          )}
        </div>

        {/* Session Details Modal */}
        {selectedSession && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Session Details: {selectedSession.session_id.substr(-8)}
                </h3>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-500">Page</div>
                  <div className="font-medium">{selectedSession.page_path}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-500">Clicks</div>
                  <div className="font-medium">{selectedSession.total_clicks}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-500">Mouse Moves</div>
                  <div className="font-medium">{selectedSession.total_mouse_moves}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-500">Viewport</div>
                  <div className="font-medium">{selectedSession.viewport_width}×{selectedSession.viewport_height}</div>
                </div>
              </div>

              {selectedSession.heatmap_data && selectedSession.heatmap_data.clicks && (
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Click Heatmap Data</h4>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {selectedSession.heatmap_data.clicks.map((click, index) => (
                        <div key={index} className="text-sm p-2 bg-white rounded border">
                          <div className="font-mono text-xs text-gray-500">
                            Click #{index + 1} at ({click.x}, {click.y})
                          </div>
                          <div className="text-gray-700">
                            Target: {click.target.tagName}
                            {click.target.id && ` #${click.target.id}`}
                            {click.target.className && ` .${click.target.className.split(' ')[0]}`}
                          </div>
                          {click.target.innerText && (
                            <div className="text-gray-600 text-xs truncate">
                              "{click.target.innerText}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedSession(null)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderConfiguration() {
    return (
      <div className="space-y-6">
        {/* Custom Heatmap Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">🎯 Custom Heatmap Tracking</h3>
              <p className="text-sm text-blue-700">Built-in heatmap solution with real-time click tracking</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-900">Always Active</div>
              <div className="text-sm text-blue-700">No configuration needed</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded">
              <div className="font-medium text-blue-900">✅ Click Tracking</div>
              <div className="text-blue-700">Automatic click position capture</div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="font-medium text-blue-900">✅ Session Recording</div>
              <div className="text-blue-700">Session-based data collection</div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="font-medium text-blue-900">✅ Real-time Visualization</div>
              <div className="text-blue-700">Live heatmap overlay display</div>
            </div>
          </div>
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
                checked={heatmapConfig.hotjar.enabled}
                onChange={(e) => setHeatmapConfig(prev => ({
                  ...prev,
                  hotjar: { ...prev.hotjar, enabled: e.target.checked }
                }))}
                className="rounded border-gray-300"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Enable</span>
            </label>
          </div>

          {heatmapConfig.hotjar.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hotjar ID (hjid)
                </label>
                <input
                  type="text"
                  value={heatmapConfig.hotjar.hjid}
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
                  value={heatmapConfig.hotjar.hjsv}
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

          {heatmapConfig.hotjar.enabled && (
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
                checked={heatmapConfig.clarity.enabled}
                onChange={(e) => setHeatmapConfig(prev => ({
                  ...prev,
                  clarity: { ...prev.clarity, enabled: e.target.checked }
                }))}
                className="rounded border-gray-300"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Enable</span>
            </label>
          </div>

          {heatmapConfig.clarity.enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clarity Project ID
              </label>
              <input
                type="text"
                value={heatmapConfig.clarity.clarity_id}
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
          {heatmapConfig.custom_scripts.length > 0 && (
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

          {heatmapConfig.custom_scripts.length === 0 && !showCustomScript && (
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
                heatmapConfig.hotjar.enabled && heatmapConfig.hotjar.hjid 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {heatmapConfig.hotjar.enabled && heatmapConfig.hotjar.hjid ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-gray-700">Microsoft Clarity Integration</span>
              <span className={`px-2 py-1 text-xs rounded ${
                heatmapConfig.clarity.enabled && heatmapConfig.clarity.clarity_id 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {heatmapConfig.clarity.enabled && heatmapConfig.clarity.clarity_id ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-gray-700">Custom Scripts</span>
              <span className={`px-2 py-1 text-xs rounded ${
                heatmapConfig.custom_scripts.length > 0 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {heatmapConfig.custom_scripts.length} configured
              </span>
            </div>
          </div>
        </div>

        {/* Custom Heatmap Status in Configuration */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4">Custom Heatmap Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded border">
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-bold text-green-600">✅ Active</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-sm text-gray-500">Sessions Recorded</div>
              <div className="font-bold text-green-600">{heatmapSessions.length}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-sm text-gray-500">Total Clicks</div>
              <div className="font-bold text-green-600">
                {heatmapSessions.reduce((sum, session) => sum + session.total_clicks, 0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}