import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';

export default function DatabaseManagement() {
  const router = useRouter();
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showNewModelModal, setShowNewModelModal] = useState(false);
  const [showEditRecordModal, setShowEditRecordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showApiDetails, setShowApiDetails] = useState(false);
  const [showEditModelModal, setShowEditModelModal] = useState(false);
  const [showDeleteModelConfirm, setShowDeleteModelConfirm] = useState(false);

  // Form state
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordForm, setRecordForm] = useState({});

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (selectedModel) {
      loadRecords(selectedModel.name);
    }
  }, [selectedModel]);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/models');
      const data = await response.json();

      if (data.success) {
        setModels(data.models);
        // Auto-select first model (users by default)
        if (data.models.length > 0 && !selectedModel) {
          setSelectedModel(data.models[0]);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async (modelName) => {
    try {
      const response = await fetch(`/api/admin/data/${modelName}`);
      const data = await response.json();

      if (data.success) {
        setRecords(data.records);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load records');
    }
  };

  const handleCreateRecord = () => {
    setEditingRecord(null);
    setRecordForm({});
    setShowEditRecordModal(true);
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setRecordForm({ ...record });
    setShowEditRecordModal(true);
  };

  const handleSaveRecord = async () => {
    try {
      const url = editingRecord
        ? `/api/admin/data/${selectedModel.name}?id=${editingRecord.id}`
        : `/api/admin/data/${selectedModel.name}`;

      const response = await fetch(url, {
        method: editingRecord ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordForm)
      });

      const data = await response.json();

      if (data.success) {
        setShowEditRecordModal(false);
        loadRecords(selectedModel.name);
        setRecordForm({});
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to save record');
    }
  };

  const handleDeleteRecord = async (recordId) => {
    try {
      const response = await fetch(`/api/admin/data/${selectedModel.name}?id=${recordId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        loadRecords(selectedModel.name);
        setShowDeleteConfirm(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to delete record');
    }
  };

  const handleDeleteModel = async () => {
    try {
      const response = await fetch(`/api/admin/models?name=${selectedModel.name}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setShowDeleteModelConfirm(false);
        setSelectedModel(null);
        loadModels();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to delete model');
    }
  };

  const renderFieldInput = (fieldName, fieldSchema) => {
    const value = recordForm[fieldName] || '';

    const commonClasses = "w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500";

    switch (fieldSchema.type) {
      case 'textarea':
      case 'richtext':
        return (
          <textarea
            value={value}
            onChange={(e) => setRecordForm({ ...recordForm, [fieldName]: e.target.value })}
            className={`${commonClasses} min-h-[100px]`}
            placeholder={`Enter ${fieldName}`}
            required={fieldSchema.required}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setRecordForm({ ...recordForm, [fieldName]: e.target.value })}
            className={commonClasses}
            required={fieldSchema.required}
          >
            <option value="">Select {fieldName}</option>
            {fieldSchema.options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => setRecordForm({ ...recordForm, [fieldName]: e.target.checked })}
              className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500"
            />
            <span className="text-slate-300">Yes</span>
          </label>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setRecordForm({ ...recordForm, [fieldName]: e.target.value })}
            className={commonClasses}
            placeholder={`Enter ${fieldName}`}
            required={fieldSchema.required}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => setRecordForm({ ...recordForm, [fieldName]: e.target.value })}
            className={commonClasses}
            placeholder={`Enter ${fieldName}`}
            required={fieldSchema.required}
          />
        );

      case 'password':
        return (
          <input
            type="password"
            value={value}
            onChange={(e) => setRecordForm({ ...recordForm, [fieldName]: e.target.value })}
            className={commonClasses}
            placeholder={editingRecord ? "Leave blank to keep current" : `Enter ${fieldName}`}
            required={!editingRecord && fieldSchema.required}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => setRecordForm({ ...recordForm, [fieldName]: e.target.value })}
            className={commonClasses}
            required={fieldSchema.required}
          />
        );

      case 'datetime':
        if (fieldSchema.auto) {
          return <div className="text-slate-400 text-sm">Auto-generated</div>;
        }
        return (
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => setRecordForm({ ...recordForm, [fieldName]: e.target.value })}
            className={commonClasses}
            required={fieldSchema.required}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setRecordForm({ ...recordForm, [fieldName]: e.target.value })}
            className={commonClasses}
            placeholder={`Enter ${fieldName}`}
            required={fieldSchema.required}
          />
        );
    }
  };

  const renderFieldValue = (value, fieldSchema) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-slate-500">-</span>;
    }

    switch (fieldSchema.type) {
      case 'boolean':
        return value ? '✓ Yes' : '✗ No';
      case 'date':
      case 'datetime':
        return new Date(value).toLocaleString();
      case 'password':
        return '••••••••';
      default:
        return String(value).substring(0, 100);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Database Management">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Database Management">
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar - Models List */}
        <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <button
              onClick={() => setShowNewModelModal(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <span>+</span>
              <span>New Model</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {models.map((model) => (
              <button
                key={model.name}
                onClick={() => setSelectedModel(model)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 ${
                  selectedModel?.name === model.name
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                }`}
              >
                <span className="text-2xl">{model.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{model.displayName}</div>
                  {model.isSystem && (
                    <div className="text-xs opacity-70">System</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side - Data Table */}
        <div className="flex-1 flex flex-col bg-slate-900">
          {selectedModel ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-slate-700 bg-slate-800">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-3">
                      <span className="text-3xl">{selectedModel.icon}</span>
                      <span>{selectedModel.displayName}</span>
                    </h1>
                    {selectedModel.description && (
                      <p className="text-slate-400 mt-1">{selectedModel.description}</p>
                    )}
                    <div className="text-sm text-slate-400 mt-2">
                      {records.length} {records.length === 1 ? 'record' : 'records'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowApiDetails(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                    >
                      <span>📡</span>
                      <span>API Details</span>
                    </button>
                    {!selectedModel.isSystem && (
                      <>
                        <button
                          onClick={() => setShowEditModelModal(true)}
                          className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          Edit Model
                        </button>
                        <button
                          onClick={() => setShowDeleteModelConfirm(true)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          Delete Model
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleCreateRecord}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                    >
                      <span>+</span>
                      <span>Add Record</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-auto p-6">
                {error && (
                  <div className="bg-red-900/20 border border-red-600/30 text-red-300 px-4 py-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                {records.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-medium text-slate-300 mb-2">No records yet</h3>
                    <p className="text-slate-400 mb-4">Create your first record to get started</p>
                    <button
                      onClick={handleCreateRecord}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Add First Record
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-700/50 border-b border-slate-600">
                          <tr>
                            {Object.keys(selectedModel.schema).map((fieldName) => (
                              <th
                                key={fieldName}
                                className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider"
                              >
                                {fieldName}
                                {selectedModel.schema[fieldName].required && (
                                  <span className="text-red-400 ml-1">*</span>
                                )}
                              </th>
                            ))}
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {records.map((record) => (
                            <tr key={record.id} className="hover:bg-slate-700/30 transition-colors">
                              {Object.keys(selectedModel.schema).map((fieldName) => (
                                <td key={fieldName} className="px-4 py-3 text-sm text-slate-300">
                                  {renderFieldValue(record[fieldName], selectedModel.schema[fieldName])}
                                </td>
                              ))}
                              <td className="px-4 py-3 text-right space-x-2">
                                <button
                                  onClick={() => handleEditRecord(record)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(record)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">🗄️</div>
                <h3 className="text-xl font-medium text-slate-300 mb-2">Select a model</h3>
                <p className="text-slate-400">Choose a model from the sidebar to view and manage data</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit/Create Record Modal */}
      {showEditRecordModal && selectedModel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-slate-100">
                {editingRecord ? 'Edit Record' : 'Create New Record'}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {Object.entries(selectedModel.schema).map(([fieldName, fieldSchema]) => {
                if (fieldSchema.auto) return null;

                return (
                  <div key={fieldName}>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {fieldName}
                      {fieldSchema.required && <span className="text-red-400 ml-1">*</span>}
                      {fieldSchema.unique && <span className="text-blue-400 ml-1">(unique)</span>}
                    </label>
                    {renderFieldInput(fieldName, fieldSchema)}
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t border-slate-700 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditRecordModal(false);
                  setRecordForm({});
                  setError('');
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRecord}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                {editingRecord ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Confirm Delete</h2>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete this record? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRecord(showDeleteConfirm.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Model Modal - Placeholder */}
      {showNewModelModal && (
        <NewModelModal
          onClose={() => setShowNewModelModal(false)}
          onSuccess={() => {
            setShowNewModelModal(false);
            loadModels();
          }}
        />
      )}

      {/* API Details Modal */}
      {showApiDetails && selectedModel && (
        <ApiDetailsModal
          model={selectedModel}
          onClose={() => setShowApiDetails(false)}
        />
      )}

      {/* Edit Model Modal */}
      {showEditModelModal && selectedModel && (
        <EditModelModal
          model={selectedModel}
          onClose={() => setShowEditModelModal(false)}
          onSuccess={() => {
            setShowEditModelModal(false);
            loadModels();
          }}
        />
      )}

      {/* Delete Model Confirmation */}
      {showDeleteModelConfirm && selectedModel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Delete Model</h2>
            <p className="text-slate-300 mb-4">
              Are you sure you want to delete the <strong>{selectedModel.displayName}</strong> model?
            </p>
            <p className="text-red-400 text-sm mb-6">
              Warning: This will permanently delete all {records.length} records in this model. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModelConfirm(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteModel}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete Model
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// New Model Modal Component
function NewModelModal({ onClose, onSuccess }) {
  const [modelForm, setModelForm] = useState({
    name: '',
    displayName: '',
    description: '',
    icon: '📄',
    authentication: 'required'
  });
  const [schema, setSchema] = useState({});
  const [newField, setNewField] = useState({
    name: '',
    type: 'text',
    required: false,
    unique: false
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'number', label: 'Number' },
    { value: 'email', label: 'Email' },
    { value: 'password', label: 'Password' },
    { value: 'select', label: 'Select (dropdown)' },
    { value: 'boolean', label: 'Yes/No' },
    { value: 'date', label: 'Date' },
    { value: 'datetime', label: 'Date & Time' },
    { value: 'url', label: 'URL' }
  ];

  const iconOptions = ['📄', '👤', '📦', '🏷️', '📊', '💰', '📝', '🎯', '⚙️', '🔔'];

  const addField = () => {
    if (!newField.name) {
      setError('Field name is required');
      return;
    }

    if (!/^[a-z][a-zA-Z0-9]*$/.test(newField.name)) {
      setError('Field name must start with lowercase letter and contain only letters and numbers');
      return;
    }

    if (schema[newField.name]) {
      setError('Field already exists');
      return;
    }

    const fieldConfig = {
      type: newField.type,
      required: newField.required,
      unique: newField.unique
    };

    if (newField.type === 'select' && newField.options) {
      fieldConfig.options = newField.options.split(',').map(o => o.trim()).filter(Boolean);
    }

    setSchema({ ...schema, [newField.name]: fieldConfig });
    setNewField({ name: '', type: 'text', required: false, unique: false });
    setError('');
  };

  const removeField = (fieldName) => {
    const newSchema = { ...schema };
    delete newSchema[fieldName];
    setSchema(newSchema);
  };

  const handleCreate = async () => {
    if (!modelForm.name) {
      setError('Model name is required');
      return;
    }

    if (Object.keys(schema).length === 0) {
      setError('Add at least one field to the schema');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...modelForm,
          schema
        })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create model');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-slate-100">Create New Model</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-600/30 text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Model Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={modelForm.name}
                  onChange={(e) => setModelForm({ ...modelForm, name: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., products, orders, posts"
                />
                <p className="text-xs text-slate-400 mt-1">Lowercase, no spaces (used in API)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={modelForm.displayName}
                  onChange={(e) => setModelForm({ ...modelForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., Products, Orders"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={modelForm.description}
                onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={2}
                placeholder="What is this model for?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Icon
              </label>
              <div className="flex space-x-2">
                {iconOptions.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setModelForm({ ...modelForm, icon })}
                    className={`text-2xl p-2 rounded-lg transition-colors ${
                      modelForm.icon === icon
                        ? 'bg-emerald-600'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Schema Builder */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">Schema Fields</h3>

            {/* Add Field Form */}
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <input
                    type="text"
                    value={newField.name}
                    onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Field name"
                  />
                </div>

                <div className="col-span-3">
                  <select
                    value={newField.type}
                    onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {fieldTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {newField.type === 'select' && (
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={newField.options || ''}
                      onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Options (comma separated)"
                    />
                  </div>
                )}

                <div className={`${newField.type === 'select' ? 'col-span-2' : 'col-span-5'} flex items-center space-x-3`}>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newField.required}
                      onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-300">Required</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newField.unique}
                      onChange={(e) => setNewField({ ...newField, unique: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-300">Unique</span>
                  </label>
                </div>

                <div className="col-span-1">
                  <button
                    onClick={addField}
                    className="w-full h-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Fields List */}
            {Object.keys(schema).length > 0 && (
              <div className="space-y-2">
                {Object.entries(schema).map(([fieldName, fieldConfig]) => (
                  <div
                    key={fieldName}
                    className="bg-slate-700 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="font-medium text-slate-200">{fieldName}</span>
                      <span className="text-sm text-slate-400">{fieldConfig.type}</span>
                      {fieldConfig.required && (
                        <span className="text-xs bg-red-900/30 text-red-300 px-2 py-1 rounded">Required</span>
                      )}
                      {fieldConfig.unique && (
                        <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded">Unique</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeField(fieldName)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Model'}
          </button>
        </div>
      </div>
    </div>
  );
}

// API Details Modal Component
function ApiDetailsModal({ model, onClose }) {
  const [copied, setCopied] = useState('');
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const endpoints = [
    {
      title: 'Get All Records',
      method: 'GET',
      url: `${baseUrl}/api/admin/data/${model.name}`,
      description: 'Retrieve all records from the model',
      example: `fetch('${baseUrl}/api/admin/data/${model.name}')
  .then(res => res.json())
  .then(data => console.log(data));`
    },
    {
      title: 'Get Single Record',
      method: 'GET',
      url: `${baseUrl}/api/admin/data/${model.name}?id={id}`,
      description: 'Retrieve a specific record by ID',
      example: `fetch('${baseUrl}/api/admin/data/${model.name}?id=RECORD_ID')
  .then(res => res.json())
  .then(data => console.log(data));`
    },
    {
      title: 'Create Record',
      method: 'POST',
      url: `${baseUrl}/api/admin/data/${model.name}`,
      description: 'Create a new record',
      example: `fetch('${baseUrl}/api/admin/data/${model.name}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ${Object.keys(model.schema).slice(0, 2).map(k => `${k}: 'value'`).join(',\n    ')}
  })
})
  .then(res => res.json())
  .then(data => console.log(data));`
    },
    {
      title: 'Update Record',
      method: 'PUT',
      url: `${baseUrl}/api/admin/data/${model.name}?id={id}`,
      description: 'Update an existing record',
      example: `fetch('${baseUrl}/api/admin/data/${model.name}?id=RECORD_ID', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ${Object.keys(model.schema).slice(0, 2).map(k => `${k}: 'new value'`).join(',\n    ')}
  })
})
  .then(res => res.json())
  .then(data => console.log(data));`
    },
    {
      title: 'Delete Record',
      method: 'DELETE',
      url: `${baseUrl}/api/admin/data/${model.name}?id={id}`,
      description: 'Delete a record',
      example: `fetch('${baseUrl}/api/admin/data/${model.name}?id=RECORD_ID', {
  method: 'DELETE'
})
  .then(res => res.json())
  .then(data => console.log(data));`
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-100">API Documentation</h2>
            <p className="text-slate-400 text-sm mt-1">{model.displayName} - CRUD Operations</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Schema Overview */}
          <div className="bg-slate-700/30 rounded-lg p-4">
            <h3 className="font-semibold text-slate-200 mb-3">Model Schema</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(model.schema).map(([fieldName, fieldSchema]) => (
                <div key={fieldName} className="flex items-center space-x-2">
                  <span className="text-slate-300">{fieldName}:</span>
                  <span className="text-emerald-400">{fieldSchema.type}</span>
                  {fieldSchema.required && <span className="text-red-400 text-xs">*required</span>}
                  {fieldSchema.unique && <span className="text-blue-400 text-xs">unique</span>}
                </div>
              ))}
            </div>
          </div>

          {/* API Endpoints */}
          {endpoints.map((endpoint, index) => (
            <div key={index} className="bg-slate-700/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-200">{endpoint.title}</h3>
                <span className={`px-3 py-1 rounded text-xs font-medium ${
                  endpoint.method === 'GET' ? 'bg-green-600' :
                  endpoint.method === 'POST' ? 'bg-blue-600' :
                  endpoint.method === 'PUT' ? 'bg-yellow-600' :
                  'bg-red-600'
                } text-white`}>
                  {endpoint.method}
                </span>
              </div>

              <p className="text-slate-400 text-sm mb-3">{endpoint.description}</p>

              <div className="bg-slate-900 rounded p-3 mb-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">Endpoint</span>
                  <button
                    onClick={() => copyToClipboard(endpoint.url, `url-${index}`)}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    {copied === `url-${index}` ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <code className="text-sm text-emerald-300">{endpoint.url}</code>
              </div>

              <div className="bg-slate-900 rounded p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">Example Code</span>
                  <button
                    onClick={() => copyToClipboard(endpoint.example, `example-${index}`)}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    {copied === `example-${index}` ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="text-xs text-slate-300 overflow-x-auto">
                  {endpoint.example}
                </pre>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Model Modal Component
function EditModelModal({ model, onClose, onSuccess }) {
  const [modelForm, setModelForm] = useState({
    displayName: model.displayName,
    description: model.description,
    icon: model.icon,
    authentication: model.authentication
  });
  const [schema, setSchema] = useState({ ...model.schema });
  const [newField, setNewField] = useState({
    name: '',
    type: 'text',
    required: false,
    unique: false
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'number', label: 'Number' },
    { value: 'email', label: 'Email' },
    { value: 'password', label: 'Password' },
    { value: 'select', label: 'Select (dropdown)' },
    { value: 'boolean', label: 'Yes/No' },
    { value: 'date', label: 'Date' },
    { value: 'datetime', label: 'Date & Time' },
    { value: 'url', label: 'URL' }
  ];

  const iconOptions = ['📄', '👤', '📦', '🏷️', '📊', '💰', '📝', '🎯', '⚙️', '🔔'];

  const addField = () => {
    if (!newField.name) {
      setError('Field name is required');
      return;
    }

    if (!/^[a-z][a-zA-Z0-9]*$/.test(newField.name)) {
      setError('Field name must start with lowercase letter and contain only letters and numbers');
      return;
    }

    if (schema[newField.name]) {
      setError('Field already exists');
      return;
    }

    const fieldConfig = {
      type: newField.type,
      required: newField.required,
      unique: newField.unique
    };

    if (newField.type === 'select' && newField.options) {
      fieldConfig.options = newField.options.split(',').map(o => o.trim()).filter(Boolean);
    }

    setSchema({ ...schema, [newField.name]: fieldConfig });
    setNewField({ name: '', type: 'text', required: false, unique: false });
    setError('');
  };

  const removeField = (fieldName) => {
    const newSchema = { ...schema };
    delete newSchema[fieldName];
    setSchema(newSchema);
  };

  const handleUpdate = async () => {
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/models?name=${model.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...modelForm,
          schema
        })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update model');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-slate-100">Edit Model: {model.displayName}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-600/30 text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={modelForm.displayName}
                  onChange={(e) => setModelForm({ ...modelForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Icon
                </label>
                <div className="flex space-x-2">
                  {iconOptions.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setModelForm({ ...modelForm, icon })}
                      className={`text-2xl p-2 rounded-lg transition-colors ${
                        modelForm.icon === icon
                          ? 'bg-emerald-600'
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={modelForm.description}
                onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={2}
              />
            </div>
          </div>

          {/* Schema Builder */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">Schema Fields</h3>

            {/* Add Field Form */}
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <input
                    type="text"
                    value={newField.name}
                    onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Field name"
                  />
                </div>

                <div className="col-span-3">
                  <select
                    value={newField.type}
                    onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {fieldTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {newField.type === 'select' && (
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={newField.options || ''}
                      onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Options (comma separated)"
                    />
                  </div>
                )}

                <div className={`${newField.type === 'select' ? 'col-span-2' : 'col-span-5'} flex items-center space-x-3`}>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newField.required}
                      onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-300">Required</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newField.unique}
                      onChange={(e) => setNewField({ ...newField, unique: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-300">Unique</span>
                  </label>
                </div>

                <div className="col-span-1">
                  <button
                    onClick={addField}
                    className="w-full h-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Fields List */}
            {Object.keys(schema).length > 0 && (
              <div className="space-y-2">
                {Object.entries(schema).map(([fieldName, fieldConfig]) => (
                  <div
                    key={fieldName}
                    className="bg-slate-700 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="font-medium text-slate-200">{fieldName}</span>
                      <span className="text-sm text-slate-400">{fieldConfig.type}</span>
                      {fieldConfig.required && (
                        <span className="text-xs bg-red-900/30 text-red-300 px-2 py-1 rounded">Required</span>
                      )}
                      {fieldConfig.unique && (
                        <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded">Unique</span>
                      )}
                      {fieldConfig.auto && (
                        <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded">Auto</span>
                      )}
                    </div>
                    {!fieldConfig.auto && (
                      <button
                        onClick={() => removeField(fieldName)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Updating...' : 'Update Model'}
          </button>
        </div>
      </div>
    </div>
  );
}
