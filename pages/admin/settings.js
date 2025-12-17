import { useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/AdminLayout';

export default function AdminSettings() {
  const router = useRouter();

  const settingsCategories = [
    {
      id: 'email',
      name: 'Email Configuration',
      description: 'Manage email settings, templates, and campaigns',
      icon: '📧',
      items: [
        {
          title: 'Email Settings',
          description: 'Configure SMTP, API keys, and sender information',
          href: '/admin/email-settings',
          action: 'Configure'
        },
        {
          title: 'Email Templates',
          description: 'Create and manage email templates for campaigns',
          href: '/admin/email-templates',
          action: 'Manage Templates'
        },
        {
          title: 'Email Campaigns',
          description: 'Create and manage email marketing campaigns',
          href: '/admin/campaigns',
          action: 'View Campaigns'
        }
      ]
    },
    {
      id: 'ai',
      name: 'AI & Code Generation',
      description: 'Configure AI-powered page building and code generation',
      icon: '🤖',
      items: [
        {
          title: 'Claude API Configuration',
          description: 'Set up Claude API for AI-powered page generation',
          href: '/admin/ai-settings',
          action: 'Configure API'
        },
        {
          title: 'Page Builder Templates',
          description: 'Manage AI page generation templates and examples',
          href: '/admin/page-templates',
          action: 'Manage Templates'
        },
        {
          title: 'AI Usage Analytics',
          description: 'Monitor API usage, costs, and generation statistics',
          href: '/admin/ai-analytics',
          action: 'View Analytics'
        }
      ]
    },
    {
      id: 'security',
      name: 'Security & Authentication',
      description: 'Two-factor authentication and admin security settings',
      icon: '🔐',
      items: [
        {
          title: 'Two-Factor Authentication',
          description: 'Configure Telegram 2FA for enhanced admin security',
          href: '/admin/security-settings',
          action: 'Configure 2FA'
        }
      ]
    },
    {
      id: 'system',
      name: 'System Settings',
      description: 'Core system configuration and monitoring',
      icon: '⚙️',
      items: [
        {
          title: 'Error Monitoring',
          description: 'View system errors and troubleshooting information',
          href: '/admin/error-monitoring',
          action: 'View Errors'
        },
        {
          title: 'Support Messages',
          description: 'Manage customer support conversations',
          href: '/admin/support-messages',
          action: 'View Messages'
        }
      ]
    },
    {
      id: 'reserved-pages',
      name: 'Reserved Pages',
      description: 'Customize customer-facing pages with AI-powered theming',
      icon: '🎨',
      items: [
        {
          title: 'Customer Login Page',
          description: 'Customize the login page theme and styling',
          href: '/admin/reserved-pages/login',
          action: 'Customize'
        },
        {
          title: 'Customer Signup Page', 
          description: 'Customize the registration page theme and styling',
          href: '/admin/reserved-pages/signup',
          action: 'Customize'
        },
        {
          title: 'Customer Dashboard',
          description: 'Customize the customer dashboard layout and theme',
          href: '/admin/reserved-pages/dashboard',
          action: 'Customize'
        },
        {
          title: 'Customer Profile Page',
          description: 'Customize the profile management page',
          href: '/admin/reserved-pages/profile',
          action: 'Customize'
        },
        {
          title: 'Billing & Upgrade Page',
          description: 'Customize the subscription upgrade page',
          href: '/admin/reserved-pages/billing',
          action: 'Customize'
        },
        {
          title: 'Password Reset Page',
          description: 'Customize the password reset page',
          href: '/admin/reserved-pages/password-reset',
          action: 'Customize'
        }
      ]
    },
    {
      id: 'content',
      name: 'Content Management',
      description: 'Manage your site content and pages',
      icon: '📄',
      items: [
        {
          title: 'Pages',
          description: 'Create and manage website pages',
          href: '/admin/pages',
          action: 'Manage Pages'
        },
        {
          title: 'Blog Posts',
          description: 'Write and manage blog content',
          href: '/admin/blog',
          action: 'Manage Blog'
        }
      ]
    },
    {
      id: 'business',
      name: 'Business Settings',
      description: 'Manage subscribers, plans, and billing',
      icon: '💼',
      items: [
        {
          title: 'Subscription Plans',
          description: 'Manage pricing tiers and subscriber limits',
          href: '/admin/plans',
          action: 'Manage Plans'
        },
        {
          title: 'Subscribers',
          description: 'View and manage platform subscribers',
          href: '/admin/subscribers',
          action: 'View Subscribers'
        }
      ]
    }
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your platform configuration and preferences</p>
        </div>

        {/* Settings Categories */}
        <div className="space-y-8">
          {settingsCategories.map((category) => (
            <div key={category.id} className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
              {/* Category Header */}
              <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{category.icon}</div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-200">{category.name}</h2>
                    <p className="text-slate-400 text-sm">{category.description}</p>
                  </div>
                </div>
              </div>

              {/* Category Items */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.items.map((item, index) => (
                    <div 
                      key={index}
                      className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:bg-slate-700 transition-colors group cursor-pointer"
                      onClick={() => router.push(item.href)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-200 group-hover:text-white transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-slate-400 text-sm mt-1 group-hover:text-slate-300 transition-colors">
                            {item.description}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <button className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-md font-medium transition-colors">
                            {item.action}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* System Info Card */}
        <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-emerald-300 mb-2">
                Platform Settings
              </h3>
              <div className="text-emerald-200/80 space-y-2">
                <p>• Configure all aspects of your platform from this central settings hub</p>
                <p>• Email integration with Resend API for automated notifications and campaigns</p>
                <p>• Monitor system health and manage customer support efficiently</p>
                <p>• All settings are automatically saved and synchronized across your platform</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}