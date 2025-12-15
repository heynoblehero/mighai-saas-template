import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function OnboardingOverlay({ onComplete, onDismiss }) {
  const [completedSteps, setCompletedSteps] = useState([]);
  const [expandedStep, setExpandedStep] = useState(1);
  const [isVisible, setIsVisible] = useState(true);
  const router = useRouter();

  const steps = [
    {
      id: 1,
      title: "Configure Backend Design",
      shortDesc: "Set up your backend API endpoint",
      details: [
        "Connect your API endpoint URL",
        "Configure request headers and authentication",
        "Set up dynamic request templates",
        "Test API connectivity and responses"
      ],
      action: "Configure API",
      link: "/admin/backend-design",
      icon: "⚙️",
      estimatedTime: "5-10 minutes"
    },
    {
      id: 2,
      title: "Create Subscription Plans",
      shortDesc: "Define your pricing and billing structure",
      details: [
        "Create free and paid tier plans",
        "Set API call limits and features",
        "Configure pricing and billing cycles",
        "Enable subscription management"
      ],
      action: "Create Plans",
      link: "/admin/plans",
      icon: "💳",
      estimatedTime: "10-15 minutes"
    },
    {
      id: 3,
      title: "Build Landing Pages",
      shortDesc: "Create pages to attract and convert customers",
      details: [
        "Design compelling homepage layout",
        "Add product features and benefits",
        "Create pricing page with plan comparison",
        "Set up contact and about pages"
      ],
      action: "Build Pages",
      link: "/admin/pages",
      icon: "📄",
      estimatedTime: "15-20 minutes"
    },
    {
      id: 4,
      title: "Launch & Monitor",
      shortDesc: "Deploy and track your SaaS performance",
      details: [
        "Review all configurations and settings",
        "Test the complete user journey",
        "Set up analytics and monitoring",
        "Launch your SaaS to the public"
      ],
      action: "Launch SaaS",
      link: "/admin/analytics",
      icon: "🚀",
      estimatedTime: "5-10 minutes"
    }
  ];

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = () => {
    const saved = localStorage.getItem('onboarding_progress');
    if (saved) {
      const progress = JSON.parse(saved);
      setCompletedSteps(progress.completedSteps || []);
    }
  };

  const markStepComplete = (stepId) => {
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes(stepId)) {
      newCompleted.push(stepId);
      setCompletedSteps(newCompleted);
      
      const progress = {
        currentStep: stepId + 1,
        completedSteps: newCompleted
      };
      localStorage.setItem('onboarding_progress', JSON.stringify(progress));

      // Auto-expand next step
      if (stepId < 4 && !newCompleted.includes(stepId + 1)) {
        setExpandedStep(stepId + 1);
      }
    }
  };

  const handleStepAction = (step) => {
    router.push(step.link);
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_dismissed', 'true');
    setIsVisible(false);
    onComplete && onComplete();
  };

  const handleDismiss = () => {
    localStorage.setItem('onboarding_dismissed', 'true');
    setIsVisible(false);
    onDismiss && onDismiss();
  };

  const allStepsCompleted = completedSteps.length >= 4;
  const progressPercentage = (completedSteps.length / 4) * 100;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">🚀 Complete Your SaaS Setup</h1>
              <p className="text-emerald-100">
                {allStepsCompleted 
                  ? "🎉 Great work! All steps completed. Ready to launch!" 
                  : `Complete these ${4 - completedSteps.length} essential steps to launch your SaaS`
                }
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Skip for now"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-emerald-100">Progress: {completedSteps.length}/4 steps</span>
              <span className="text-sm text-emerald-100">{Math.round(progressPercentage)}% complete</span>
            </div>
            <div className="w-full bg-emerald-800/30 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Steps Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isExpanded = expandedStep === step.id;
              const canExpand = step.id === 1 || completedSteps.includes(step.id - 1);

              return (
                <div
                  key={step.id}
                  className={`border rounded-xl transition-all duration-300 ${
                    isCompleted 
                      ? 'border-emerald-500/30 bg-emerald-900/20' 
                      : canExpand 
                        ? 'border-slate-600 bg-slate-700/50' 
                        : 'border-slate-700/50 bg-slate-800/50 opacity-60'
                  }`}
                >
                  {/* Step Header - Always Visible */}
                  <button
                    onClick={() => canExpand && setExpandedStep(isExpanded ? null : step.id)}
                    disabled={!canExpand}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors rounded-t-xl"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold transition-all duration-300
                        ${isCompleted 
                          ? 'bg-emerald-500 text-white' 
                          : canExpand 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-slate-600 text-slate-400'
                        }
                      `}>
                        {isCompleted ? '✓' : step.icon}
                      </div>

                      <div className="text-left">
                        <h3 className={`
                          text-lg font-semibold flex items-center space-x-2
                          ${isCompleted 
                            ? 'text-emerald-300 line-through decoration-2' 
                            : canExpand 
                              ? 'text-slate-100' 
                              : 'text-slate-400'
                          }
                        `}>
                          <span>Step {step.id}: {step.title}</span>
                          {isCompleted && (
                            <span className="text-sm bg-emerald-500 text-white px-2 py-1 rounded-full">
                              Completed
                            </span>
                          )}
                        </h3>
                        <p className={`
                          text-sm
                          ${isCompleted 
                            ? 'text-emerald-400/80' 
                            : canExpand 
                              ? 'text-slate-300' 
                              : 'text-slate-500'
                          }
                        `}>
                          {step.shortDesc} • {step.estimatedTime}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!canExpand && (
                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V7a2 2 0 00-2-2H8a2 2 0 00-2 2v6c0 1.1.9 2 2 2h4a2 2 0 002-2z" />
                        </svg>
                      )}
                      {canExpand && (
                        <svg 
                          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Step Details - Expandable */}
                  {isExpanded && canExpand && (
                    <div className="px-4 pb-4 border-t border-slate-600/50">
                      <div className="pt-4 space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300 mb-3">What you'll do:</h4>
                          <ul className="space-y-2">
                            {step.details.map((detail, idx) => (
                              <li key={idx} className="flex items-start space-x-3 text-sm text-slate-400">
                                <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className="text-xs text-slate-500">
                            💡 Estimated time: {step.estimatedTime}
                          </div>
                          
                          <div className="flex space-x-3">
                            {process.env.NODE_ENV === 'development' && !isCompleted && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markStepComplete(step.id);
                                }}
                                className="px-3 py-1 text-xs bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 rounded border border-yellow-600/30 transition-colors"
                              >
                                Mark Complete (Dev)
                              </button>
                            )}
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStepAction(step);
                              }}
                              className={`
                                px-6 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2
                                ${isCompleted
                                  ? 'bg-slate-600/50 hover:bg-slate-600 text-slate-300'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25'
                                }
                              `}
                            >
                              <span>{isCompleted ? 'Manage' : step.action}</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-6 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              {allStepsCompleted 
                ? "🎉 All steps completed! Your SaaS is ready to launch."
                : `${4 - completedSteps.length} step${4 - completedSteps.length !== 1 ? 's' : ''} remaining to complete setup`
              }
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors"
              >
                Skip for now
              </button>
              
              {allStepsCompleted && (
                <button
                  onClick={handleComplete}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  🚀 Access Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}