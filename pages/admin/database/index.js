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

    const commonClasses = "w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all";

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
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => setRecordForm({ ...recordForm, [fieldName]: e.target.checked })}
              className="w-5 h-5 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 cursor-pointer"
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
          return <div className="text-slate-500 text-sm py-3">Auto-generated</div>;
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
      return <span className="text-slate-600">-</span>;
    }

    switch (fieldSchema.type) {
      case 'boolean':
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            value ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600/50 text-slate-400'
          }`}>
            {value ? 'Yes' : 'No'}
          </span>
        );
      case 'date':
      case 'datetime':
        return new Date(value).toLocaleString();
      case 'password':
        return <span className="text-slate-500">********</span>;
      default:
        return String(value).substring(0, 100);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Database Management">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Database Management">
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar - Models List */}
        <div className="w-72 bg-slate-800 border-r border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <button
              onClick={() => setShowNewModelModal(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Model
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {models.map((model) => (
              <button
                key={model.name}
                onClick={() => setSelectedModel(model)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                  selectedModel?.name === model.name
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'bg-slate-700/50 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <span className="text-2xl">{model.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{model.displayName}</div>
                  {model.isSystem && (
                    <div className="text-xs opacity-70">System Model</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side - Data Table */}
        <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
          {selectedModel ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-slate-700 bg-slate-800/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                      <span className="text-3xl">{selectedModel.icon}</span>
                      <span>{selectedModel.displayName}</span>
                      {selectedModel.isSystem && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          System
                        </span>
                      )}
                    </h1>
                    {selectedModel.description && (
                      <p className="text-slate-400 mt-1 ml-12">{selectedModel.description}</p>
                    )}
                    <div className="text-sm text-slate-500 mt-2 ml-12">
                      {records.length} {records.length === 1 ? 'record' : 'records'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowApiDetails(true)}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      API
                    </button>
                    {!selectedModel.isSystem && (
                      <>
                        <button
                          onClick={() => setShowEditModelModal(true)}
                          className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setShowDeleteModelConfirm(true)}
                          className="px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg font-medium transition-colors border border-red-500/30"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleCreateRecord}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Record
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-auto p-6">
                {error && (
                  <div className="bg-red-900/20 border border-red-600/30 text-red-300 px-4 py-3 rounded-xl mb-4 flex items-center gap-3">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                )}

                {records.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center">
                        <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-slate-200 mb-2">No records yet</h3>
                      <p className="text-slate-400 mb-6 max-w-sm">Create your first record to get started with this model</p>
                      <button
                        onClick={handleCreateRecord}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors inline-flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add First Record
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-900/50">
                          <tr>
                            {Object.keys(selectedModel.schema).map((fieldName) => (
                              <th
                                key={fieldName}
                                className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                              >
                                {fieldName}
                                {selectedModel.schema[fieldName].required && (
                                  <span className="text-red-400 ml-1">*</span>
                                )}
                              </th>
                            ))}
                            <th className="px-5 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {records.map((record) => (
                            <tr key={record.id} className="hover:bg-slate-700/30 transition-colors">
                              {Object.keys(selectedModel.schema).map((fieldName) => (
                                <td key={fieldName} className="px-5 py-4 text-sm text-slate-300">
                                  {renderFieldValue(record[fieldName], selectedModel.schema[fieldName])}
                                </td>
                              ))}
                              <td className="px-5 py-4 text-right">
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => handleEditRecord(record)}
                                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(record)}
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
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-200 mb-2">Select a model</h3>
                <p className="text-slate-400 max-w-sm">Choose a model from the sidebar to view and manage its data</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit/Create Record Modal */}
      {showEditRecordModal && selectedModel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(0, 0, 0, 0.85)' }}
          onClick={() => setShowEditRecordModal(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 px-6 py-5 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl shadow-lg border border-white/20">
                    {selectedModel.icon}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg tracking-tight">
                      {editingRecord ? 'Edit Record' : 'Create New Record'}
                    </h2>
                    <p className="text-sm text-emerald-100 mt-0.5">{selectedModel.displayName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditRecordModal(false)}
                  className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-6 space-y-5 bg-slate-900/50">
              {Object.entries(selectedModel.schema).map(([fieldName, fieldSchema]) => {
                if (fieldSchema.auto) return null;

                return (
                  <div key={fieldName}>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      {fieldName}
                      {fieldSchema.required && <span className="text-red-400 ml-1">*</span>}
                      {fieldSchema.unique && <span className="text-blue-400 ml-1 text-xs">(unique)</span>}
                    </label>
                    {renderFieldInput(fieldName, fieldSchema)}
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 flex justify-end gap-3 border-t border-slate-700 bg-slate-800">
              <button
                onClick={() => {
                  setShowEditRecordModal(false);
                  setRecordForm({});
                  setError('');
                }}
                className="px-5 py-2.5 text-sm rounded-lg transition-all font-medium text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRecord}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors font-semibold"
              >
                {editingRecord ? 'Update Record' : 'Create Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.85)' }}
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-red-600 via-red-700 to-rose-700 px-6 py-5 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
              <div className="relative z-10 flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/20">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-lg tracking-tight">Delete Record</h2>
                  <p className="text-sm text-red-100 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-900/50">
              <p className="text-slate-300">
                Are you sure you want to delete this record? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3 border-t border-slate-700 bg-slate-800">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-5 py-2.5 text-sm rounded-lg transition-all font-medium text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRecord(showDeleteConfirm.id)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors font-semibold"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Model Modal */}
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.85)' }}
          onClick={() => setShowDeleteModelConfirm(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-red-600 via-red-700 to-rose-700 px-6 py-5 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
              <div className="relative z-10 flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl shadow-lg border border-white/20">
                  {selectedModel.icon}
                </div>
                <div>
                  <h2 className="font-bold text-lg tracking-tight">Delete Model</h2>
                  <p className="text-sm text-red-100 mt-0.5">{selectedModel.displayName}</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-900/50">
              <p className="text-slate-300 mb-4">
                Are you sure you want to delete this model?
              </p>
              <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-red-300 font-medium">Warning</p>
                    <p className="text-red-300/80 text-sm mt-1">
                      This will permanently delete all <strong>{records.length}</strong> records in this model. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3 border-t border-slate-700 bg-slate-800">
              <button
                onClick={() => setShowDeleteModelConfirm(false)}
                className="px-5 py-2.5 text-sm rounded-lg transition-all font-medium text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteModel}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors font-semibold"
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

  const iconOptions = ['📄', '👤', '📦', '🏷️', '📊', '💰', '📝', '🎯', '⚙️', '🔔', '📁', '🗂️', '📋', '🎨'];

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0, 0, 0, 0.85)' }}
      onClick={onClose}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-lg tracking-tight">Create New Model</h2>
                <p className="text-sm text-emerald-100 mt-0.5">Define the structure for your new data model</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6 bg-slate-900/50">
          {error && (
            <div className="bg-red-900/20 border border-red-600/30 text-red-300 px-4 py-3 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Basic Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Model Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={modelForm.name}
                  onChange={(e) => setModelForm({ ...modelForm, name: e.target.value.toLowerCase() })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="e.g., products, orders, posts"
                />
                <p className="text-xs text-slate-500 mt-1.5">Lowercase, no spaces (used in API)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={modelForm.displayName}
                  onChange={(e) => setModelForm({ ...modelForm, displayName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="e.g., Products, Orders"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Description
              </label>
              <textarea
                value={modelForm.description}
                onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                rows={2}
                placeholder="What is this model for?"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {iconOptions.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setModelForm({ ...modelForm, icon })}
                    className={`text-2xl p-2.5 rounded-xl transition-all ${
                      modelForm.icon === icon
                        ? 'bg-emerald-600 shadow-lg shadow-emerald-600/20'
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
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Schema Fields
            </h3>

            {/* Add Field Form */}
            <div className="bg-slate-700/50 rounded-xl p-4 space-y-3 border border-slate-600/50">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <input
                    type="text"
                    value={newField.name}
                    onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    placeholder="Field name"
                  />
                </div>

                <div className="col-span-3">
                  <select
                    value={newField.type}
                    onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
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
                      className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      placeholder="Options (comma separated)"
                    />
                  </div>
                )}

                <div className={`${newField.type === 'select' ? 'col-span-2' : 'col-span-5'} flex items-center gap-4`}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newField.required}
                      onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-sm text-slate-300">Required</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newField.unique}
                      onChange={(e) => setNewField({ ...newField, unique: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-sm text-slate-300">Unique</span>
                  </label>
                </div>

                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={addField}
                    className="w-full h-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
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
                    className="bg-slate-700/50 rounded-xl p-4 flex items-center justify-between border border-slate-600/50"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-slate-200">{fieldName}</span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-600 text-slate-300">
                        {fieldConfig.type}
                      </span>
                      {fieldConfig.required && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                          Required
                        </span>
                      )}
                      {fieldConfig.unique && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Unique
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeField(fieldName)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {Object.keys(schema).length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>Add fields to define your model's schema</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 flex justify-end gap-3 border-t border-slate-700 bg-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm rounded-lg transition-all font-medium text-slate-300 hover:bg-slate-700"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors font-semibold disabled:opacity-50"
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
      color: 'blue',
      url: `/api/admin/data/${model.name}`,
      description: 'Retrieve all records from the model'
    },
    {
      title: 'Get Single Record',
      method: 'GET',
      color: 'blue',
      url: `/api/admin/data/${model.name}?id={id}`,
      description: 'Retrieve a specific record by ID'
    },
    {
      title: 'Create Record',
      method: 'POST',
      color: 'green',
      url: `/api/admin/data/${model.name}`,
      description: 'Create a new record'
    },
    {
      title: 'Update Record',
      method: 'PUT',
      color: 'yellow',
      url: `/api/admin/data/${model.name}?id={id}`,
      description: 'Update an existing record'
    },
    {
      title: 'Delete Record',
      method: 'DELETE',
      color: 'red',
      url: `/api/admin/data/${model.name}?id={id}`,
      description: 'Delete a record'
    }
  ];

  const methodColors = {
    GET: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    POST: 'bg-green-500/20 text-green-400 border-green-500/30',
    PUT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    DELETE: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0, 0, 0, 0.85)' }}
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 px-6 py-5 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-lg tracking-tight">API Documentation</h2>
                <p className="text-sm text-blue-100 mt-0.5">{model.displayName} - CRUD Operations</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6 bg-slate-900/50">
          {/* Schema Overview */}
          <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
            <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Model Schema
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(model.schema).map(([fieldName, fieldSchema]) => (
                <div key={fieldName} className="flex items-center gap-2 text-sm">
                  <span className="text-slate-300 font-medium">{fieldName}:</span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400">
                    {fieldSchema.type}
                  </span>
                  {fieldSchema.required && (
                    <span className="text-red-400 text-xs">required</span>
                  )}
                  {fieldSchema.unique && (
                    <span className="text-blue-400 text-xs">unique</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* API Endpoints */}
          <div className="space-y-4">
            {endpoints.map((endpoint, index) => (
              <div key={index} className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-200">{endpoint.title}</h3>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${methodColors[endpoint.method]}`}>
                    {endpoint.method}
                  </span>
                </div>

                <p className="text-slate-400 text-sm mb-3">{endpoint.description}</p>

                <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                  <div className="flex justify-between items-center">
                    <code className="text-sm text-emerald-400 font-mono">{baseUrl}{endpoint.url}</code>
                    <button
                      onClick={() => copyToClipboard(baseUrl + endpoint.url, `url-${index}`)}
                      className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
                    >
                      {copied === `url-${index}` ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 flex justify-end border-t border-slate-700 bg-slate-800">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors font-semibold"
          >
            Got it!
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

  const iconOptions = ['📄', '👤', '📦', '🏷️', '📊', '💰', '📝', '🎯', '⚙️', '🔔', '📁', '🗂️', '📋', '🎨'];

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0, 0, 0, 0.85)' }}
      onClick={onClose}
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
                {model.icon}
              </div>
              <div>
                <h2 className="font-bold text-lg tracking-tight">Edit Model</h2>
                <p className="text-sm text-emerald-100 mt-0.5">{model.displayName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6 bg-slate-900/50">
          {error && (
            <div className="bg-red-900/20 border border-red-600/30 text-red-300 px-4 py-3 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Basic Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={modelForm.displayName}
                  onChange={(e) => setModelForm({ ...modelForm, displayName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setModelForm({ ...modelForm, icon })}
                      className={`text-2xl p-2.5 rounded-xl transition-all ${
                        modelForm.icon === icon
                          ? 'bg-emerald-600 shadow-lg shadow-emerald-600/20'
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
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Description
              </label>
              <textarea
                value={modelForm.description}
                onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                rows={2}
              />
            </div>
          </div>

          {/* Schema Builder */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Schema Fields
            </h3>

            {/* Add Field Form */}
            <div className="bg-slate-700/50 rounded-xl p-4 space-y-3 border border-slate-600/50">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <input
                    type="text"
                    value={newField.name}
                    onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    placeholder="Field name"
                  />
                </div>

                <div className="col-span-3">
                  <select
                    value={newField.type}
                    onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
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
                      className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      placeholder="Options (comma separated)"
                    />
                  </div>
                )}

                <div className={`${newField.type === 'select' ? 'col-span-2' : 'col-span-5'} flex items-center gap-4`}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newField.required}
                      onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-sm text-slate-300">Required</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newField.unique}
                      onChange={(e) => setNewField({ ...newField, unique: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-sm text-slate-300">Unique</span>
                  </label>
                </div>

                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={addField}
                    className="w-full h-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
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
                    className="bg-slate-700/50 rounded-xl p-4 flex items-center justify-between border border-slate-600/50"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-slate-200">{fieldName}</span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-600 text-slate-300">
                        {fieldConfig.type}
                      </span>
                      {fieldConfig.required && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                          Required
                        </span>
                      )}
                      {fieldConfig.unique && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Unique
                        </span>
                      )}
                      {fieldConfig.auto && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          Auto
                        </span>
                      )}
                    </div>
                    {!fieldConfig.auto && (
                      <button
                        type="button"
                        onClick={() => removeField(fieldName)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 flex justify-end gap-3 border-t border-slate-700 bg-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm rounded-lg transition-all font-medium text-slate-300 hover:bg-slate-700"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors font-semibold disabled:opacity-50"
          >
            {saving ? 'Updating...' : 'Update Model'}
          </button>
        </div>
      </div>
    </div>
  );
}
