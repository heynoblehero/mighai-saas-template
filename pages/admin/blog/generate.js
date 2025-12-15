import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '../../../components/AdminLayout';

export default function GenerateBlogPosts() {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [dataInput, setDataInput] = useState('');
  const [dataFormat, setDataFormat] = useState('json');
  const [dataSource, setDataSource] = useState('manual'); // 'manual' or 'file'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [generated, setGenerated] = useState(null);

  useEffect(() => {
    fetchTemplates();
    
    // Check if template is pre-selected from URL
    if (router.query.template) {
      setSelectedTemplate(router.query.template);
    }
  }, [router.query]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/blog/templates');
      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setTemplates(data);
      } else {
        console.error('Templates data is not an array:', data);
        setTemplates([]);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('dataFile', file);

    setLoading(true);
    try {
      const response = await fetch('/api/upload/blog-data', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        setUploadedFile(result);
        setDataInput(JSON.stringify(result.sampleData, null, 2));
        setDataFormat('json');
      } else {
        alert('Upload failed: ' + result.error);
      }
    } catch (error) {
      alert('Upload error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const parseDataInput = async () => {
    try {
      if (dataSource === 'file' && uploadedFile) {
        const response = await fetch(`/api/blog/data-source?fileName=${uploadedFile.filePath}`);
        const result = await response.json();
        if (result.success) {
          return result.data;
        } else {
          throw new Error('Failed to load file data');
        }
      } else {
        if (dataFormat === 'json') {
          return JSON.parse(dataInput);
        } else if (dataFormat === 'csv') {
          const lines = dataInput.trim().split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          const data = [];
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            data.push(row);
          }
          
          return data;
        }
      }
    } catch (error) {
      throw new Error(`Invalid data format: ${error.message}`);
    }
  };

  const handlePreview = async () => {
    if (!selectedTemplate || (!dataInput.trim() && !uploadedFile)) {
      alert('Please select a template and provide data');
      return;
    }

    setLoading(true);
    try {
      const dataArray = await parseDataInput();
      
      const response = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate,
          data_array: dataArray,
          preview_only: true
        })
      });

      const result = await response.json();
      if (result.success) {
        setPreview(result);
      } else {
        alert('Failed to generate preview: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || (!dataInput.trim() && !uploadedFile)) {
      alert('Please select a template and provide data');
      return;
    }

    setLoading(true);
    try {
      const dataArray = await parseDataInput();
      
      const response = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate,
          data_array: dataArray,
          preview_only: false
        })
      });

      const result = await response.json();
      if (result.success) {
        setGenerated(result);
        setPreview(null);
      } else {
        alert('Failed to generate posts: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sampleJsonData = `[
  {
    "product_name": "iPhone 15 Pro",
    "category": "smartphone",
    "rating": "4.5",
    "price": "$999",
    "brand": "Apple",
    "year": "2024"
  },
  {
    "product_name": "Samsung Galaxy S24",
    "category": "smartphone", 
    "rating": "4.3",
    "price": "$899",
    "brand": "Samsung",
    "year": "2024"
  }
]`;

  const sampleCsvData = `product_name,category,rating,price,brand,year
iPhone 15 Pro,smartphone,4.5,$999,Apple,2024
Samsung Galaxy S24,smartphone,4.3,$899,Samsung,2024
Google Pixel 8,smartphone,4.2,$699,Google,2024`;

  return (
    <AdminLayout title="Generate Blog Posts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Generate Blog Posts</h1>
            <p className="text-slate-400 mt-1">Create multiple blog posts from templates and data</p>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="bg-slate-800 border border-slate-700 shadow-xl rounded-xl p-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Configuration</h2>
          
          <div className="space-y-4">
            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Select Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                disabled={templatesLoading}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">
                  {templatesLoading ? 'Loading templates...' : 'Choose a template...'}
                </option>
                {Array.isArray(templates) && templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              {!templatesLoading && templates.length === 0 && (
                <p className="mt-2 text-sm text-yellow-400">
                  No templates found. <Link href="/admin/blog/templates" className="text-emerald-400 hover:text-emerald-300">Create one first</Link>.
                </p>
              )}
            </div>

            {/* Data Source Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Data Source</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="manual"
                    checked={dataSource === 'manual'}
                    onChange={(e) => {
                      setDataSource(e.target.value);
                      setUploadedFile(null);
                    }}
                    className="mr-2"
                  />
                  <span className="text-slate-300">Manual Input</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="file"
                    checked={dataSource === 'file'}
                    onChange={(e) => setDataSource(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-slate-300">File Upload</span>
                </label>
              </div>
            </div>

            {/* File Upload */}
            {dataSource === 'file' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Upload Data File</label>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="text-slate-400 mb-2">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-slate-300">Click to upload CSV or JSON file</p>
                    <p className="text-slate-500 text-sm">Max file size: 10MB</p>
                  </label>
                </div>
                
                {uploadedFile && (
                  <div className="mt-3 p-3 bg-emerald-900/30 border border-emerald-600/30 rounded-lg">
                    <p className="text-emerald-200 text-sm">
                      <strong>Uploaded:</strong> {uploadedFile.fileName} 
                      ({uploadedFile.recordCount} records)
                    </p>
                    <p className="text-emerald-200/80 text-xs mt-1">
                      Available fields: {uploadedFile.availableFields?.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Data Format Selection - only for manual input */}
            {dataSource === 'manual' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Data Format</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="json"
                      checked={dataFormat === 'json'}
                      onChange={(e) => setDataFormat(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-slate-300">JSON</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="csv"
                      checked={dataFormat === 'csv'}
                      onChange={(e) => setDataFormat(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-slate-300">CSV</span>
                  </label>
                </div>
              </div>
            )}

            {/* Data Input - only for manual input */}
            {dataSource === 'manual' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Data Input ({dataFormat.toUpperCase()})
                </label>
                <textarea
                  value={dataInput}
                  onChange={(e) => setDataInput(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none font-mono text-sm"
                  placeholder={dataFormat === 'json' ? sampleJsonData : sampleCsvData}
                />
                <div className="mt-2 flex space-x-2">
                  <button
                    onClick={() => setDataInput(dataFormat === 'json' ? sampleJsonData : sampleCsvData)}
                    className="text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    Load Sample Data
                  </button>
                </div>
              </div>
            )}

            {/* File Preview - only for file upload */}
            {dataSource === 'file' && uploadedFile && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  File Preview (Sample Data)
                </label>
                <textarea
                  value={dataInput}
                  readOnly
                  rows={8}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 font-mono text-sm"
                  placeholder="File preview will appear here..."
                />
                <p className="mt-2 text-sm text-slate-400">
                  Showing sample of {uploadedFile.recordCount} total records
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handlePreview}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg font-medium transition-colors"
              >
                {loading ? 'Processing...' : 'Preview Posts'}
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-lg font-medium transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Posts'}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Results */}
        {preview && (
          <div className="bg-slate-800 border border-slate-700 shadow-xl rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">
              Preview ({preview.generated} posts)
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {preview.posts.slice(0, 3).map((post, index) => (
                <div key={index} className="bg-slate-700 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">{post.title}</h3>
                  <p className="text-slate-300 text-sm mb-2">Slug: /{post.slug}</p>
                  <p className="text-slate-400 text-sm">{post.excerpt}</p>
                </div>
              ))}
              {preview.posts.length > 3 && (
                <p className="text-slate-400 text-center">
                  ... and {preview.posts.length - 3} more posts
                </p>
              )}
            </div>
            {preview.errors.length > 0 && (
              <div className="mt-4 p-4 bg-red-900/30 border border-red-600/30 rounded-lg">
                <h4 className="text-red-300 font-semibold mb-2">Errors ({preview.errors.length})</h4>
                <div className="text-red-200 text-sm space-y-1">
                  {preview.errors.slice(0, 3).map((error, index) => (
                    <p key={index}>Row {error.row}: {error.error}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generation Results */}
        {generated && (
          <div className="bg-slate-800 border border-slate-700 shadow-xl rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">
              Generation Complete! 🎉
            </h2>
            <div className="bg-emerald-900/30 border border-emerald-600/30 rounded-lg p-4 mb-4">
              <p className="text-emerald-200">
                Successfully generated <strong>{generated.generated}</strong> blog posts as drafts.
              </p>
              <p className="text-emerald-200/80 text-sm mt-1">
                You can now review and publish them from the blog management page.
              </p>
            </div>
            
            {generated.errors.length > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-600/30 rounded-lg p-4 mb-4">
                <h4 className="text-yellow-300 font-semibold mb-2">
                  Some rows had errors ({generated.errors.length})
                </h4>
                <div className="text-yellow-200 text-sm space-y-1 max-h-32 overflow-y-auto">
                  {generated.errors.map((error, index) => (
                    <p key={index}>Row {error.row}: {error.error}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/admin/blog')}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                View Generated Posts
              </button>
              <button
                onClick={() => {
                  setGenerated(null);
                  setPreview(null);
                  setDataInput('');
                }}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                Generate More
              </button>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-blue-300 mb-2">
                How to Use
              </h3>
              <div className="text-blue-200/80 space-y-2">
                <p>1. <strong>Select a template</strong> that matches your content structure</p>
                <p>2. <strong>Prepare your data</strong> in JSON or CSV format with matching variable names</p>
                <p>3. <strong>Preview posts</strong> to check formatting and catch errors</p>
                <p>4. <strong>Generate posts</strong> to create them as drafts in your blog</p>
                <p>5. <strong>Review and publish</strong> individual posts as needed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}