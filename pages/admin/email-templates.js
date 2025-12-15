import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Sample templates data - in production this would come from your API
  const sampleTemplates = [
    {
      id: 1,
      name: 'Admin Login OTP',
      subject: 'Mighai Admin Login Verification',
      template_type: 'otp',
      created_at: '2024-01-15T10:30:00Z',
      is_active: true,
      usage_count: 45
    },
    {
      id: 2,
      name: 'Customer Signup OTP',
      subject: 'Welcome to Mighai - Verify Your Email',
      template_type: 'otp',
      created_at: '2024-01-15T10:30:00Z',
      is_active: true,
      usage_count: 128
    },
    {
      id: 3,
      name: 'New Subscriber Notification',
      subject: 'New Subscriber Alert - Mighai',
      template_type: 'transactional',
      created_at: '2024-01-15T10:30:00Z',
      is_active: true,
      usage_count: 67
    },
    {
      id: 4,
      name: 'Welcome Email Sequence - Day 1',
      subject: "Welcome to Mighai - Let's get you started! 🚀",
      template_type: 'campaign',
      created_at: '2024-01-15T10:30:00Z',
      is_active: true,
      usage_count: 89
    },
    {
      id: 5,
      name: 'Error Notification',
      subject: 'System Error Alert - Mighai',
      template_type: 'transactional',
      created_at: '2024-01-15T10:30:00Z',
      is_active: true,
      usage_count: 12
    },
    {
      id: 6,
      name: 'Support Query Notification',
      subject: 'New Support Request - Mighai',
      template_type: 'transactional',
      created_at: '2024-01-15T10:30:00Z',
      is_active: true,
      usage_count: 34
    }
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setTemplates(sampleTemplates);
      setLoading(false);
    }, 1000);
  }, []);

  const getTypeColor = (type) => {
    const colors = {
      'otp': 'bg-blue-900/30 text-blue-300 border border-blue-600/30',
      'transactional': 'bg-emerald-900/30 text-emerald-300 border border-emerald-600/30',
      'campaign': 'bg-purple-900/30 text-purple-300 border border-purple-600/30'
    };
    return colors[type] || 'bg-slate-700 text-slate-300 border border-slate-600';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <div className="text-lg text-slate-300">Loading email templates...</div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Email Templates</h1>
            <p className="text-slate-400 mt-1">Manage your email templates for campaigns and notifications</p>
          </div>
          <button className="mt-4 sm:mt-0 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Create Template</span>
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-400">Total Templates</h3>
                <p className="text-2xl font-bold text-slate-200">{templates.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-400">Active Templates</h3>
                <p className="text-2xl font-bold text-slate-200">{templates.filter(t => t.is_active).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-400">Total Emails Sent</h3>
                <p className="text-2xl font-bold text-slate-200">{templates.reduce((sum, t) => sum + t.usage_count, 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Templates Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200">Email Templates</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {templates.map((template, index) => (
                  <tr 
                    key={template.id} 
                    className="hover:bg-slate-700/50 transition-colors"
                    style={{ 
                      animationDelay: `${index * 100}ms`,
                      animation: 'fadeInUp 0.5s ease-out forwards'
                    }}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-lg font-semibold text-slate-200">
                          {template.name}
                        </div>
                        <div className="text-sm text-slate-400 mt-1">
                          {template.subject}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs font-medium rounded-full ${getTypeColor(template.template_type)}`}>
                        {template.template_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-slate-300 font-medium">
                        {template.usage_count} emails sent
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-sm font-medium rounded-full ${
                        template.is_active 
                          ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-600/30' 
                          : 'bg-red-900/30 text-red-300 border border-red-600/30'
                      }`}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-slate-300">
                        {formatDate(template.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setSelectedTemplate(template)}
                          className="text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          Preview
                        </button>
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
        </div>

        {/* Info Card */}
        <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-emerald-300 mb-2">
                Email Template System
              </h3>
              <div className="text-emerald-200/80 space-y-2">
                <p>• Use variables like {{USER_EMAIL}}, {{OTP_CODE}}, {{USER_NAME}} in your templates</p>
                <p>• OTP templates are used for authentication and verification emails</p>
                <p>• Transactional templates are for system notifications and alerts</p>
                <p>• Campaign templates are used for marketing and promotional emails</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </AdminLayout>
  );
}