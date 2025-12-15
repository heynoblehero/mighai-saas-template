import { useState, useEffect } from 'react';

export default function OnboardingProgress({ currentStep = 0, totalSteps = 6, completedSteps = [] }) {
  const [animatedStep, setAnimatedStep] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedStep(currentStep), 100);
    return () => clearTimeout(timer);
  }, [currentStep]);

  const steps = [
    { id: 0, title: 'Features', icon: '🚀', description: 'Overview' },
    { id: 1, title: 'Payments', icon: '💳', description: 'Subscriptions' },
    { id: 2, title: 'Content', icon: '📄', description: 'Pages & Blog' },
    { id: 3, title: 'Analytics', icon: '📊', description: 'Tracking' },
    { id: 4, title: 'Support', icon: '💬', description: 'Help desk' },
    { id: 5, title: 'More', icon: '⚙️', description: 'Advanced' }
  ];

  const progressPercentage = ((animatedStep / (totalSteps - 1)) * 100);

  return (
    <div
      className="rounded-2xl shadow-xl p-5 backdrop-blur-sm border"
      style={{
        background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-subdued) 100%)',
        borderColor: 'var(--color-border)'
      }}
    >
      <div className="mb-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <span className="text-xl">🎯</span>
            Platform Intro
          </h3>
          <div
            className="px-3 py-1 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #00d084, #059669)',
              boxShadow: '0 0 20px rgba(0, 208, 132, 0.3)'
            }}
          >
            <span className="text-sm font-bold text-white">{Math.round(progressPercentage)}%</span>
          </div>
        </div>
        <div
          className="w-full rounded-full h-2 shadow-inner"
          style={{ background: 'var(--color-surface-subdued)' }}
        >
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${progressPercentage}%`,
              background: 'linear-gradient(90deg, #00d084, #10b981, #059669)',
              boxShadow: '0 0 15px rgba(0, 208, 132, 0.5)'
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isPending = step.id > currentStep && !isCompleted;

          return (
            <div
              key={step.id}
              className={`flex items-center p-3 rounded-xl transition-all duration-300 border ${
                isCurrent
                  ? 'shadow-md'
                  : ''
              }`}
              style={{
                background: isCurrent
                  ? 'linear-gradient(90deg, rgba(0, 208, 132, 0.15), rgba(5, 150, 105, 0.15))'
                  : isCompleted
                  ? 'var(--color-surface-hovered)'
                  : 'var(--color-surface-subdued)',
                borderColor: isCurrent
                  ? 'rgba(0, 208, 132, 0.3)'
                  : isCompleted
                  ? 'var(--color-border)'
                  : 'var(--color-border-subdued)'
              }}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  isCurrent ? 'animate-pulse' : ''
                }`}
                style={{
                  background: isCompleted
                    ? 'linear-gradient(135deg, #00d084, #059669)'
                    : isCurrent
                    ? 'linear-gradient(135deg, #00d084, #10b981)'
                    : 'var(--color-surface-disabled)',
                  color: isCompleted || isCurrent ? '#fff' : 'var(--color-text-subdued)',
                  boxShadow: isCompleted || isCurrent ? '0 0 15px rgba(0, 208, 132, 0.4)' : 'none',
                  border: !isCompleted && !isCurrent ? `1px solid var(--color-border-subdued)` : 'none'
                }}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.icon
                )}
              </div>
              <div className="ml-3 flex-1">
                <div
                  className="text-sm font-semibold transition-colors"
                  style={{
                    color: isCurrent || isCompleted ? 'var(--color-text)' : 'var(--color-text-subdued)'
                  }}
                >
                  {step.title}
                </div>
                {isCurrent && (
                  <div className="text-xs text-emerald-400 mt-0.5 font-medium">{step.description}</div>
                )}
              </div>
              {isCurrent && (
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{
                    background: '#00d084',
                    boxShadow: '0 0 10px rgba(0, 208, 132, 0.8)'
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
