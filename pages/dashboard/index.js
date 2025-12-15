import { useState, useEffect } from 'react';
import CustomerLayout from '../../components/CustomerLayout';
import fs from 'fs';
import path from 'path';
import { injectPageFunctionality } from '../../utils/reserved-page-injector';

export async function getServerSideProps() {
  // Check if there's a customized version of the dashboard CONTENT ONLY
  try {
    const reservedPagePath = path.join(process.cwd(), 'data', 'reserved-pages', 'customer-dashboard.json');
    
    if (fs.existsSync(reservedPagePath)) {
      const data = fs.readFileSync(reservedPagePath, 'utf8');
      const reservedPage = JSON.parse(data);
      
      if (reservedPage.html_code) {
        // Apply JavaScript injection for functionality
        const enhancedHtml = injectPageFunctionality(reservedPage.html_code, 'customer-dashboard');
        
        // Return customized content to be rendered INSIDE CustomerLayout
        return {
          props: {
            useCustomContent: true,
            customContentHtml: enhancedHtml
          }
        };
      }
    }
  } catch (error) {
    console.error('Error checking for customized dashboard page:', error);
  }
  
  // Use default React component content
  return {
    props: {
      useCustomContent: false
    }
  };
}

export default function SubscriberDashboard({ useCustomContent, customContentHtml }) {
  const [user, setUser] = useState(null);
  const [serviceConfig, setServiceConfig] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskFormData, setTaskFormData] = useState({});
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskMessage, setTaskMessage] = useState('');
  const [taskError, setTaskError] = useState('');

  useEffect(() => {
    fetchUserInfo();
    fetchServiceConfig();
    fetchTasks();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/subscribe/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

  const fetchServiceConfig = async () => {
    try {
      const response = await fetch('/api/api-worker-config/public');
      if (response.ok) {
        const data = await response.json();
        setServiceConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch service config:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks?limit=10');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const openTaskModal = () => {
    setTaskFormData({});
    setTaskMessage('');
    setTaskError('');
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setTaskFormData({});
  };

  const handleInputChange = (fieldName, value, fieldType) => {
    if (fieldType === 'file') {
      // Handle file input
      setTaskFormData({ ...taskFormData, [fieldName]: value });
    } else {
      setTaskFormData({ ...taskFormData, [fieldName]: value });
    }
  };

  const executeTask = async () => {
    setTaskLoading(true);
    setTaskMessage('');
    setTaskError('');

    try {
      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_data: taskFormData })
      });

      const data = await response.json();

      if (response.ok) {
        setTaskMessage(`Success! Task ${data.task_id} completed. API calls remaining: ${data.usage.calls_remaining}`);
        fetchUserInfo(); // Refresh usage
        fetchTasks(); // Refresh tasks
        
        setTimeout(() => {
          closeTaskModal();
        }, 2000);
      } else {
        setTaskError(data.error || 'Task execution failed');
      }
    } catch (error) {
      setTaskError('Network error occurred');
    } finally {
      setTaskLoading(false);
    }
  };

  const viewTaskResult = (taskId) => {
    window.open(`/api/tasks/${taskId}/result`, '_blank');
  };

  const renderInputField = (field) => {
    const value = taskFormData[field.name] || '';

    switch (field.type) {
      case 'file':
        return (
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  handleInputChange(field.name, {
                    name: file.name,
                    type: file.type,
                    data: e.target.result
                  }, 'file');
                };
                reader.readAsDataURL(file);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required={field.required}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows="4"
            required={field.required}
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required={field.required}
          >
            <option value="">Select an option</option>
            {(field.options || []).map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'checkbox':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => handleInputChange(field.name, e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>{field.label}</span>
          </label>
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required={field.required}
          />
        );
      
      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required={field.required}
          />
        );
      
      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required={field.required}
          />
        );
    }
  };

  return (
    <CustomerLayout title="Dashboard">
      {useCustomContent && customContentHtml ? (
        <div dangerouslySetInnerHTML={{ __html: customContentHtml }} />
      ) : (
        <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
          <h3 className="text-2xl font-bold mb-2">
            Welcome back, {user?.username}!
          </h3>
          <p className="text-indigo-100">
            You have access to exclusive subscriber content across the site.
          </p>
        </div>

        {/* Plan & Usage Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Current Plan
            </h4>
            <div className="space-y-3">
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 capitalize">
                  {user?.plan_name || 'Free'} Plan
                </span>
              </div>
              {user?.price > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Price:</span>
                  <p className="text-gray-900">${user.price}/month</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              API Usage
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Used:</span>
                <span className="font-medium">{user?.api_calls_used || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Limit:</span>
                <span className="font-medium">{user?.api_limit || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full" 
                  style={{
                    width: `${Math.min(((user?.api_calls_used || 0) / (user?.api_limit || 1)) * 100, 100)}%`
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                {(user?.api_limit || 0) - (user?.api_calls_used || 0)} calls remaining
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Page Views
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Used:</span>
                <span className="font-medium">{user?.page_views_used || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Limit:</span>
                <span className="font-medium">{user?.page_view_limit || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{
                    width: `${Math.min(((user?.page_views_used || 0) / (user?.page_view_limit || 1)) * 100, 100)}%`
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                {(user?.page_view_limit || 0) - (user?.page_views_used || 0)} views remaining
              </div>
            </div>
          </div>
        </div>

        {/* Service Section */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Available Service</h4>
            {serviceConfig?.available && (
              <button
                onClick={openTaskModal}
                disabled={user?.api_calls_used >= user?.api_limit}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {user?.api_calls_used >= user?.api_limit ? 'Limit Reached' : 'New Task'}
              </button>
            )}
          </div>
          
          {!serviceConfig?.available ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No services are currently available.</p>
              <p className="text-sm text-gray-400 mt-1">Check back later for new services.</p>
            </div>
          ) : (
            <div className="border rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 mb-2">Service Available</h5>
              <p className="text-sm text-gray-600 mb-3">Create a new task to process your request through our backend service.</p>
              
              <div className="mb-3">
                <span className="text-xs text-gray-500">Required inputs:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(serviceConfig.input_fields || []).map((field, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {field.name} ({field.type})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Recent Tasks</h4>
            {tasks.length > 0 && (
              <p className="text-sm text-gray-600">{tasks.length} recent task{tasks.length !== 1 ? 's' : ''}</p>
            )}
          </div>
          
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No tasks executed yet.</p>
              <p className="text-sm text-gray-400 mt-1">Create your first task using the service above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Task ID</th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td className="py-3">
                        <div className="text-sm font-medium text-gray-900">#{task.task_id.slice(-8)}</div>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-500">
                        {new Date(task.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        {task.status === 'completed' && (
                          <button
                            onClick={() => viewTaskResult(task.task_id)}
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            View Result
                          </button>
                        )}
                        {task.status === 'failed' && (
                          <span className="text-red-600 text-sm">Error: {task.error_message}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Task Creation Modal */}
        {showTaskModal && serviceConfig?.available && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Create New Task</h3>
                <button
                  onClick={closeTaskModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">Fill out the form below to create a new task.</p>

              {taskMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                  {taskMessage}
                </div>
              )}
              
              {taskError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {taskError}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); executeTask(); }} className="space-y-4">
                {(serviceConfig.input_fields || []).map((field, index) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500"> *</span>}
                    </label>
                    {renderInputField(field)}
                  </div>
                ))}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={taskLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {taskLoading ? 'Creating...' : 'Create Task'}
                  </button>
                  <button
                    type="button"
                    onClick={closeTaskModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Account Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Account Information
            </h4>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Username:</span>
                <p className="text-gray-900">{user?.username}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Email:</span>
                <p className="text-gray-900">{user?.email}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Account Type:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h4>
            <div className="space-y-3">
              <a
                href="/dashboard/profile"
                className="block w-full px-4 py-2 bg-indigo-600 text-white text-center rounded-md hover:bg-indigo-700 transition-colors"
              >
                Edit Profile
              </a>
              <a
                href="/"
                className="block w-full px-4 py-2 bg-gray-100 text-gray-700 text-center rounded-md hover:bg-gray-200 transition-colors"
              >
                Browse Site Content
              </a>
            </div>
          </div>
        </div>

        {/* Subscriber Benefits */}
        <div className="bg-white border rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Your Subscriber Benefits
          </h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">Access to exclusive subscriber-only content</span>
            </div>
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">Personal subscriber dashboard</span>
            </div>
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">Profile management</span>
            </div>
          </div>
        </div>
        </div>
      )}
    </CustomerLayout>
  );
}