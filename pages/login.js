
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { injectPageFunctionality } from '../utils/reserved-page-injector';

export async function getServerSideProps() {
  // Check if there's a customized version of the login page
  try {
    const reservedPagePath = path.join(process.cwd(), 'data', 'reserved-pages', 'customer-login.json');
    
    if (fs.existsSync(reservedPagePath)) {
      const data = fs.readFileSync(reservedPagePath, 'utf8');
      const reservedPage = JSON.parse(data);
      
      if (reservedPage.html_code) {
        // Apply JavaScript injection for functionality
        const enhancedHtml = injectPageFunctionality(reservedPage.html_code, 'customer-login');
        
        // Serve the customized HTML with injected functionality
        return {
          props: {
            useCustomPage: true,
            customHtml: enhancedHtml
          }
        };
      }
    }
  } catch (error) {
    console.error('Error checking for customized login page:', error);
  }
  
  // Use default React component
  return {
    props: {
      useCustomPage: false
    }
  };
}

export default function SubscriberLogin({ useCustomPage, customHtml }) {
  // If we have a custom HTML version, render it directly
  if (useCustomPage && customHtml) {
    return (
      <div dangerouslySetInnerHTML={{ __html: customHtml }} />
    );
  }
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (router.query.message) {
      setMessage(router.query.message);
    }
  }, [router.query]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/subscribe/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        // Login successful, redirect based on user role
        const redirectUrl = router.query.redirect;
        if (redirectUrl) {
          router.push(redirectUrl);
        } else {
          // Default redirect to subscriber dashboard
          router.push('/dashboard');
        }
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Subscriber Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access your subscriber content
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {message}
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          <div className="text-center space-y-2">
            <Link href="/subscribe/signup" className="text-indigo-600 hover:text-indigo-500 block">
              Don't have an account? Sign up
            </Link>
            <Link href="/" className="text-gray-600 hover:text-gray-500 block">
              Back to Home
            </Link>
            <Link href="/admin/login" className="text-gray-600 hover:text-gray-500 block text-xs">
              Admin Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
