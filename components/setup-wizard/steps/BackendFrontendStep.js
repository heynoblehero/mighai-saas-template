import { useSetupWizard } from '../SetupWizardContext';

export default function BackendFrontendStep() {
  const { dismissWizard } = useSetupWizard();

  const backendFeatures = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Shell Terminal',
      description: 'Full persistent shell access. Install packages, run scripts, manage files — just like a real Linux server.'
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      title: 'Gateway Routing',
      description: 'Expose any port running on your server to the web. Configure a public path and choose public or subscribers-only access.'
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      title: 'Internal APIs',
      description: 'Access user data, plan info, and analytics from your backend app using auto-injected API tokens.'
    },
  ];

  const frontendFeatures = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      title: 'Upload Your Build',
      description: 'Upload a ZIP of your React, Vue, or any static frontend build. Drag and drop in the admin panel.'
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: 'Same-Domain Auth',
      description: 'Your frontend runs on the same domain, so session cookies work automatically. No CORS issues.'
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      title: 'Full API Suite',
      description: 'Auth, payments, profile, subscriptions, usage tracking — all accessible via REST APIs with full documentation.'
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Backend & Custom Frontend</h2>
        <p className="text-slate-400">
          Beyond the built-in pages, you have full control over your server and can deploy your own custom frontend.
        </p>
      </div>

      {/* Backend Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">Backend / Shell Access</h3>
        </div>

        <div className="space-y-3 mb-4">
          {backendFeatures.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
            >
              <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                {feature.icon}
              </div>
              <div>
                <h4 className="text-sm font-medium text-white">{feature.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <a
          href="/admin/backend/app"
          onClick={(e) => { e.preventDefault(); dismissWizard(); window.location.href = '/admin/backend/app'; }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-sm font-medium transition-colors border border-emerald-500/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Open Backend
        </a>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-700 my-6" />

      {/* Custom Frontend Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">Custom Frontend</h3>
        </div>

        <div className="space-y-3 mb-4">
          {frontendFeatures.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
            >
              <div className="w-9 h-9 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
                {feature.icon}
              </div>
              <div>
                <h4 className="text-sm font-medium text-white">{feature.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <a
            href="/admin/frontend"
            onClick={(e) => { e.preventDefault(); dismissWizard(); window.location.href = '/admin/frontend'; }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 rounded-lg text-sm font-medium transition-colors border border-cyan-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Frontend
          </a>
          <a
            href="/admin/api-docs"
            onClick={(e) => { e.preventDefault(); dismissWizard(); window.location.href = '/admin/api-docs'; }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            API Docs
          </a>
        </div>
      </div>

      {/* Tip */}
      <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <p className="text-sm text-slate-400">
          <strong className="text-slate-300">Tip:</strong> You can use the built-in AI-generated pages, or replace them entirely with your own custom frontend.
          Both approaches use the same auth, payments, and user management system.
        </p>
      </div>
    </div>
  );
}
