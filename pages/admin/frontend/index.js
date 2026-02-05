import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function FileTree({ files, depth = 0 }) {
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (path) => {
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  return (
    <ul className={`${depth === 0 ? '' : 'ml-4'} text-sm`}>
      {files.map((file) => (
        <li key={file.path} className="py-1">
          {file.type === 'directory' ? (
            <>
              <button
                onClick={() => toggleExpand(file.path)}
                className="flex items-center gap-1 text-slate-300 hover:text-white"
              >
                <span className="text-yellow-500">
                  {expanded[file.path] ? '📂' : '📁'}
                </span>
                {file.name}/
              </button>
              {expanded[file.path] && file.children && (
                <FileTree files={file.children} depth={depth + 1} />
              )}
            </>
          ) : (
            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-blue-400">📄</span>
              <span>{file.name}</span>
              <span className="text-slate-500 text-xs ml-2">
                ({formatBytes(file.size)})
              </span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function FrontendManagement() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/frontend/files');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpload = async (file) => {
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setError('Please upload a ZIP file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/frontend/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Upload failed');
      }

      setSuccess(json.message);
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete all frontend files?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/frontend/files', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Delete failed');
      }

      setSuccess('Frontend files deleted');
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleEnabled = async () => {
    try {
      const res = await fetch('/api/admin/frontend/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !data.isEnabled }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Toggle failed');
      }

      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDownload = () => {
    window.location.href = '/api/admin/frontend/files?download=true';
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Custom Frontend</h1>
          <p className="text-slate-400">
            Upload your own frontend build files to replace the default customer-facing pages.
            Your frontend will be served from the root domain with full access to auth and payment APIs.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-emerald-400">
            {success}
          </div>
        )}

        {/* Status Card */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Status</h2>
            {data?.exists && (
              <button
                onClick={handleToggleEnabled}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  data.isEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {data.isEnabled ? 'Enabled' : 'Disabled'}
              </button>
            )}
          </div>

          {data?.exists ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    data.isEnabled ? 'bg-emerald-500' : 'bg-slate-500'
                  }`}
                />
                <span className="text-slate-300">
                  {data.isEnabled ? 'Serving custom frontend' : 'Custom frontend disabled'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-slate-500">Files</div>
                  <div className="text-white font-medium">{data.stats?.fileCount || 0}</div>
                </div>
                <div>
                  <div className="text-slate-500">Total Size</div>
                  <div className="text-white font-medium">
                    {formatBytes(data.stats?.totalSize || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Uploaded</div>
                  <div className="text-white font-medium">
                    {data.uploadedAt
                      ? new Date(data.uploadedAt).toLocaleDateString()
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-400">No custom frontend uploaded</div>
          )}
        </div>

        {/* Upload Section */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Upload Frontend</h2>
          <p className="text-slate-400 text-sm mb-4">
            Upload a ZIP file containing your frontend build. The ZIP should contain an{' '}
            <code className="text-emerald-400 bg-slate-700 px-1 rounded">index.html</code>{' '}
            at the root level.
          </p>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            {uploading ? (
              <div className="text-slate-300">
                <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
                Uploading...
              </div>
            ) : (
              <>
                <div className="text-4xl mb-3">📦</div>
                <div className="text-slate-300 mb-2">
                  Drag and drop your ZIP file here
                </div>
                <div className="text-slate-500 text-sm mb-4">or</div>
                <label className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition-colors">
                  Browse Files
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>

          <div className="mt-4 p-4 bg-slate-900/50 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Build Instructions</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>1. Build your frontend (React, Vue, etc.)</li>
              <li>2. Ensure output has an <code className="text-emerald-400">index.html</code></li>
              <li>3. ZIP the build folder contents</li>
              <li>4. Upload the ZIP file here</li>
            </ul>
          </div>
        </div>

        {/* File Browser */}
        {data?.exists && data.files?.length > 0 && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Files</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                >
                  Download Backup
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                >
                  Delete All
                </button>
              </div>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 max-h-96 overflow-auto">
              <FileTree files={data.files} />
            </div>
          </div>
        )}

        {/* Integration Guide */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">API Integration</h2>
          <p className="text-slate-400 text-sm mb-4">
            Your frontend can use these APIs. Session cookies are automatically handled.
          </p>
          <div className="bg-slate-900 rounded-lg p-4 space-y-3 text-sm font-mono">
            <div>
              <div className="text-slate-500"># Check session</div>
              <div className="text-emerald-400">GET /api/auth/session</div>
            </div>
            <div>
              <div className="text-slate-500"># Login</div>
              <div className="text-emerald-400">POST /api/subscribe/login</div>
            </div>
            <div>
              <div className="text-slate-500"># Signup</div>
              <div className="text-emerald-400">POST /api/subscribe/send-signup-otp</div>
              <div className="text-emerald-400">POST /api/subscribe/verify-signup-otp</div>
            </div>
            <div>
              <div className="text-slate-500"># Profile & Subscription</div>
              <div className="text-emerald-400">GET /api/subscriber/profile</div>
              <div className="text-emerald-400">GET /api/subscriber/subscription</div>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-4">
            See <a href="/admin/api-docs" className="text-emerald-400 hover:underline">API Documentation</a> for the full list.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
