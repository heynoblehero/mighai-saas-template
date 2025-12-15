import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function StorageManagement() {
  const [buckets, setBuckets] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [files, setFiles] = useState([]);
  const [showCreateBucket, setShowCreateBucket] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showApiDocs, setShowApiDocs] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(null);

  const [newBucket, setNewBucket] = useState({
    name: '',
    description: '',
    allowed_file_types: [],
    max_file_size: 10485760,
    access_level: 'private'
  });

  useEffect(() => {
    fetchBuckets();
  }, []);

  useEffect(() => {
    if (selectedBucket) {
      fetchFiles(selectedBucket.slug);
    }
  }, [selectedBucket]);

  const fetchBuckets = async () => {
    try {
      const res = await fetch('/api/storage/buckets');
      if (res.ok) {
        const data = await res.json();
        setBuckets(data);
      }
    } catch (error) {
      console.error('Error fetching buckets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async (bucketSlug) => {
    try {
      const res = await fetch(`/api/storage/files?bucket=${bucketSlug}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const createBucket = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/storage/buckets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBucket)
      });

      if (res.ok) {
        await fetchBuckets();
        setShowCreateBucket(false);
        setNewBucket({
          name: '',
          description: '',
          allowed_file_types: [],
          max_file_size: 10485760,
          access_level: 'private'
        });
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create bucket');
      }
    } catch (error) {
      console.error('Error creating bucket:', error);
      alert('Failed to create bucket');
    }
  };

  const deleteBucket = async (bucketId) => {
    if (!confirm('Are you sure you want to delete this bucket?')) return;

    try {
      const res = await fetch(`/api/storage/buckets?id=${bucketId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchBuckets();
        if (selectedBucket?.id === bucketId) {
          setSelectedBucket(null);
        }
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete bucket');
      }
    } catch (error) {
      console.error('Error deleting bucket:', error);
      alert('Failed to delete bucket');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedBucket) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          alert(`File uploaded successfully!\nURL: ${response.file.url}`);
          fetchFiles(selectedBucket.slug);
        } else {
          const error = JSON.parse(xhr.responseText);
          alert(error.error || 'Upload failed');
        }
        setUploading(false);
        setUploadProgress(0);
      });

      xhr.addEventListener('error', () => {
        alert('Upload failed');
        setUploading(false);
        setUploadProgress(0);
      });

      xhr.open('POST', `/api/storage/upload?bucket=${selectedBucket.slug}`);
      xhr.send(formData);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Upload failed');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteFile = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const res = await fetch(`/api/storage/files?id=${fileId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchFiles(selectedBucket.slug);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const copyToClipboard = (text, endpoint) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpoint);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  if (loading) {
    return (
      <AdminLayout title="Storage Management">
        <div className="dashboard-loading">
          <div className="loading-container">
            <div className="loading-spinner-large"></div>
            <p className="text-subdued">Loading storage...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Storage Management">
      <div className="shopify-dashboard">
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-title">
              <h1 className="text-display-medium">Storage Management</h1>
              <p className="text-subdued">Manage storage buckets and files</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowApiDocs(true)}
                className="btn btn-secondary"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                API Docs
              </button>
              <button
                onClick={() => setShowCreateBucket(true)}
                className="btn btn-primary"
              >
                Create Bucket
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Buckets List */}
          <div className="col-span-4">
            <div className="card-shopify">
              <div className="card-header">
                <h3 className="text-heading">Storage Buckets</h3>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {buckets.length === 0 ? (
                  <div className="p-6 text-center text-subdued">
                    No buckets yet. Create one to get started.
                  </div>
                ) : (
                  buckets.map(bucket => (
                    <div
                      key={bucket.id}
                      className={`p-4 cursor-pointer hover:bg-surface-hovered transition-colors ${
                        selectedBucket?.id === bucket.id ? 'bg-surface-selected' : ''
                      }`}
                      onClick={() => setSelectedBucket(bucket)}
                      style={{
                        backgroundColor: selectedBucket?.id === bucket.id ? 'var(--color-surface-selected)' : undefined
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-body" style={{ color: 'var(--color-text)' }}>
                            {bucket.name}
                          </h4>
                          <p className="text-caption text-subdued">{bucket.slug}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="badge badge-info text-caption">
                              {bucket.file_count} files
                            </span>
                            <span className="badge badge-secondary text-caption">
                              {bucket.access_level}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBucket(bucket.id);
                          }}
                          className="text-critical hover:text-critical-dark"
                          title="Delete bucket"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Files List */}
          <div className="col-span-8">
            {selectedBucket ? (
              <div className="card-shopify">
                <div className="card-header">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-heading">{selectedBucket.name}</h3>
                      <p className="text-caption text-subdued">{selectedBucket.description}</p>
                    </div>
                    <div>
                      <label className="btn btn-primary cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                        {uploading ? 'Uploading...' : 'Upload File'}
                      </label>
                    </div>
                  </div>
                </div>

                {uploading && (
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-body">Uploading...</span>
                      <span className="text-body font-semibold">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-surface-subdued rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${uploadProgress}%`,
                          background: 'linear-gradient(135deg, #00d084, #059669)'
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>Size</th>
                        <th>Type</th>
                        <th>Uploaded By</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center text-subdued py-8">
                            No files in this bucket yet
                          </td>
                        </tr>
                      ) : (
                        files.map(file => (
                          <tr key={file.id}>
                            <td>
                              <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-subdued" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <span>{file.originalName}</span>
                              </div>
                            </td>
                            <td>{formatBytes(file.size)}</td>
                            <td><span className="badge badge-secondary">{file.mimeType.split('/')[0]}</span></td>
                            <td>{file.uploadedBy}</td>
                            <td>{new Date(file.createdAt).toLocaleDateString()}</td>
                            <td>
                              <div className="flex gap-2">
                                <a
                                  href={file.downloadUrl}
                                  download
                                  className="btn btn-secondary btn-sm"
                                  title="Download"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </a>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(window.location.origin + file.url);
                                    alert('URL copied to clipboard!');
                                  }}
                                  className="btn btn-secondary btn-sm"
                                  title="Copy URL"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => deleteFile(file.id)}
                                  className="btn btn-danger btn-sm"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="card-shopify">
                <div className="p-12 text-center text-subdued">
                  Select a bucket to view files
                </div>
              </div>
            )}
          </div>
        </div>

        {/* API Documentation Modal */}
        {showApiDocs && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            style={{ background: 'rgba(0, 0, 0, 0.85)' }}
            onClick={() => setShowApiDocs(false)}
          >
            <div
              className="rounded-2xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden transform transition-all"
              style={{ background: 'var(--color-surface)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 px-6 py-5 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl shadow-lg border border-white/20">
                      📖
                    </div>
                    <div>
                      <h2 className="font-bold text-lg tracking-tight">API Documentation</h2>
                      <p className="text-sm text-emerald-100 mt-0.5">Programmatic access to storage buckets</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowApiDocs(false)}
                    className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto" style={{ background: 'var(--color-surface-neutral)' }}>
                {/* Authentication */}
                <div>
                  <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text)' }}>Authentication</h3>
                  <p className="text-sm mb-3" style={{ color: 'var(--color-text-subdued)' }}>
                    All API endpoints require Basic Authentication with your admin username and password.
                  </p>
                  <div className="relative">
                    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                      <code className="text-sm text-gray-100 font-mono">
                        Authorization: Basic base64(username:password)
                      </code>
                    </div>
                    <button
                      onClick={() => copyToClipboard('Authorization: Basic base64(username:password)', 'auth')}
                      className="absolute top-2 right-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-md transition-colors"
                    >
                      {copiedEndpoint === 'auth' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Endpoints */}
                <div>
                  <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text)' }}>Available Endpoints</h3>

                  {/* List Buckets */}
                  <div className="mb-6 p-4 rounded-lg border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">GET</span>
                      <code className="text-sm font-mono" style={{ color: 'var(--color-text)' }}>/api/v1/storage/buckets</code>
                    </div>
                    <p className="text-sm mb-3" style={{ color: 'var(--color-text-subdued)' }}>List all storage buckets</p>
                    <div className="relative">
                      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-sm text-gray-100 font-mono">{`curl -u admin:password \\
  ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/storage/buckets`}</pre>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`curl -u admin:password ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/storage/buckets`, 'list')}
                        className="absolute top-2 right-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-md transition-colors"
                      >
                        {copiedEndpoint === 'list' ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Create Bucket */}
                  <div className="mb-6 p-4 rounded-lg border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">POST</span>
                      <code className="text-sm font-mono" style={{ color: 'var(--color-text)' }}>/api/v1/storage/buckets</code>
                    </div>
                    <p className="text-sm mb-3" style={{ color: 'var(--color-text-subdued)' }}>Create a new storage bucket</p>
                    <div className="relative">
                      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-sm text-gray-100 font-mono">{`curl -u admin:password \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Profile Images",
    "description": "User profile pictures",
    "allowed_file_types": ["image/jpeg", "image/png"],
    "max_file_size": 5242880,
    "access_level": "user"
  }' \\
  ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/storage/buckets`}</pre>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`curl -u admin:password -X POST -H "Content-Type: application/json" -d '{"name": "Profile Images", "description": "User profile pictures", "allowed_file_types": ["image/jpeg", "image/png"], "max_file_size": 5242880, "access_level": "user"}' ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/storage/buckets`, 'create')}
                        className="absolute top-2 right-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-md transition-colors"
                      >
                        {copiedEndpoint === 'create' ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Update Bucket */}
                  <div className="mb-6 p-4 rounded-lg border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded">PUT</span>
                      <code className="text-sm font-mono" style={{ color: 'var(--color-text)' }}>/api/v1/storage/buckets</code>
                    </div>
                    <p className="text-sm mb-3" style={{ color: 'var(--color-text-subdued)' }}>Update an existing bucket</p>
                    <div className="relative">
                      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-sm text-gray-100 font-mono">{`curl -u admin:password \\
  -X PUT \\
  -H "Content-Type: application/json" \\
  -d '{"id": 1, "max_file_size": 10485760}' \\
  ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/storage/buckets`}</pre>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`curl -u admin:password -X PUT -H "Content-Type: application/json" -d '{"id": 1, "max_file_size": 10485760}' ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/storage/buckets`, 'update')}
                        className="absolute top-2 right-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-md transition-colors"
                      >
                        {copiedEndpoint === 'update' ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Delete Bucket */}
                  <div className="mb-6 p-4 rounded-lg border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded">DELETE</span>
                      <code className="text-sm font-mono" style={{ color: 'var(--color-text)' }}>/api/v1/storage/buckets?id=:id</code>
                    </div>
                    <p className="text-sm mb-3" style={{ color: 'var(--color-text-subdued)' }}>Delete a bucket (must be empty)</p>
                    <div className="relative">
                      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-sm text-gray-100 font-mono">{`curl -u admin:password \\
  -X DELETE \\
  ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/storage/buckets?id=1`}</pre>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`curl -u admin:password -X DELETE ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/storage/buckets?id=1`, 'delete')}
                        className="absolute top-2 right-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-md transition-colors"
                      >
                        {copiedEndpoint === 'delete' ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Response Format */}
                <div>
                  <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text)' }}>Response Format</h3>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-gray-100 font-mono">{`{
  "success": true,
  "message": "Bucket created successfully",
  "data": {
    "id": 1,
    "name": "Profile Images",
    "slug": "profile-images",
    "upload_endpoint": "/api/storage/upload?bucket=profile-images",
    "files_endpoint": "/api/storage/files?bucket=profile-images"
  }
}`}</pre>
                  </div>
                </div>

                {/* Security Note */}
                <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🔒</div>
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-300 mb-1">Security Note</h4>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        Keep your admin credentials secure. All API requests are authenticated against your database user records.
                        Failed authentication attempts are logged.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 flex justify-end border-t" style={{
                background: 'var(--color-surface-subdued)',
                borderColor: 'var(--color-border)'
              }}>
                <button
                  onClick={() => setShowApiDocs(false)}
                  className="px-6 py-2.5 text-white text-sm rounded-lg shadow-md hover:shadow-lg transition-all font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #00d084, #059669)',
                    boxShadow: '0 0 20px rgba(0, 208, 132, 0.3)'
                  }}
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Bucket Modal */}
        {showCreateBucket && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.85)' }}
            onClick={() => setShowCreateBucket(false)}
          >
            <div
              className="rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all"
              style={{ background: 'var(--color-surface)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with gradient */}
              <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 px-6 py-5 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl shadow-lg border border-white/20">
                      📦
                    </div>
                    <div>
                      <h2 className="font-bold text-lg tracking-tight">Create Storage Bucket</h2>
                      <p className="text-sm text-emerald-100 mt-0.5">Configure your new storage bucket</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateBucket(false)}
                    className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={createBucket}>
                <div className="p-6 space-y-5" style={{ background: 'var(--color-surface-neutral)' }}>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                      Bucket Name *
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2"
                      style={{
                        background: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)',
                        '--tw-ring-color': '#00d084'
                      }}
                      value={newBucket.name}
                      onChange={(e) => setNewBucket({ ...newBucket, name: e.target.value })}
                      required
                      placeholder="e.g., Profile Images"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-subdued)' }}>
                      Use a descriptive name for easy identification
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                      Description
                    </label>
                    <textarea
                      className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2"
                      style={{
                        background: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)',
                        '--tw-ring-color': '#00d084'
                      }}
                      value={newBucket.description}
                      onChange={(e) => setNewBucket({ ...newBucket, description: e.target.value })}
                      rows="3"
                      placeholder="Brief description of this bucket's purpose"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                        Access Level *
                      </label>
                      <select
                        className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2"
                        style={{
                          background: 'var(--color-surface)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                          '--tw-ring-color': '#00d084'
                        }}
                        value={newBucket.access_level}
                        onChange={(e) => setNewBucket({ ...newBucket, access_level: e.target.value })}
                      >
                        <option value="public">🌐 Public</option>
                        <option value="private">🔒 Private</option>
                        <option value="user">👤 User</option>
                        <option value="admin">🛡️ Admin Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                        Max File Size
                      </label>
                      <select
                        className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2"
                        style={{
                          background: 'var(--color-surface)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                          '--tw-ring-color': '#00d084'
                        }}
                        value={newBucket.max_file_size}
                        onChange={(e) => setNewBucket({ ...newBucket, max_file_size: parseInt(e.target.value) })}
                      >
                        <option value="1048576">1 MB</option>
                        <option value="5242880">5 MB</option>
                        <option value="10485760">10 MB</option>
                        <option value="26214400">25 MB</option>
                        <option value="52428800">50 MB</option>
                        <option value="104857600">100 MB</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 p-4 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">💡</div>
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-300 mb-1">Security Features</h4>
                        <ul className="text-xs space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                          <li>✓ Automatic virus scanning on upload</li>
                          <li>✓ Malicious file type blocking</li>
                          <li>✓ Secure file name generation</li>
                          <li>✓ Access control enforcement</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 flex justify-end gap-3 border-t" style={{
                  background: 'var(--color-surface-subdued)',
                  borderColor: 'var(--color-border)'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateBucket(false)}
                    className="px-6 py-2.5 text-sm rounded-lg transition-all font-medium hover:bg-white/5"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-white text-sm rounded-lg shadow-md hover:shadow-lg transition-all font-semibold"
                    style={{
                      background: 'linear-gradient(135deg, #00d084, #059669)',
                      boxShadow: '0 0 20px rgba(0, 208, 132, 0.3)'
                    }}
                  >
                    Create Bucket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
