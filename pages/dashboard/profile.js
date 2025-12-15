import { useState, useEffect } from 'react';
import CustomerLayout from '../../components/CustomerLayout';
import fs from 'fs';
import path from 'path';

export async function getServerSideProps() {
  // Check if there's a customized version of the profile page CONTENT ONLY
  try {
    const reservedPagePath = path.join(process.cwd(), 'data', 'reserved-pages', 'customer-profile.json');
    
    if (fs.existsSync(reservedPagePath)) {
      const data = fs.readFileSync(reservedPagePath, 'utf8');
      const reservedPage = JSON.parse(data);
      
      if (reservedPage.html_code) {
        // Return customized content to be rendered INSIDE CustomerLayout
        return {
          props: {
            useCustomContent: true,
            customContentHtml: reservedPage.html_code
          }
        };
      }
    }
  } catch (error) {
    console.error('Error checking for customized profile page:', error);
  }
  
  // Use default React component content
  return {
    props: {
      useCustomContent: false
    }
  };
}

export default function SubscriberProfile({ useCustomContent, customContentHtml }) {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/subscribe/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setFormData({
          username: data.user.username,
          email: data.user.email
        });
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // For now, just show a message since we haven't implemented profile update API
    setMessage('Profile update functionality will be implemented soon.');
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <CustomerLayout title="My Profile">
      {useCustomContent && customContentHtml ? (
        <div dangerouslySetInnerHTML={{ __html: customContentHtml }} />
      ) : (
        <div className="max-w-2xl">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Profile Information
          </h3>

          {message && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Account Type
              </label>
              <div className="mt-1">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                  {user?.role}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Your account type determines what content you can access.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <a
                href="/dashboard"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </a>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
        </div>
      )}
    </CustomerLayout>
  );
}