import { useState } from 'react';
import { useSetupWizard } from '../SetupWizardContext';

export default function ReviewCompleteStep() {
  const { wizardState, completeWizard, dismissWizard } = useSetupWizard();
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    setIsCompleting(true);

    try {
      // Sync branding colors to support chat widget theme
      await fetch('/api/admin/setup-wizard/sync-chat-theme', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to sync chat theme:', error);
      // Continue anyway - chat theme sync is not critical
    }

    await completeWizard();
    // Redirect to admin dashboard
    window.location.href = '/admin';
  };

  const sections = [
    {
      title: 'Site Identity',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      completed: !!(wizardState?.site_name && wizardState?.site_tagline),
      details: wizardState?.site_name || 'Not configured'
    },
    {
      title: 'Branding',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      completed: !!(wizardState?.logo_url || wizardState?.primary_color),
      details: wizardState?.logo_url ? 'Logo uploaded' : 'Custom colors set',
      colors: [wizardState?.primary_color, wizardState?.secondary_color, wizardState?.accent_color].filter(Boolean)
    },
    {
      title: 'AI Provider',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      completed: wizardState?.ai_api_key_configured,
      details: wizardState?.ai_provider ? `${wizardState.ai_provider} configured` : 'Not configured'
    },
    {
      title: 'Email',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      completed: wizardState?.email_api_key_configured,
      details: wizardState?.email_api_key_configured ? 'Resend configured' : 'Not configured'
    },
    {
      title: 'Payments',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      completed: wizardState?.payment_api_key_configured,
      details: wizardState?.payment_api_key_configured ? 'Lemon Squeezy configured' : 'Not configured'
    },
    {
      title: 'Plans',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      completed: wizardState?.plans_configured,
      details: wizardState?.plans_data?.length > 0 ? `${wizardState.plans_data.length} plans created` : 'Not configured'
    },
    {
      title: 'Pages',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      completed: wizardState?.pages_generated,
      details: wizardState?.generated_pages ? `${Object.keys(wizardState.generated_pages).length} pages generated` : 'Not generated'
    },
    {
      title: 'Backend',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      completed: true,
      details: 'Shell access available'
    },
    {
      title: 'Custom Frontend',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      completed: true,
      details: 'Ready to deploy'
    }
  ];

  const completedCount = sections.filter(s => s.completed).length;
  const quickLinks = [
    { name: 'Edit Landing Page', href: '/admin/reserved-pages', icon: '📄' },
    { name: 'Manage Subscribers', href: '/admin/subscribers', icon: '👥' },
    { name: 'View Analytics', href: '/admin/analytics', icon: '📊' },
    { name: 'Shell Access', href: '/admin/backend/app', icon: '💻' },
    { name: 'Upload Frontend', href: '/admin/frontend', icon: '📦' },
    { name: 'API Documentation', href: '/admin/api-docs', icon: '📘' }
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Celebration header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <span className="text-4xl">🎉</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">You're All Set!</h2>
        <p className="text-slate-400">Your SaaS is ready. Here's a summary of what's configured.</p>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {sections.map((section, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl border ${
              section.completed
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-slate-800/50 border-slate-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                section.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
              }`}>
                {section.completed ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  section.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white text-sm">{section.title}</h3>
                <p className="text-xs text-slate-500 truncate">{section.details}</p>
                {section.colors && section.colors.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {section.colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress indicator */}
      <div className="mb-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Setup Progress</span>
          <span className="text-sm font-medium text-white">{completedCount}/{sections.length}</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all"
            style={{ width: `${(completedCount / sections.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Quick links */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Quick Links</h3>
        <div className="grid grid-cols-3 gap-2">
          {quickLinks.map((link, index) => (
            <a
              key={index}
              href={link.href}
              className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition-colors"
            >
              <span className="text-lg">{link.icon}</span>
              <span className="text-sm text-slate-300">{link.name}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleComplete}
          disabled={isCompleting}
          className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCompleting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Completing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Complete Setup
            </>
          )}
        </button>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Preview Site
        </a>
      </div>

      {/* Help text */}
      <p className="text-center text-sm text-slate-500 mt-6">
        You can always access and modify these settings from the Admin panel.
      </p>
    </div>
  );
}
