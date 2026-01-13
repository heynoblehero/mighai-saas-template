import { useState, useEffect, useRef } from 'react';

const NewOnboarding = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [progress, setProgress] = useState([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [graffitiText, setGraffitiText] = useState("");
  const [graffitiIndex, setGraffitiIndex] = useState(0);
  const videoRef = useRef(null);

  // Define onboarding steps
  const steps = [
    {
      id: 0,
      title: "Welcome to Mighai",
      type: "welcome",
      content: {
        text: "Welcome to Mighai! We're excited to have you on board. This onboarding guide will help you get started with our platform and make the most of its features. You'll learn how to build, launch, and grow your SaaS business with our comprehensive tools.",
        graffiti: "🎉 Welcome to Mighai! 🚀"
      }
    },
    {
      id: 1,
      title: "Meet the Founder",
      type: "video",
      content: {
        text: "Learn about the vision behind Mighai and how it can help you build your SaaS business. In this video, our founder shares insights about the platform's mission and how it can accelerate your journey to building a successful SaaS product.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder video URL
        videoTitle: "Introduction from the Founder"
      }
    },
    {
      id: 2,
      title: "Setting Up Your Account",
      type: "video",
      content: {
        text: "Learn how to set up your account and configure your basic settings. This includes connecting your payment providers, setting up your branding, and configuring essential platform settings to get started quickly.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder video URL
        videoTitle: "Account Setup Guide"
      }
    },
    {
      id: 3,
      title: "Creating Your First Page",
      type: "video",
      content: {
        text: "Discover how to create your first page using our intuitive page builder. Learn about our drag-and-drop interface, pre-built templates, and customization options that make creating professional pages simple and fast.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder video URL
        videoTitle: "Page Creation Tutorial"
      }
    },
    {
      id: 4,
      title: "Configuring Payments",
      type: "video",
      content: {
        text: "Learn how to set up payment processing and subscription plans. We'll cover integrating payment providers, creating pricing tiers, managing billing cycles, and handling subscription management for your customers.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder video URL
        videoTitle: "Payment Configuration"
      }
    },
    {
      id: 5,
      title: "Managing Subscribers",
      type: "video",
      content: {
        text: "Understand how to manage your subscribers and track their activity. Learn about user management, email communication tools, and how to engage with your audience to grow your SaaS business.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder video URL
        videoTitle: "Subscriber Management"
      }
    },
    {
      id: 6,
      title: "Custom Backend Routes & API Keys",
      type: "text",
      content: {
        text: "Create powerful backend API routes that your subscribers can access programmatically! Go to Backend Routes to create custom endpoints with Node.js code. Enable 'Allow API Key Access' on routes you want subscribers to call via curl or code. Then generate API keys for subscribers from the Subscribers page. Subscribers can also manage their own keys from their dashboard. Each API call deducts from their plan's credit limit - perfect for building automation features, integrations, and developer APIs for your SaaS!"
      }
    },
    {
      id: 7,
      title: "Analytics & Insights",
      type: "video",
      content: {
        text: "Explore the analytics dashboard to understand your business performance. Discover key metrics, conversion tracking, user behavior analysis, and how to use data to make informed decisions for your SaaS.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder video URL
        videoTitle: "Analytics Overview"
      }
    },
    {
      id: 8,
      title: "Next Steps",
      type: "text",
      content: {
        text: "Congratulations! You've completed the onboarding. Now you're ready to start building your SaaS. Remember, you can always access this guide from the question mark icon in the header. Start by creating your first page, setting up your pricing, and launching your SaaS to the world!"
      }
    }
  ];

  // Initialize graffiti animation
  useEffect(() => {
    if (showWelcome) {
      const welcomeText = "Build Your SaaS Empire!";
      let currentIndex = 0;

      const typeWriter = () => {
        if (currentIndex < welcomeText.length) {
          setGraffitiText(prev => prev + welcomeText[currentIndex]);
          currentIndex++;
          setTimeout(typeWriter, 100);
        }
      };

      typeWriter();
    }
  }, [showWelcome]);

  // Load progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('new_onboarding_progress');
    const welcomeShown = localStorage.getItem('new_onboarding_welcome_shown');
    
    if (savedProgress) {
      setProgress(JSON.parse(savedProgress));
    }
    
    if (welcomeShown === 'true') {
      setShowWelcome(false);
    }
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    localStorage.setItem('new_onboarding_progress', JSON.stringify(progress));
  }, [progress]);

  const handleStepComplete = (stepId) => {
    if (!progress.includes(stepId)) {
      setProgress([...progress, stepId]);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      handleStepComplete(currentStep);
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepSelect = (stepId) => {
    setCurrentStep(stepId);
  };

  const handleWelcomeComplete = () => {
    localStorage.setItem('new_onboarding_welcome_shown', 'true');
    setShowWelcome(false);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleVideoPlay = () => {
    // Additional video handling if needed
  };

  if (!isOpen) return null;

  if (showWelcome) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
          <div className="p-8 text-center">
            <div className="relative mb-8">
              <div className="text-8xl animate-bounce">🚀</div>
              <div className="absolute -top-4 -right-4 text-6xl animate-ping">✨</div>
              <div className="absolute -top-8 -left-4 text-5xl animate-pulse">🎯</div>
              <div className="absolute -bottom-4 -left-4 text-5xl animate-pulse">💡</div>
              <div className="absolute -bottom-4 -right-4 text-5xl animate-pulse">⚡</div>
            </div>

            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-4">
              Welcome to Mighai!
            </h1>

            <div className="relative h-40 mb-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-lg animate-pulse"></div>
              <div className="relative text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 graffiti-text">
                {graffitiText}
                <span className="animate-pulse">|</span>
              </div>

              {/* Additional graffiti elements */}
              <div className="absolute top-4 left-4 text-3xl animate-bounce">🎨</div>
              <div className="absolute top-4 right-4 text-3xl animate-bounce delay-100">🚀</div>
              <div className="absolute bottom-4 left-4 text-3xl animate-bounce delay-200">💡</div>
              <div className="absolute bottom-4 right-4 text-3xl animate-bounce delay-300">⚡</div>
            </div>

            <p className="text-slate-300 text-lg mb-8 max-w-lg mx-auto">
              Get ready to discover how Mighai can help you build, launch, and grow your SaaS business.
              This quick onboarding will guide you through everything you need to know.
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={handleWelcomeComplete}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
              >
                Start Onboarding
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-emerald-600 text-white p-3 rounded-full shadow-lg hover:bg-emerald-700 transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    );
  }

  const currentStepData = steps[currentStep];
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col max-w-6xl w-full mx-auto my-8 inset-x-4 inset-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl flex flex-col h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-2xl">🎓</div>
            <h2 className="text-xl font-bold text-slate-100">{currentStepData.title}</h2>
            <div className="text-sm text-slate-400 ml-4">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleMinimize}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-slate-700/50 border-b border-slate-700">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-slate-300">Progress</span>
            <span className="text-sm text-slate-300">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Step Index */}
          <div className="w-64 bg-slate-700/30 border-r border-slate-700 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold text-slate-200 mb-3">Onboarding Steps</h3>
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => handleStepSelect(step.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      currentStep === index
                        ? 'bg-emerald-600 text-white'
                        : progress.includes(index)
                        ? 'bg-emerald-900/30 text-emerald-300'
                        : 'bg-slate-600/30 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${
                        currentStep === index
                          ? 'bg-white text-emerald-600'
                          : progress.includes(index)
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-500 text-slate-200'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="text-sm truncate">{step.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentStepData.type === 'welcome' && (
              <div className="text-center py-8">
                <div className="text-6xl mb-6">🎉</div>
                <h3 className="text-2xl font-bold text-slate-100 mb-4">{currentStepData.content.graffiti}</h3>
                <p className="text-slate-300 text-lg max-w-2xl mx-auto">{currentStepData.content.text}</p>
              </div>
            )}

            {currentStepData.type === 'video' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-slate-100">{currentStepData.content.videoTitle}</h3>
                <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden">
                  <iframe
                    ref={videoRef}
                    src={currentStepData.content.videoUrl}
                    title={currentStepData.content.videoTitle}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={handleVideoPlay}
                  ></iframe>
                </div>
                <p className="text-slate-300">{currentStepData.content.text}</p>
              </div>
            )}

            {currentStepData.type === 'text' && (
              <div className="space-y-6">
                <p className="text-slate-300 text-lg">{currentStepData.content.text}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-700/50 border-t border-slate-700 p-4 flex justify-between items-center">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-6 py-2 rounded-lg font-medium ${
              currentStep === 0
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
            }`}
          >
            ← Previous
          </button>

          <div className="flex space-x-2">
            {progress.includes(currentStep) && (
              <span className="px-3 py-1 bg-emerald-600/30 text-emerald-300 rounded-full text-sm">
                Completed
              </span>
            )}
          </div>

          <button
            onClick={currentStep < steps.length - 1 ? handleNext : onClose}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all"
          >
            {currentStep < steps.length - 1 ? 'Next →' : 'Finish'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewOnboarding;