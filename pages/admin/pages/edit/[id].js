import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/AdminLayout';

export default function EditPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [pageData, setPageData] = useState({
    title: '',
    slug: '',
    meta_description: '',
    html_content: '',
    css_content: '',
    js_content: '',
    is_published: false,
    access_level: 'public'
  });
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('visual'); // 'visual' or 'code'

  const fetchPage = useCallback(async () => {
    if (!id) return;
    
    try {
      const response = await fetch(`/api/pages/${id}`);
      if (response.ok) {
        const page = await response.json();
        setPageData(page);
      } else {
        setError('Failed to load page');
      }
    } catch (error) {
      console.error('Failed to fetch page:', error);
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const savePage = async () => {
    if (!pageData.title || !pageData.slug || !pageData.html_content) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageData),
      });

      if (response.ok) {
        router.push('/admin/pages');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save page');
      }
    } catch (err) {
      setError('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  };

  const handleChange = (field, value) => {
    setPageData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-generate slug when title changes
      if (field === 'title') {
        newData.slug = generateSlug(value);
      }
      
      return newData;
    });
  };

  if (loading) {
    return (
      <AdminLayout title="Edit Page">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <div className="text-lg text-slate-300">Loading page...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Edit Page">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Edit Page</h1>
            <p className="text-slate-400 mt-1">Modify your page content and settings</p>
          </div>
          <div className="flex bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setMode('visual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'visual' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              👁️ Visual
            </button>
            <button
              onClick={() => setMode('code')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'code' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              💻 Code
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-600/30 text-red-300 px-4 py-3 rounded-xl">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="space-y-6">
            {/* Page Settings */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Page Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Page Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={pageData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="Enter page title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    URL Slug <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={pageData.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="page-url-slug"
                    required
                  />
                  <p className="text-sm text-slate-400 mt-1">Will be accessible at: /{pageData.slug}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={pageData.meta_description}
                    onChange={(e) => handleChange('meta_description', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    rows={3}
                    placeholder="Brief description for SEO"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={pageData.is_published}
                        onChange={(e) => handleChange('is_published', e.target.checked)}
                        className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                      />
                      <span className="text-sm font-medium text-slate-300">Published</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Access Level
                    </label>
                    <select
                      value={pageData.access_level}
                      onChange={(e) => handleChange('access_level', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    >
                      <option value="public">Public</option>
                      <option value="subscriber">Subscribers Only</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Content</h3>
              
              {mode === 'visual' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    HTML Content <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={pageData.html_content}
                    onChange={(e) => handleChange('html_content', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-mono text-sm"
                    rows={12}
                    placeholder="Enter your HTML content"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      HTML Content <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={pageData.html_content}
                      onChange={(e) => handleChange('html_content', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-mono text-sm"
                      rows={8}
                      placeholder="Enter your HTML content"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      CSS Styles
                    </label>
                    <textarea
                      value={pageData.css_content}
                      onChange={(e) => handleChange('css_content', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-mono text-sm"
                      rows={6}
                      placeholder="Enter your CSS styles"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      JavaScript
                    </label>
                    <textarea
                      value={pageData.js_content}
                      onChange={(e) => handleChange('js_content', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-mono text-sm"
                      rows={6}
                      placeholder="Enter your JavaScript code"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={savePage}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
              <button
                onClick={() => router.push('/admin/pages')}
                className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center">
                <span className="mr-2">👁️</span>
                Live Preview
              </h3>
              <div className="text-xs text-slate-400">
                {pageData.html_content.length} characters
              </div>
            </div>

            <div className="bg-white" style={{ height: '600px' }}>
              {pageData.html_content ? (
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>${pageData.title}</title>
                      <style>${pageData.css_content || ''}</style>
                    </head>
                    <body>
                      ${pageData.html_content}
                      <script>${pageData.js_content || ''}</script>
                    </body>
                    </html>
                  `}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-forms allow-modals"
                  title="Page Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-slate-50">
                  <div className="text-center text-slate-500">
                    <div className="text-6xl mb-4">📄</div>
                    <h3 className="text-lg font-medium mb-2">No content yet</h3>
                    <p className="text-sm">Add HTML content to see the preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}