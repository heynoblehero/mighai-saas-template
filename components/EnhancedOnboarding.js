import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const EnhancedOnboarding = ({ onComplete, onDismiss }) => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: '',
    goal: '',
    experience: '',
  });

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('enhanced_onboarding_progress');
    if (saved) {
      const data = JSON.parse(saved);
      setCurrentStep(data.currentStep || 0);
      setCompletedSteps(data.completedSteps || []);
      setUserProfile(data.userProfile || {});
    }
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    const data = {
      currentStep,
      completedSteps,
      userProfile,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem('enhanced_onboarding_progress', JSON.stringify(data));
  }, [currentStep, completedSteps, userProfile]);

  const steps = [
    {
      id: 0,
      title: "👋 Welcome to Your SaaS Builder",
      subtitle: "Let's get to know you",
      icon: "🚀",
      estimatedTime: "1 min",
      type: "profile",
    },
    {
      id: 1,
      title: "🎯 Choose Your Path",
      subtitle: "Pick a tutorial or start from scratch",
      icon: "🛤️",
      estimatedTime: "30 sec",
      type: "path_selection",
    },
    {
      id: 2,
      title: "📚 Interactive Tutorial",
      subtitle: "Build a Task Management SaaS (Step-by-step)",
      icon: "📝",
      estimatedTime: "20 mins",
      type: "tutorial",
    },
    {
      id: 3,
      title: "🎨 Design Your Pages",
      subtitle: "Create beautiful landing and customer pages",
      icon: "🖼️",
      estimatedTime: "10 mins",
      type: "pages",
    },
    {
      id: 4,
      title: "⚙️ Configure Backend",
      subtitle: "Set up database, API routes, and logic",
      icon: "🔧",
      estimatedTime: "15 mins",
      type: "backend",
    },
    {
      id: 5,
      title: "💳 Set Up Monetization",
      subtitle: "Create pricing plans and payment integration",
      icon: "💰",
      estimatedTime: "10 mins",
      type: "monetization",
    },
    {
      id: 6,
      title: "🚀 Launch & Grow",
      subtitle: "Deploy, monitor, and scale your SaaS",
      icon: "📈",
      estimatedTime: "5 mins",
      type: "launch",
    },
  ];

  const markStepComplete = (stepId) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const goToNextStep = () => {
    markStepComplete(currentStep);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All steps completed
      setShowCelebration(true);
      setTimeout(() => {
        onComplete && onComplete();
      }, 3000);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipToStep = (stepId) => {
    setCurrentStep(stepId);
  };

  const renderProfileStep = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">👋</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Your SaaS Journey!
        </h2>
        <p className="text-gray-600 text-lg">
          In just 20 minutes, you'll have a fully functional SaaS product
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            What should we call you?
          </label>
          <input
            type="text"
            placeholder="Your name"
            value={userProfile.name}
            onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            What do you want to build?
          </label>
          <select
            value={userProfile.goal}
            onChange={(e) => setUserProfile({ ...userProfile, goal: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
          >
            <option value="">Select your goal...</option>
            <option value="task-manager">Task Management App</option>
            <option value="crm">CRM Platform</option>
            <option value="analytics">Analytics Dashboard</option>
            <option value="ecommerce">E-commerce Platform</option>
            <option value="booking">Booking System</option>
            <option value="social">Social Network</option>
            <option value="custom">Something Custom</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Your experience level?
          </label>
          <div className="grid grid-cols-3 gap-3">
            {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
              <button
                key={level}
                onClick={() => setUserProfile({ ...userProfile, experience: level })}
                className={`py-3 px-4 rounded-lg font-medium transition-all ${
                  userProfile.experience === level
                    ? 'bg-emerald-500 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <div className="flex items-start">
          <div className="text-2xl mr-3">💡</div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Pro Tip</h4>
            <p className="text-blue-800 text-sm">
              We'll customize the tutorial based on your experience level. Don't worry, you can skip steps or dive deeper anytime!
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPathSelection = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🛤️</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Choose Your Learning Path
        </h2>
        <p className="text-gray-600">
          Pick the way you want to learn and build
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Guided Tutorial Path */}
        <div className="border-3 border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105">
          <div className="text-center">
            <div className="text-5xl mb-4">🎓</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Guided Tutorial
            </h3>
            <div className="inline-block bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
              RECOMMENDED
            </div>
            <p className="text-gray-700 mb-4">
              Build a complete Task Management SaaS step-by-step with interactive guidance
            </p>
            <ul className="text-left space-y-2 mb-6">
              {[
                'Step-by-step instructions',
                'Live code examples',
                'Interactive playground',
                'Progress tracking',
                'Achievement badges',
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center text-sm text-gray-700">
                  <svg className="w-5 h-5 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => goToNextStep()}
              className="w-full bg-emerald-500 text-white py-3 rounded-lg font-bold hover:bg-emerald-600 transition-all shadow-lg"
            >
              Start Tutorial (20 mins)
            </button>
          </div>
        </div>

        {/* Quick Start Path */}
        <div className="border-2 border-gray-300 bg-white rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-all transform hover:scale-105">
          <div className="text-center">
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Quick Start
            </h3>
            <div className="inline-block bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
              FOR EXPERIENCED
            </div>
            <p className="text-gray-700 mb-4">
              Jump right in and start building. Perfect if you already know what you're doing
            </p>
            <ul className="text-left space-y-2 mb-6">
              {[
                'Skip the tutorial',
                'Blank slate to build',
                'Access all features',
                'Docs available',
                'Get help anytime',
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center text-sm text-gray-700">
                  <svg className="w-5 h-5 text-gray-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                markStepComplete(currentStep);
                onComplete && onComplete();
              }}
              className="w-full bg-gray-700 text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-all"
            >
              Skip to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="text-center mt-6">
        <p className="text-sm text-gray-600">
          You can always access the tutorial later from the Help menu
        </p>
      </div>
    </div>
  );

  const renderTutorialStep = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              📝 Build a Task Management SaaS
            </h2>
            <p className="text-emerald-100">
              Follow along as we build a complete SaaS product together
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{completedSteps.filter(s => s >= 2).length}/12</div>
            <div className="text-sm text-emerald-100">Steps Complete</div>
          </div>
        </div>
        <div className="mt-4 bg-white/20 rounded-full h-3 overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-500"
            style={{ width: `${(completedSteps.filter(s => s >= 2).length / 12) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { phase: "Planning", steps: ['Define Features', 'Design Database', 'Plan User Flow', 'Create Wireframes'] },
          { phase: "Building", steps: ['Create Pages', 'Build Backend', 'Add Authentication', 'Implement Features'] },
          { phase: "Launching", steps: ['Set Up Payments', 'Add Analytics', 'Test Everything', 'Deploy'] },
        ].map((phase, idx) => (
          <div key={idx} className="bg-white border-2 border-gray-200 rounded-xl p-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center">
              <span className="bg-emerald-100 text-emerald-700 rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">
                {idx + 1}
              </span>
              {phase.phase}
            </h3>
            <ul className="space-y-2">
              {phase.steps.map((step, stepIdx) => (
                <li key={stepIdx} className="flex items-center text-sm">
                  <div className="w-4 h-4 rounded-full border-2 border-emerald-500 mr-2 flex items-center justify-center">
                    {completedSteps.includes(idx * 4 + stepIdx + 2) && (
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <span className="text-gray-700">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
        <div className="flex items-start">
          <div className="text-2xl mr-3">🎯</div>
          <div>
            <h4 className="font-semibold text-yellow-900 mb-1">What You'll Learn</h4>
            <ul className="text-yellow-800 text-sm space-y-1">
              <li>• How to design and build a complete SaaS database</li>
              <li>• Creating beautiful, responsive pages with our visual editor</li>
              <li>• Building custom API endpoints and backend logic</li>
              <li>• Setting up authentication and user management</li>
              <li>• Implementing subscription payments with Lemon Squeezy</li>
              <li>• Deploying and monitoring your live SaaS product</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={() => router.push('/admin/tutorial/task-manager')}
        className="w-full bg-emerald-500 text-white py-4 rounded-lg font-bold text-lg hover:bg-emerald-600 transition-all shadow-lg flex items-center justify-center"
      >
        <span>Start Building Now</span>
        <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
  );

  const renderGenericStep = (step) => (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">{step.icon}</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {step.title}
        </h2>
        <p className="text-gray-600 text-lg">
          {step.subtitle}
        </p>
        <div className="inline-block bg-gray-100 text-gray-700 text-sm px-4 py-1 rounded-full mt-2">
          ⏱️ Estimated time: {step.estimatedTime}
        </div>
      </div>

      {/* Content varies by step type */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <p className="text-gray-600">
          This step will guide you through {step.subtitle.toLowerCase()}.
        </p>
      </div>
    </div>
  );

  const renderCelebration = () => (
    <div className="text-center animate-fadeIn py-12">
      <div className="text-8xl mb-6 animate-bounce">🎉</div>
      <h2 className="text-4xl font-bold text-gray-900 mb-4">
        Congratulations!
      </h2>
      <p className="text-xl text-gray-600 mb-8">
        You've completed the onboarding! Your SaaS journey begins now.
      </p>
      <div className="inline-block bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-2xl">
        🚀 Ready to Build Amazing Things
      </div>
    </div>
  );

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Welcome to Your SaaS Builder</h1>
              <p className="text-emerald-100 text-sm">Let's build something amazing together</p>
            </div>
            <button
              onClick={onDismiss}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-sm font-medium text-emerald-100">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="bg-white/20 rounded-full h-2 overflow-hidden">
              <div
                className="bg-white h-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {showCelebration ? (
            renderCelebration()
          ) : currentStepData.type === 'profile' ? (
            renderProfileStep()
          ) : currentStepData.type === 'path_selection' ? (
            renderPathSelection()
          ) : currentStepData.type === 'tutorial' ? (
            renderTutorialStep()
          ) : (
            renderGenericStep(currentStepData)
          )}
        </div>

        {/* Footer */}
        {!showCelebration && (
          <div className="border-t border-gray-200 px-8 py-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={goToPreviousStep}
                disabled={currentStep === 0}
                className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                ← Previous
              </button>

              <div className="flex gap-2">
                {steps.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => skipToStep(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentStep
                        ? 'bg-emerald-500 w-8'
                        : completedSteps.includes(idx)
                        ? 'bg-emerald-300'
                        : 'bg-gray-300'
                    }`}
                    title={step.title}
                  />
                ))}
              </div>

              <button
                onClick={goToNextStep}
                disabled={
                  (currentStepData.type === 'profile' && !userProfile.name) ||
                  (currentStepData.type === 'path_selection' && false)
                }
                className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {currentStep === steps.length - 1 ? 'Finish' : 'Next →'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EnhancedOnboarding;
