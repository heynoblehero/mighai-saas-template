import { useState, useEffect } from 'react';
import EnhancedOnboarding from './EnhancedOnboarding';
import OnboardingOverlay from './OnboardingOverlay';

const OnboardingSelector = ({ onComplete, onDismiss }) => {
  const [selectedOnboarding, setSelectedOnboarding] = useState(null);
  const [showSelector, setShowSelector] = useState(false);

  // Check if user has already selected an onboarding type or completed onboarding
  useEffect(() => {
    const hasSelectedOnboarding = localStorage.getItem('onboarding_type_selected');
    const onboardingCompleted = localStorage.getItem('onboarding_completed');
    
    if (!hasSelectedOnboarding && !onboardingCompleted) {
      setShowSelector(true);
    }
  }, []);

  const handleSelectEnhanced = () => {
    localStorage.setItem('onboarding_type_selected', 'enhanced');
    setSelectedOnboarding('enhanced');
    setShowSelector(false);
  };

  const handleSelectOverlay = () => {
    localStorage.setItem('onboarding_type_selected', 'overlay');
    setSelectedOnboarding('overlay');
    setShowSelector(false);
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete && onComplete();
  };

  const handleDismiss = () => {
    onDismiss && onDismiss();
  };

  // If a specific onboarding has been selected, show that component
  if (selectedOnboarding === 'enhanced') {
    return <EnhancedOnboarding onComplete={handleComplete} onDismiss={handleDismiss} />;
  }

  if (selectedOnboarding === 'overlay') {
    return <OnboardingOverlay onComplete={handleComplete} onDismiss={handleDismiss} />;
  }

  // If no onboarding has been selected yet, show the selector
  if (showSelector) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-6">
            <h1 className="text-2xl font-bold">Choose Your Onboarding Experience</h1>
            <p className="text-emerald-100 mt-2">
              Select the onboarding style that works best for you
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Enhanced Onboarding Option */}
              <div 
                className="border-2 border-emerald-200 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all hover:border-emerald-400 hover:bg-emerald-50"
                onClick={handleSelectEnhanced}
              >
                <div className="text-center">
                  <div className="text-5xl mb-4 text-emerald-500">🎓</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Guided Onboarding
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Comprehensive step-by-step tutorial with interactive guidance
                  </p>
                  <ul className="text-left space-y-2 mb-4 text-sm text-gray-700">
                    <li className="flex items-center">
                      <svg className="w-4 h-4 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      7 detailed steps
                    </li>
                    <li className="flex items-center">
                      <svg className="w-4 h-4 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Interactive tutorial
                    </li>
                    <li className="flex items-center">
                      <svg className="w-4 h-4 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Build a complete SaaS
                    </li>
                  </ul>
                  <div className="text-emerald-600 font-medium">
                    ~30-45 minutes
                  </div>
                </div>
              </div>

              {/* Overlay Onboarding Option */}
              <div 
                className="border-2 border-blue-200 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all hover:border-blue-400 hover:bg-blue-50"
                onClick={handleSelectOverlay}
              >
                <div className="text-center">
                  <div className="text-5xl mb-4 text-blue-500">📋</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Quick Checklist
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Simple 4-step checklist to get started quickly
                  </p>
                  <ul className="text-left space-y-2 mb-4 text-sm text-gray-700">
                    <li className="flex items-center">
                      <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      4 essential steps
                    </li>
                    <li className="flex items-center">
                      <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Quick setup process
                    </li>
                    <li className="flex items-center">
                      <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Essential features only
                    </li>
                  </ul>
                  <div className="text-blue-600 font-medium">
                    ~15-20 minutes
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center text-gray-600">
              <p>Not sure which to choose? Start with the Guided Onboarding for a comprehensive introduction.</p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-8 py-4 bg-gray-50 text-center">
            <button
              onClick={handleDismiss}
              className="text-gray-500 hover:text-gray-700 font-medium"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If no selector is shown, return null
  return null;
};

export default OnboardingSelector;