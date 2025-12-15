import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function OnboardingModal({ isOpen, onClose, currentStep = 0, onStepComplete }) {
  const [activeStep, setActiveStep] = useState(currentStep);
  const [isAnimating, setIsAnimating] = useState(false);
  const router = useRouter();

  const steps = [
    {
      id: 0,
      title: "Platform Features",
      description: "Available tools and sections",
      icon: "🚀",
      content: (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 p-4 rounded-xl text-center border border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all cursor-pointer group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">💳</div>
            <div className="font-semibold text-sm text-emerald-100">Payments</div>
          </div>
          <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 p-4 rounded-xl text-center border border-green-500/20 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/10 transition-all cursor-pointer group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📄</div>
            <div className="font-semibold text-sm text-green-100">Pages</div>
          </div>
          <div className="bg-gradient-to-br from-teal-900/40 to-cyan-900/40 p-4 rounded-xl text-center border border-teal-500/20 hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/10 transition-all cursor-pointer group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</div>
            <div className="font-semibold text-sm text-teal-100">Analytics</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 p-4 rounded-xl text-center border border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all cursor-pointer group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🧪</div>
            <div className="font-semibold text-sm text-emerald-100">A/B Tests</div>
          </div>
          <div className="bg-gradient-to-br from-green-900/40 to-teal-900/40 p-4 rounded-xl text-center border border-green-500/20 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/10 transition-all cursor-pointer group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🔥</div>
            <div className="font-semibold text-sm text-green-100">Heatmaps</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-900/40 to-teal-900/40 p-4 rounded-xl text-center border border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10 transition-all cursor-pointer group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">💬</div>
            <div className="font-semibold text-sm text-cyan-100">Support</div>
          </div>
        </div>
      ),
      actionText: "Next",
      skipEnabled: false
    },
    {
      id: 1,
      title: "💳 Payments",
      description: "Manage subscriptions",
      icon: "💰",
      content: (
        <div className="space-y-4">
          <div className="text-base" style={{ color: 'var(--color-text-secondary)' }}>Create and manage subscription plans with ease.</div>
          <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 p-4 rounded-xl">
            <div className="text-xs font-semibold text-emerald-400 mb-2">Quick Access</div>
            <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Admin → Plans</div>
          </div>
        </div>
      ),
      actionText: "Next",
      skipEnabled: true
    },
    {
      id: 2,
      title: "📄 Pages & Blog",
      description: "Create content",
      icon: "🎨",
      content: (
        <div className="space-y-4">
          <div className="text-base" style={{ color: 'var(--color-text-secondary)' }}>Build beautiful pages and publish engaging blog posts.</div>
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 p-4 rounded-xl">
            <div className="text-xs font-semibold text-green-400 mb-2">Quick Access</div>
            <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Admin → Pages, Blog</div>
          </div>
        </div>
      ),
      actionText: "Next",
      skipEnabled: true
    },
    {
      id: 3,
      title: "📊 Analytics",
      description: "Track metrics",
      icon: "📈",
      content: (
        <div className="space-y-4">
          <div className="text-base" style={{ color: 'var(--color-text-secondary)' }}>Track performance with analytics, heatmaps, and A/B tests.</div>
          <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 border border-teal-500/30 p-4 rounded-xl">
            <div className="text-xs font-semibold text-teal-400 mb-2">Quick Access</div>
            <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Admin → Analytics, Heatmaps, A/B Tests</div>
          </div>
        </div>
      ),
      actionText: "Next",
      skipEnabled: true
    },
    {
      id: 4,
      title: "💬 Support",
      description: "Customer support",
      icon: "📧",
      content: (
        <div className="space-y-4">
          <div className="text-base" style={{ color: 'var(--color-text-secondary)' }}>Manage support tickets and send emails to customers.</div>
          <div className="bg-gradient-to-r from-cyan-900/30 to-teal-900/30 border border-cyan-500/30 p-4 rounded-xl">
            <div className="text-xs font-semibold text-cyan-400 mb-2">Quick Access</div>
            <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Admin → Support, Email</div>
          </div>
        </div>
      ),
      actionText: "Next",
      skipEnabled: true
    },
    {
      id: 5,
      title: "⚙️ More",
      description: "Additional features",
      icon: "🔧",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-600/30 p-3 rounded-xl text-center hover:border-slate-500/50 hover:shadow-md transition-all">
              <div className="text-2xl mb-1">⚙️</div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Backend</div>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-600/30 p-3 rounded-xl text-center hover:border-slate-500/50 hover:shadow-md transition-all">
              <div className="text-2xl mb-1">👥</div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Users</div>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-600/30 p-3 rounded-xl text-center hover:border-slate-500/50 hover:shadow-md transition-all">
              <div className="text-2xl mb-1">🔐</div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Auth</div>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-600/30 p-3 rounded-xl text-center hover:border-slate-500/50 hover:shadow-md transition-all">
              <div className="text-2xl mb-1">🔄</div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Updates</div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-[#00d084]/40 p-5 rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10"></div>
            <div className="relative">
              <div className="text-center text-lg font-bold text-[#00d084] flex items-center justify-center gap-2">
                <span>You're all set!</span>
                <span className="text-2xl">🚀</span>
              </div>
              <div className="text-center text-sm text-emerald-300 mt-1">Ready to explore the platform</div>
            </div>
          </div>
        </div>
      ),
      actionText: "Done",
      actionLink: "/admin",
      skipEnabled: false
    }
  ];

  const currentStepData = steps[activeStep];

  const handleNext = async () => {
    setIsAnimating(true);
    if (onStepComplete) await onStepComplete(activeStep);
    if (currentStepData.actionLink) {
      router.push(currentStepData.actionLink);
      onClose();
      return;
    }
    setTimeout(() => {
      if (activeStep < steps.length - 1) {
        setActiveStep(activeStep + 1);
      } else {
        onClose();
      }
      setIsAnimating(false);
    }, 200);
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all" style={{ background: 'var(--color-surface)' }}>
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 px-6 py-5 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl shadow-lg border border-white/20">
                  {currentStepData.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">{currentStepData.title}</h3>
                  <p className="text-sm text-emerald-100 mt-0.5">{currentStepData.description}</p>
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

            {/* Progress bar */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    i <= activeStep ? 'bg-[#00d084] shadow-lg shadow-[#00d084]/30' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`p-6 min-h-[200px] transition-all duration-300 ${
          isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`} style={{ background: 'var(--color-surface-neutral)' }}>
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-between items-center border-t" style={{
          background: 'var(--color-surface-subdued)',
          borderColor: 'var(--color-border)'
        }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{activeStep + 1}</span>
            <span className="text-sm" style={{ color: 'var(--color-text-subdued)' }}>/</span>
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{steps.length}</span>
          </div>
          <div className="flex gap-3">
            {currentStepData.skipEnabled && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm hover:bg-white/5 rounded-lg transition-all font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Skip all
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 text-white text-sm rounded-lg shadow-md hover:shadow-lg transition-all font-semibold"
              style={{
                background: 'linear-gradient(135deg, #00d084, #059669)',
                boxShadow: '0 0 20px rgba(0, 208, 132, 0.3)'
              }}
            >
              {currentStepData.actionText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
