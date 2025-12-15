import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '../../../components/AdminLayout';

export default function BlogTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title_pattern: '',
    content_template: '',
    excerpt_template: '',
    slug_pattern: '',
    seo_title_pattern: '',
    seo_description_pattern: '',
    seo_keywords_pattern: ''
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

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
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/blog/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchTemplates();
        setShowForm(false);
        setFormData({
          name: '',
          title_pattern: '',
          content_template: '',
          excerpt_template: '',
          slug_pattern: '',
          seo_title_pattern: '',
          seo_description_pattern: '',
          seo_keywords_pattern: ''
        });
      }
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <AdminLayout title="Blog Templates">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <div className="text-lg text-slate-300">Loading templates...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Blog Templates">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Programmatic Blog Templates</h1>
            <p className="text-slate-400 mt-1">Create templates for automated blog post generation</p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <Link 
              href="/admin/blog/generate" 
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Generate Posts</span>
            </Link>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>New Template</span>
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-slate-800 border border-slate-700 shadow-xl rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">Create New Template</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Template Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g., Product Review Template"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Slug Pattern</label>
                  <input
                    type="text"
                    name="slug_pattern"
                    value={formData.slug_pattern}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="{{category}}-{{product_name}}-review"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Title Pattern</label>
                <input
                  type="text"
                  name="title_pattern"
                  value={formData.title_pattern}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none"
                  placeholder="{{product_name}} Review: {{rating}}/5 Stars"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Content Template</label>
                <textarea
                  name="content_template"
                  value={formData.content_template}
                  onChange={handleInputChange}
                  required
                  rows={8}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none"
                  placeholder="# {{product_name}} Review&#10;&#10;## Overview&#10;{{product_name}} is a {{category}} that {{description}}.&#10;&#10;## Rating: {{rating}}/5&#10;{{review_content}}"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Excerpt Template</label>
                <textarea
                  name="excerpt_template"
                  value={formData.excerpt_template}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none"
                  placeholder="Our comprehensive review of {{product_name}} - rated {{rating}}/5 stars."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">SEO Title Pattern</label>
                  <input
                    type="text"
                    name="seo_title_pattern"
                    value={formData.seo_title_pattern}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="{{product_name}} Review {{year}} - {{rating}}/5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">SEO Description Pattern</label>
                  <input
                    type="text"
                    name="seo_description_pattern"
                    value={formData.seo_description_pattern}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="Read our detailed {{product_name}} review. Rating: {{rating}}/5. {{category}} review with pros, cons, and pricing."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">SEO Keywords Pattern</label>
                  <input
                    type="text"
                    name="seo_keywords_pattern"
                    value={formData.seo_keywords_pattern}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="{{product_name}}, {{category}}, review, {{brand}}"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  Create Template
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Templates List */}
        <div className="bg-slate-800 border border-slate-700 shadow-xl rounded-xl overflow-hidden">
          {templates.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No templates yet</h3>
              <p className="text-slate-400 mb-6">
                Create your first template to start generating programmatic blog posts
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create your first template</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Template Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Title Pattern
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Slug Pattern
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800 divide-y divide-slate-700">
                  {Array.isArray(templates) && templates.map((template, index) => (
                    <tr 
                      key={template.id} 
                      className="hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-semibold text-slate-200">
                          {template.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300 text-sm max-w-xs truncate">
                          {template.title_pattern}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300 font-mono text-sm max-w-xs truncate">
                          {template.slug_pattern}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-sm font-medium rounded-full ${
                          template.is_active 
                            ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-600/30' 
                            : 'bg-gray-900/30 text-gray-300 border border-gray-600/30'
                        }`}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <Link
                            href={`/admin/blog/generate?template=${template.id}`}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Generate
                          </Link>
                          <button className="text-emerald-400 hover:text-emerald-300 transition-colors">
                            Edit
                          </button>
                          <button className="text-red-400 hover:text-red-300 transition-colors">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-emerald-300 mb-2">
                Template Variables
              </h3>
              <div className="text-emerald-200/80 space-y-2">
                <p>• Use <code className="bg-emerald-800/30 px-2 py-1 rounded">{'{{variable_name}}'}</code> to insert dynamic content</p>
                <p>• Example: <code className="bg-emerald-800/30 px-2 py-1 rounded">{'{{product_name}} Review: {{rating}}/5 Stars'}</code></p>
                <p>• Variables will be replaced with actual data when generating posts</p>
                <p>• Use consistent variable names across title, content, and SEO fields</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}