import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function ABTests() {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingExperiment, setEditingExperiment] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    page_path: '',
    status: 'active',
    variants: [
      { name: 'A', traffic_split: 50, content: '' },
      { name: 'B', traffic_split: 50, content: '' }
    ]
  });

  useEffect(() => {
    fetchExperiments();
  }, []);

  const fetchExperiments = async () => {
    try {
      const response = await fetch('/api/ab-test');
      const data = await response.json();
      setExperiments(data || []);
    } catch (error) {
      console.error('Failed to fetch experiments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingExperiment ? `/api/ab-test/${editingExperiment.id}` : '/api/ab-test';
      const method = editingExperiment ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowCreateForm(false);
        setEditingExperiment(null);
        resetForm();
        fetchExperiments();
      }
    } catch (error) {
      console.error('Failed to save experiment:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this experiment?')) return;
    
    try {
      const response = await fetch(`/api/ab-test/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchExperiments();
      }
    } catch (error) {
      console.error('Failed to delete experiment:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      page_path: '',
      status: 'active',
      variants: [
        { name: 'A', traffic_split: 50, content: '' },
        { name: 'B', traffic_split: 50, content: '' }
      ]
    });
  };

  const editExperiment = (experiment) => {
    setEditingExperiment(experiment);
    setFormData({
      name: experiment.name,
      description: experiment.description || '',
      page_path: experiment.page_path || '',
      status: experiment.status,
      variants: experiment.variants || [
        { name: 'A', traffic_split: 50, content: '' },
        { name: 'B', traffic_split: 50, content: '' }
      ]
    });
    setShowCreateForm(true);
  };

  const updateVariant = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    setFormData({ ...formData, variants: newVariants });
  };

  const addVariant = () => {
    const newVariants = [...formData.variants];
    const splitPercentage = Math.floor(100 / (newVariants.length + 1));
    
    // Redistribute traffic evenly
    newVariants.forEach(v => v.traffic_split = splitPercentage);
    newVariants.push({
      name: String.fromCharCode(65 + newVariants.length),
      traffic_split: splitPercentage,
      content: ''
    });
    
    setFormData({ ...formData, variants: newVariants });
  };

  const removeVariant = (index) => {
    if (formData.variants.length <= 2) return; // Must have at least 2 variants
    
    const newVariants = formData.variants.filter((_, i) => i !== index);
    const splitPercentage = Math.floor(100 / newVariants.length);
    newVariants.forEach(v => v.traffic_split = splitPercentage);
    
    setFormData({ ...formData, variants: newVariants });
  };

  if (loading) {
    return (
      <AdminLayout title="A/B Testing">
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <div className="text-lg text-slate-300">Loading experiments...</div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="A/B Testing">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">A/B Testing Experiments</h1>
            <p className="text-slate-400 mt-1">Create and manage split tests to optimize conversions</p>
          </div>
          <button
            onClick={() => { setShowCreateForm(true); resetForm(); }}
            className="mt-4 sm:mt-0 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Create Experiment
          </button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200">
                {editingExperiment ? 'Edit Experiment' : 'Create New Experiment'}
              </h3>
            </div>
            <div className="p-6">
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Experiment Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Path (optional - for specific pages)
                </label>
                <input
                  type="text"
                  value={formData.page_path}
                  onChange={(e) => setFormData({ ...formData, page_path: e.target.value })}
                  placeholder="/pricing"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Variants */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Variants
                  </label>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Variant
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.variants.map((variant, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">Variant {variant.name}</span>
                        {formData.variants.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Traffic Split (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={variant.traffic_split}
                            onChange={(e) => updateVariant(index, 'traffic_split', parseInt(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">HTML Content</label>
                        <textarea
                          value={variant.content}
                          onChange={(e) => updateVariant(index, 'content', e.target.value)}
                          placeholder="<h1>Variant content...</h1>"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          rows="3"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  {editingExperiment ? 'Update Experiment' : 'Create Experiment'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false); setEditingExperiment(null); }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        )}

        {/* Experiments List */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200">Experiments</h3>
          </div>
          
          {experiments.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              No experiments created yet. Create your first A/B test to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Experiment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Page
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Variants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800 divide-y divide-slate-700">
                  {experiments.map((experiment) => (
                    <tr key={experiment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{experiment.name}</div>
                          {experiment.description && (
                            <div className="text-sm text-gray-500">{experiment.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {experiment.page_path || 'All pages'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          experiment.status === 'active' ? 'bg-green-100 text-green-800' :
                          experiment.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {experiment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {experiment.variants ? experiment.variants.length : 2} variants
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(experiment.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => editExperiment(experiment)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(experiment.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Implementation Guide */}
        <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-emerald-300 mb-4">Implementation Guide</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-emerald-300 mb-2">JavaScript Implementation:</h5>
              <pre className="bg-slate-800 text-slate-200 p-3 rounded text-xs overflow-x-auto border border-slate-700">
{`// Apply A/B test variant
ABTest.applyVariant(1, '#hero-section').then(variant => {
  console.log('Applied variant:', variant.variant);
});

// Get variant data only
ABTest.getVariant(1).then(variant => {
  if (variant.variant === 'B') {
    // Custom logic for variant B
  }
});`}
              </pre>
            </div>
            <div>
              <h5 className="font-medium text-emerald-300 mb-2">HTML Target Example:</h5>
              <pre className="bg-slate-800 text-slate-200 p-3 rounded text-xs overflow-x-auto border border-slate-700">
{`<!-- Original content -->
<div id="hero-section">
  <h1>Original headline</h1>
  <p>Original description</p>
</div>

<!-- Will be replaced by variant content -->`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}