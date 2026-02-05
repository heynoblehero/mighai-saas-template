import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';

const API_SECTIONS = [
  {
    title: 'Authentication',
    description: 'Session-based authentication using HTTP-only cookies.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/auth/session',
        description: 'Check if user is authenticated and get user data',
        auth: false,
        response: `{
  "authenticated": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "role": "subscriber",
    "plan": {
      "id": 1,
      "name": "free",
      "apiLimit": 100,
      "pageViewLimit": 1000
    },
    "subscriptionStatus": "active"
  }
}`,
      },
      {
        method: 'POST',
        path: '/api/subscribe/login',
        description: 'Login with email and password',
        auth: false,
        body: `{
  "email": "user@example.com",
  "password": "your_password"
}`,
        response: `{
  "success": true,
  "user": { "id": 1, "email": "user@example.com", ... }
}`,
      },
      {
        method: 'POST',
        path: '/api/subscribe/send-signup-otp',
        description: 'Start signup - sends OTP to email',
        auth: false,
        body: `{
  "email": "newuser@example.com",
  "password": "secure_password"
}`,
        response: `{
  "success": true,
  "message": "OTP sent to email"
}`,
      },
      {
        method: 'POST',
        path: '/api/subscribe/verify-signup-otp',
        description: 'Complete signup by verifying OTP',
        auth: false,
        body: `{
  "email": "newuser@example.com",
  "otp": "123456"
}`,
        response: `{
  "success": true,
  "user": { "id": 2, "email": "newuser@example.com", ... }
}`,
      },
      {
        method: 'POST',
        path: '/api/auth/logout',
        description: 'Logout and clear session',
        auth: true,
        response: `{
  "success": true,
  "message": "Logged out"
}`,
      },
    ],
  },
  {
    title: 'Profile',
    description: 'Manage user profile information.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/subscriber/profile',
        description: 'Get full user profile',
        auth: true,
        response: `{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "role": "subscriber",
  "createdAt": "2024-01-15T10:30:00Z",
  "plan": {
    "id": 2,
    "name": "pro",
    "apiLimit": 1000,
    "pageViewLimit": 10000,
    "price": 9.99
  },
  "subscription": {
    "status": "active",
    "periodStart": "2024-01-15",
    "periodEnd": "2024-02-15"
  },
  "usage": {
    "apiCalls": 150,
    "apiLimit": 1000,
    "pageViews": 2500,
    "pageViewLimit": 10000
  }
}`,
      },
      {
        method: 'PUT',
        path: '/api/subscriber/profile',
        description: 'Update profile (username, email)',
        auth: true,
        body: `{
  "username": "new_username",
  "email": "newemail@example.com"
}`,
        response: `{
  "success": true,
  "message": "Profile updated"
}`,
      },
    ],
  },
  {
    title: 'Subscription',
    description: 'Manage subscriptions and payments via Lemon Squeezy.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/subscriber/subscription',
        description: 'Get current subscription and available plans',
        auth: true,
        response: `{
  "currentPlan": {
    "id": 1,
    "name": "free",
    "apiLimit": 100,
    "pageViewLimit": 1000,
    "price": 0
  },
  "subscription": {
    "status": "active",
    "periodStart": "2024-01-15",
    "periodEnd": "2024-02-15"
  },
  "availablePlans": [
    { "id": 1, "name": "free", "price": 0, "isCurrent": true },
    { "id": 2, "name": "pro", "price": 9.99, "isCurrent": false },
    { "id": 3, "name": "enterprise", "price": 29.99, "isCurrent": false }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/api/subscriber/subscription/checkout',
        description: 'Create checkout session for a plan',
        auth: true,
        body: `{
  "planId": 2
}`,
        response: `{
  "checkoutUrl": "https://checkout.lemonsqueezy.com/..."
}`,
      },
      {
        method: 'POST',
        path: '/api/subscriber/subscription/portal',
        description: 'Get billing portal URL',
        auth: true,
        response: `{
  "portalUrl": "https://app.lemonsqueezy.com/my-orders"
}`,
      },
    ],
  },
  {
    title: 'Usage',
    description: 'Track API and page view usage.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/subscriber/usage',
        description: 'Get current usage statistics',
        auth: true,
        response: `{
  "plan": "pro",
  "period": {
    "start": "2024-01-15",
    "end": "2024-02-15"
  },
  "apiCalls": {
    "used": 150,
    "limit": 1000,
    "remaining": 850,
    "percentage": 15
  },
  "pageViews": {
    "used": 2500,
    "limit": 10000,
    "remaining": 7500,
    "percentage": 25
  }
}`,
      },
    ],
  },
  {
    title: 'Plans',
    description: 'Get available subscription plans.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/plans',
        description: 'List all available plans',
        auth: false,
        response: `[
  {
    "id": 1,
    "name": "free",
    "api_limit": 100,
    "page_view_limit": 1000,
    "price": 0
  },
  {
    "id": 2,
    "name": "pro",
    "api_limit": 1000,
    "page_view_limit": 10000,
    "price": 9.99
  }
]`,
      },
    ],
  },
  {
    title: 'Support',
    description: 'In-app support messaging.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/support/messages',
        description: 'Get support conversation history',
        auth: true,
        response: `{
  "messages": [
    {
      "id": 1,
      "content": "How do I upgrade?",
      "sender": "user",
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "content": "Go to Settings > Billing",
      "sender": "admin",
      "created_at": "2024-01-15T10:35:00Z"
    }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/api/support/messages',
        description: 'Send a support message',
        auth: true,
        body: `{
  "content": "I need help with..."
}`,
        response: `{
  "success": true,
  "message": { "id": 3, "content": "...", "sender": "user", ... }
}`,
      },
    ],
  },
  {
    title: 'API Keys',
    description: 'Manage API keys for programmatic access.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/subscribe/api-keys',
        description: 'List all API keys',
        auth: true,
        response: `{
  "keys": [
    {
      "id": 1,
      "name": "Production Key",
      "key_preview": "sk_sub_...abc",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/api/subscribe/api-keys',
        description: 'Create a new API key',
        auth: true,
        body: `{
  "name": "My API Key"
}`,
        response: `{
  "success": true,
  "key": "sk_sub_...",
  "message": "Save this key - it won't be shown again"
}`,
      },
      {
        method: 'DELETE',
        path: '/api/subscribe/api-keys/:id',
        description: 'Delete an API key',
        auth: true,
        response: `{
  "success": true
}`,
      },
    ],
  },
];

function CodeBlock({ code, language = 'json' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-sm">
        <code className="text-slate-300">{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

function EndpointCard({ endpoint }) {
  const [expanded, setExpanded] = useState(false);

  const methodColors = {
    GET: 'bg-emerald-500/20 text-emerald-400',
    POST: 'bg-blue-500/20 text-blue-400',
    PUT: 'bg-yellow-500/20 text-yellow-400',
    DELETE: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-slate-800/50 transition-colors text-left"
      >
        <span
          className={`px-2 py-1 rounded text-xs font-mono font-medium ${
            methodColors[endpoint.method] || 'bg-slate-700 text-slate-300'
          }`}
        >
          {endpoint.method}
        </span>
        <span className="font-mono text-sm text-slate-300 flex-1">
          {endpoint.path}
        </span>
        {endpoint.auth && (
          <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">
            Auth Required
          </span>
        )}
        <svg
          className={`w-5 h-5 text-slate-500 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && (
        <div className="p-4 border-t border-slate-700 bg-slate-800/30 space-y-4">
          <p className="text-slate-400 text-sm">{endpoint.description}</p>

          {endpoint.body && (
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">
                Request Body
              </h4>
              <CodeBlock code={endpoint.body} />
            </div>
          )}

          {endpoint.response && (
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">
                Response
              </h4>
              <CodeBlock code={endpoint.response} />
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">
              Example (JavaScript)
            </h4>
            <CodeBlock
              code={`const response = await fetch('${endpoint.path}'${
                endpoint.method !== 'GET'
                  ? `, {
  method: '${endpoint.method}',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include'${endpoint.body ? `,
  body: JSON.stringify(${endpoint.body.trim()})` : ''}
}`
                  : ', { credentials: \'include\' }'
              });
const data = await response.json();`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiDocs() {
  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">API Documentation</h1>
          <p className="text-slate-400">
            Public APIs for custom frontend integration. All authenticated
            endpoints use session cookies that are automatically handled by the
            browser.
          </p>
        </div>

        {/* Authentication Info */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Authentication
          </h2>
          <div className="space-y-4 text-sm text-slate-400">
            <p>
              <strong className="text-slate-300">Session Cookies:</strong> After
              login, the browser automatically sends the auth cookie with every
              request. Use{' '}
              <code className="text-emerald-400 bg-slate-700 px-1 rounded">
                credentials: &apos;include&apos;
              </code>{' '}
              with fetch.
            </p>
            <p>
              <strong className="text-slate-300">API Keys:</strong> For
              server-to-server requests, use the{' '}
              <code className="text-emerald-400 bg-slate-700 px-1 rounded">
                X-API-Key
              </code>{' '}
              header with a subscriber API key.
            </p>
            <CodeBlock
              code={`// Browser (cookies)
fetch('/api/subscriber/profile', {
  credentials: 'include'
});

// Server (API key)
fetch('/api/subscriber/profile', {
  headers: {
    'X-API-Key': 'sk_sub_your_api_key'
  }
});`}
            />
          </div>
        </div>

        {/* API Sections */}
        {API_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="bg-slate-800 rounded-lg border border-slate-700 p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-2">
              {section.title}
            </h2>
            <p className="text-slate-400 text-sm mb-4">{section.description}</p>
            <div className="space-y-3">
              {section.endpoints.map((endpoint, i) => (
                <EndpointCard key={i} endpoint={endpoint} />
              ))}
            </div>
          </div>
        ))}

        {/* CORS Note */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <h3 className="text-yellow-400 font-medium mb-2">Same-Origin Policy</h3>
          <p className="text-yellow-200/70 text-sm">
            Since your custom frontend is served from the same domain, there are
            no CORS issues. Session cookies work automatically.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
