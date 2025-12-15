import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function PlatformUpdate() {
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, updating, success, error
  const [updateInfo, setUpdateInfo] = useState(null);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const [currentVersion, setCurrentVersion] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    fetchCurrentVersion();
  }, []);

  const fetchCurrentVersion = async () => {
    try {
      const response = await fetch('/api/admin/platform-version');
      const data = await response.json();
      if (data.success) {
        setCurrentVersion(data.version);
      }
    } catch (err) {
      console.error('Failed to fetch version:', err);
    }
  };

  const checkForUpdates = async () => {
    setUpdateStatus('checking');
    setError('');
    setLogs([]);
    
    try {
      const response = await fetch('/api/admin/platform-update?action=check');
      const data = await response.json();
      
      if (data.success) {
        setUpdateInfo(data.updateInfo);
        setUpdateStatus('idle');
        addLog(`✅ Update check complete. ${data.updateInfo.hasUpdate ? `Update available: ${data.updateInfo.latestVersion}` : 'Platform is up to date.'}`);
      } else {
        setError(data.error || 'Failed to check for updates');
        setUpdateStatus('error');
      }
    } catch (err) {
      setError('Failed to check for updates: ' + err.message);
      setUpdateStatus('error');
    }
  };

  const performUpdate = async () => {
    if (!updateInfo?.hasUpdate) return;
    
    setUpdateStatus('updating');
    setError('');
    setLogs([]);
    
    try {
      const response = await fetch('/api/admin/platform-update?action=update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetVersion: updateInfo.latestVersion
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          try {
            const data = JSON.parse(line);
            if (data.log) {
              addLog(data.log);
            }
            if (data.status) {
              setUpdateStatus(data.status);
            }
            if (data.error) {
              setError(data.error);
            }
          } catch (e) {
            // Ignore parsing errors for non-JSON lines
          }
        });
      }

      // Refresh version info after update
      await fetchCurrentVersion();
      
    } catch (err) {
      setError('Failed to perform update: ' + err.message);
      setUpdateStatus('error');
    }
  };

  const addLog = (message) => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString().split('T')[1].split('.')[0],
      message
    }]);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'checking':
        return (
          <svg className="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'updating':
        return (
          <svg className="animate-spin h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'success':
        return (
          <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
    }
  };

  return (
    <AdminLayout title="Platform Update">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Platform Update</h1>
          <p className="text-slate-400 mt-1">
            Check for and install platform updates with one click
          </p>
        </div>

        {/* Current Version Info */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Current Version</h3>
              <div className="text-slate-400 space-y-1">
                <p>Version: <span className="text-slate-200 font-mono">{currentVersion || 'Loading...'}</span></p>
                <p>Repository: <span className="text-slate-200">mighai-universal-saas</span></p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusIcon(updateStatus)}
              <span className="text-sm text-slate-300 capitalize">
                {updateStatus === 'idle' ? 'Ready' : updateStatus.replace('-', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Update Actions */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Update Actions</h3>
          
          <div className="space-y-4">
            {/* Check for Updates */}
            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
              <div>
                <h4 className="font-medium text-slate-200">Check for Updates</h4>
                <p className="text-sm text-slate-400">Check if new platform updates are available</p>
              </div>
              <button
                onClick={checkForUpdates}
                disabled={updateStatus === 'checking' || updateStatus === 'updating'}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {updateStatus === 'checking' ? 'Checking...' : 'Check Updates'}
              </button>
            </div>

            {/* Update Available */}
            {updateInfo?.hasUpdate && (
              <div className="p-4 bg-emerald-900/20 border border-emerald-600/30 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-emerald-300">Update Available</h4>
                    <p className="text-sm text-emerald-200/80">
                      New version {updateInfo.latestVersion} is available
                    </p>
                  </div>
                  <button
                    onClick={performUpdate}
                    disabled={updateStatus === 'checking' || updateStatus === 'updating'}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {updateStatus === 'updating' ? 'Updating...' : 'Update Now'}
                  </button>
                </div>
                
                {updateInfo.latestCommitInfo && (
                  <div className="bg-emerald-900/30 rounded-md p-3 mb-3">
                    <h5 className="text-sm font-medium text-emerald-300 mb-2">Latest Commit:</h5>
                    <div className="text-xs text-emerald-200/80 space-y-1">
                      <p><span className="font-medium">Message:</span> {updateInfo.latestCommitInfo.message}</p>
                      <p><span className="font-medium">Author:</span> {updateInfo.latestCommitInfo.author}</p>
                      <p><span className="font-medium">Date:</span> {updateInfo.latestCommitInfo.date ? new Date(updateInfo.latestCommitInfo.date).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC') : 'Unknown'}</p>
                    </div>
                  </div>
                )}
                
                {updateInfo.changelog && (
                  <div className="bg-emerald-900/30 rounded-md p-3">
                    <h5 className="text-sm font-medium text-emerald-300 mb-2">Recent Changes:</h5>
                    <p className="text-xs text-emerald-200/60">{updateInfo.changelog}</p>
                  </div>
                )}
              </div>
            )}

            {/* No Updates */}
            {updateInfo && !updateInfo.hasUpdate && (
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <h4 className="font-medium text-slate-200">Platform Up to Date</h4>
                  <p className="text-sm text-slate-400">You're running the latest version</p>
                </div>
                <div className="flex items-center text-green-400">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Up to Date
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-600/30 text-red-300 p-4 rounded-xl">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Error</span>
            </div>
            <p className="mt-2">{error}</p>
          </div>
        )}

        {/* Update Logs */}
        {logs.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Update Logs</h3>
            <div className="bg-slate-900 rounded-lg p-4 max-h-80 overflow-y-auto">
              <div className="font-mono text-sm space-y-1">
                {isClient && logs.map((log, index) => (
                  <div key={`log-${index}-${log.timestamp}`} className="text-slate-300">
                    <span className="text-slate-500">[{log.timestamp}]</span> {log.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="bg-orange-900/20 border border-orange-600/30 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-orange-300 mb-2">
                Important Notes
              </h3>
              <div className="text-orange-200/80 space-y-2 text-sm">
                <p>• Platform updates may require a few minutes to complete</p>
                <p>• Your application will be briefly unavailable during updates</p>
                <p>• <strong>Database backup is created automatically</strong> before each update</p>
                <p>• Docker containers will be restarted automatically</p>
                <p>• Database migrations will be handled automatically if needed</p>
                <p>• Last 10 database backups are kept in <code>data/backups/</code></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}