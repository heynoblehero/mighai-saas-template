import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

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
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: null, data: null });
  const toast = useToast();

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
        toast.success('Bucket created successfully');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create bucket');
      }
    } catch (error) {
      console.error('Error creating bucket:', error);
      toast.error('Failed to create bucket');
    }
  };

  const handleDeleteBucket = (bucketId) => {
    setConfirmDialog({
      isOpen: true,
      type: 'deleteBucket',
      data: bucketId
    });
  };

  const deleteBucket = async (bucketId) => {
    try {
      const res = await fetch(`/api/storage/buckets?id=${bucketId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchBuckets();
        if (selectedBucket?.id === bucketId) {
          setSelectedBucket(null);
        }
        toast.success('Bucket deleted successfully');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete bucket');
      }
    } catch (error) {
      console.error('Error deleting bucket:', error);
      toast.error('Failed to delete bucket');
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
          toast.success('File uploaded successfully');
          navigator.clipboard.writeText(window.location.origin + response.file.url);
          toast.info('URL copied to clipboard');
          fetchFiles(selectedBucket.slug);
        } else {
          const error = JSON.parse(xhr.responseText);
          toast.error(error.error || 'Upload failed');
        }
        setUploading(false);
        setUploadProgress(0);
      });

      xhr.addEventListener('error', () => {
        toast.error('Upload failed');
        setUploading(false);
        setUploadProgress(0);
      });

      xhr.open('POST', `/api/storage/upload?bucket=${selectedBucket.slug}`);
      xhr.send(formData);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Upload failed');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteFile = (fileId) => {
    setConfirmDialog({
      isOpen: true,
      type: 'deleteFile',
      data: fileId
    });
  };

  const deleteFile = async (fileId) => {
    try {
      const res = await fetch(`/api/storage/files?id=${fileId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchFiles(selectedBucket.slug);
        toast.success('File deleted successfully');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
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

  const getAccessLevelBadge = (level) => {
    const badges = {
      public: 'bg-green-500/20 text-green-400 border-green-500/30',
      private: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      user: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    };
    return badges[level] || badges.private;
  };

  if (loading) {
    return (
      <AdminLayout title="Storage Management">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Storage Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Storage Management</h1>
            <p className="text-slate-400 mt-1">Manage storage buckets and files for your application</p>
          </div>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <button
              onClick={() => setShowApiDocs(true)}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              API Docs
            </button>
            <button
              onClick={() => setShowCreateBucket(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Bucket
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Buckets List */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-slate-700 bg-slate-800/50">
                <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Storage Buckets
                </h3>
              </div>
              <div className="divide-y divide-slate-700/50">
                {buckets.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-700/50 rounded-xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </div>
                    <p className="text-slate-400 mb-4">No buckets yet</p>
                    <button
                      onClick={() => setShowCreateBucket(true)}
                      className="text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      Create your first bucket
                    </button>
                  </div>
                ) : (
                  buckets.map(bucket => (
                    <div
                      key={bucket.id}
                      className={`p-4 cursor-pointer transition-all ${
                        selectedBucket?.id === bucket.id
                          ? 'bg-emerald-600/10 border-l-4 border-l-emerald-500'
                          : 'hover:bg-slate-700/50 border-l-4 border-l-transparent'
                      }`}
                      onClick={() => setSelectedBucket(bucket)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-200 truncate">
                            {bucket.name}
                          </h4>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{bucket.slug}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-slate-700 text-slate-300">
                              {bucket.file_count || 0} files
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getAccessLevelBadge(bucket.access_level)}`}>
                              {bucket.access_level}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBucket(bucket.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Delete bucket"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="col-span-12 lg:col-span-8">
            {selectedBucket ? (
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                <div className="px-5 py-4 border-b border-slate-700 bg-slate-800/50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                        <span className="text-xl">
                          {selectedBucket.access_level === 'public' ? '🌐' :
                           selectedBucket.access_level === 'user' ? '👤' :
                           selectedBucket.access_level === 'admin' ? '🛡️' : '🔒'}
                        </span>
                        {selectedBucket.name}
                      </h3>
                      {selectedBucket.description && (
                        <p className="text-sm text-slate-400 mt-1">{selectedBucket.description}</p>
                      )}
                    </div>
                    <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-2">
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {uploading ? 'Uploading...' : 'Upload File'}
                    </label>
                  </div>
                </div>

                {uploading && (
                  <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-300">Uploading...</span>
                      <span className="text-sm font-semibold text-emerald-400">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">File Name</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Size</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Uploaded By</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {files.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-5 py-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-slate-700/50 rounded-xl flex items-center justify-center">
                              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <p className="text-slate-400">No files in this bucket yet</p>
                            <p className="text-slate-500 text-sm mt-1">Upload a file to get started</p>
                          </td>
                        </tr>
                      ) : (
                        files.map(file => (
                          <tr key={file.id} className="hover:bg-slate-700/30 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                  {file.mimeType?.startsWith('image/') ? (
                                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  ) : file.mimeType?.includes('pdf') ? (
                                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-slate-200 font-medium truncate max-w-[200px]">{file.originalName}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-400">{formatBytes(file.size)}</td>
                            <td className="px-5 py-4">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-700 text-slate-300">
                                {file.mimeType?.split('/')[1] || 'unknown'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-400">{file.uploadedBy || 'System'}</td>
                            <td className="px-5 py-4 text-sm text-slate-400">
                              {new Date(file.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-1">
                                <a
                                  href={file.downloadUrl}
                                  download
                                  className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                                  title="Download"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </a>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(window.location.origin + file.url);
                                    toast.success('URL copied to clipboard');
                                  }}
                                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                  title="Copy URL"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteFile(file.id)}
                                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
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
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                <div className="p-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center">
                    <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-200 mb-2">Select a bucket</h3>
                  <p className="text-slate-400 max-w-sm mx-auto">
                    Choose a bucket from the sidebar to view and manage its files
                  </p>
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
              className="bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden border border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 px-6 py-5 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl shadow-lg border border-white/20">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="font-bold text-lg tracking-tight">Storage API Documentation</h2>
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
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto bg-slate-900/50">
                {/* Authentication */}
                <div>
                  <h3 className="text-lg font-bold mb-3 text-slate-100">Authentication</h3>
                  <p className="text-sm mb-3 text-slate-400">
                    All API endpoints require Basic Authentication with your admin username and password.
                  </p>
                  <div className="relative">
                    <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto border border-slate-700">
                      <code className="text-sm text-emerald-300 font-mono">
                        Authorization: Basic base64(username:password)
                      </code>
                    </div>
                    <button
                      onClick={() => copyToClipboard('Authorization: Basic base64(username:password)', 'auth')}
                      className="absolute top-2 right-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-md transition-colors"
                    >
                      {copiedEndpoint === 'auth' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Endpoints */}
                <div>
                  <h3 className="text-lg font-bold mb-3 text-slate-100">Available Endpoints</h3>

                  {/* List Buckets */}
                  <div className="mb-4 p-4 rounded-xl border border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">GET</span>
                      <code className="text-sm font-mono text-slate-200">/api/v1/storage/buckets</code>
                    </div>
                    <p className="text-sm mb-3 text-slate-400">List all storage buckets</p>
                    <div className="relative">
                      <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto border border-slate-700">
                        <pre className="text-sm text-slate-300 font-mono">{`curl -u admin:password \\
  ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/storage/buckets`}</pre>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`curl -u admin:password ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/storage/buckets`, 'list')}
                        className="absolute top-2 right-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-md transition-colors"
                      >
                        {copiedEndpoint === 'list' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Create Bucket */}
                  <div className="mb-4 p-4 rounded-xl border border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">POST</span>
                      <code className="text-sm font-mono text-slate-200">/api/v1/storage/buckets</code>
                    </div>
                    <p className="text-sm mb-3 text-slate-400">Create a new storage bucket</p>
                    <div className="relative">
                      <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto border border-slate-700">
                        <pre className="text-sm text-slate-300 font-mono">{`curl -u admin:password \\
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
                        {copiedEndpoint === 'create' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Upload File */}
                  <div className="mb-4 p-4 rounded-xl border border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">POST</span>
                      <code className="text-sm font-mono text-slate-200">/api/storage/upload?bucket=:slug</code>
                    </div>
                    <p className="text-sm mb-3 text-slate-400">Upload a file to a bucket</p>
                    <div className="relative">
                      <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto border border-slate-700">
                        <pre className="text-sm text-slate-300 font-mono">{`curl -u admin:password \\
  -X POST \\
  -F "file=@/path/to/file.jpg" \\
  ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/storage/upload?bucket=profile-images`}</pre>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`curl -u admin:password -X POST -F "file=@/path/to/file.jpg" ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/storage/upload?bucket=profile-images`, 'upload')}
                        className="absolute top-2 right-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-md transition-colors"
                      >
                        {copiedEndpoint === 'upload' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Delete Bucket */}
                  <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded">DELETE</span>
                      <code className="text-sm font-mono text-slate-200">/api/v1/storage/buckets?id=:id</code>
                    </div>
                    <p className="text-sm mb-3 text-slate-400">Delete a bucket (must be empty)</p>
                    <div className="relative">
                      <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto border border-slate-700">
                        <pre className="text-sm text-slate-300 font-mono">{`curl -u admin:password \\
  -X DELETE \\
  ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/storage/buckets?id=1`}</pre>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`curl -u admin:password -X DELETE ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/storage/buckets?id=1`, 'delete')}
                        className="absolute top-2 right-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-md transition-colors"
                      >
                        {copiedEndpoint === 'delete' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Security Note */}
                <div className="bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 border border-emerald-500/30 p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-300 mb-1">Security Features</h4>
                      <ul className="text-xs text-slate-400 space-y-1">
                        <li>Automatic virus scanning on all uploads</li>
                        <li>File type validation against bucket configuration</li>
                        <li>Secure filename generation prevents path traversal</li>
                        <li>Access level enforcement (public, private, user, admin)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 flex justify-end border-t border-slate-700 bg-slate-800">
                <button
                  onClick={() => setShowApiDocs(false)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors font-semibold"
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
              className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with gradient */}
              <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 px-6 py-5 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl shadow-lg border border-white/20">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
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
                <div className="p-6 space-y-5 bg-slate-900/50">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-200">
                      Bucket Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      value={newBucket.name}
                      onChange={(e) => setNewBucket({ ...newBucket, name: e.target.value })}
                      required
                      placeholder="e.g., Profile Images"
                    />
                    <p className="text-xs mt-1.5 text-slate-500">
                      Use a descriptive name for easy identification
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-200">
                      Description
                    </label>
                    <textarea
                      className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      value={newBucket.description}
                      onChange={(e) => setNewBucket({ ...newBucket, description: e.target.value })}
                      rows="3"
                      placeholder="Brief description of this bucket's purpose"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-200">
                        Access Level <span className="text-red-400">*</span>
                      </label>
                      <select
                        className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        value={newBucket.access_level}
                        onChange={(e) => setNewBucket({ ...newBucket, access_level: e.target.value })}
                      >
                        <option value="public">Public - Anyone can access</option>
                        <option value="private">Private - Admin only</option>
                        <option value="user">User - Subscribers can upload</option>
                        <option value="admin">Admin - Admin upload only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-200">
                        Max File Size
                      </label>
                      <select
                        className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
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

                  <div className="bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 border border-emerald-500/30 p-4 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-300 mb-1">Security Features Included</h4>
                        <ul className="text-xs text-slate-400 space-y-0.5">
                          <li>Automatic virus scanning on upload</li>
                          <li>Malicious file type blocking</li>
                          <li>Secure file name generation</li>
                          <li>Access control enforcement</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 flex justify-end gap-3 border-t border-slate-700 bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateBucket(false)}
                    className="px-5 py-2.5 text-sm rounded-lg transition-all font-medium text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors font-semibold"
                  >
                    Create Bucket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, type: null, data: null })}
          onConfirm={() => {
            if (confirmDialog.type === 'deleteBucket') {
              deleteBucket(confirmDialog.data);
            } else if (confirmDialog.type === 'deleteFile') {
              deleteFile(confirmDialog.data);
            }
            setConfirmDialog({ isOpen: false, type: null, data: null });
          }}
          title={confirmDialog.type === 'deleteBucket' ? 'Delete Bucket' : 'Delete File'}
          message={confirmDialog.type === 'deleteBucket'
            ? 'Are you sure you want to delete this bucket? This action cannot be undone.'
            : 'Are you sure you want to delete this file? This action cannot be undone.'}
          confirmText="Delete"
          variant="danger"
        />
      </div>
    </AdminLayout>
  );
}
