import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import AIPageBuilder from '../../../components/AIPageBuilder';
import Toast from '../../../components/ui/Toast';

export default function ReservedPageCustomizer() {
  const router = useRouter();
  const { pageType } = router.query;

  const [currentPrompt, setCurrentPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [rules, setRules] = useState(null);
  const [existingPage, setExistingPage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState(null);
  const [viewMode, setViewMode] = useState('preview'); // 'preview' or 'code'
  const [apiKeyConfigured, setApiKeyConfigured] = useState(null); // null = checking, true/false = result
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [conversationId, setConversationId] = useState(null); // Track conversation for edit stacking

  const previewRef = useRef(null);
  const chatEndRef = useRef(null);

  const pageTypeNames = {
    'customer-login': 'Customer Login Page',
    'customer-signup': 'Customer Signup Page',
    'customer-dashboard': 'Customer Dashboard',
    'customer-profile': 'Customer Profile Page',
    'customer-billing': 'Billing & Upgrade Page',
    'password-reset': 'Password Reset Page',
    'customer-layout-sidebar': 'Customer Layout - Sidebar',
    'customer-layout-chat': 'Customer Layout - Chat',
    'customer-connections': 'OAuth Connections Page',
    'customer-ai-services': 'AI Services Page',
    'landing-page': 'Landing Page'
  };

  // Get the live page URL based on pageType
  const getPageUrl = (pageType) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
    const urlMap = {
      'customer-login': `${baseUrl}/customer/login`,
      'customer-signup': `${baseUrl}/customer/signup`,
      'customer-dashboard': `${baseUrl}/customer/dashboard`,
      'customer-profile': `${baseUrl}/customer/profile`,
      'customer-billing': `${baseUrl}/customer/billing`,
      'password-reset': `${baseUrl}/customer/reset-password`,
      'customer-layout-sidebar': `${baseUrl}/customer/dashboard`, // Uses layout
      'customer-layout-chat': `${baseUrl}/customer/dashboard`, // Uses layout
      'customer-connections': `${baseUrl}/customer/connections`,
      'customer-ai-services': `${baseUrl}/customer/ai-services`,
      'landing-page': `${baseUrl}/`
    };
    return urlMap[pageType] || `${baseUrl}/`;
  };

  useEffect(() => {
    if (pageType) {
      fetchPageData();
      fetchVersions();
    }
  }, [pageType]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Check if Claude API key is configured in settings
  useEffect(() => {
    const checkApiKeyStatus = async () => {
      try {
        const response = await fetch('/api/admin/ai-settings');
        const data = await response.json();
        setApiKeyConfigured(data.success && data.settings?.has_api_key);
      } catch (error) {
        console.error('Error checking API key status:', error);
        setApiKeyConfigured(false);
      }
    };
    checkApiKeyStatus();
  }, []);

  const fetchPageData = async () => {
    try {
      // Fetch rules
      const rulesResponse = await fetch('/api/admin/reserved-pages?pageType=rules');
      const rulesData = await rulesResponse.json();
      
      if (rulesData.success) {
        setRules(rulesData.rules[pageType]);
      }

      // Fetch existing page if it exists
      const pageResponse = await fetch(`/api/admin/reserved-pages?pageType=${pageType}`);
      const pageData = await pageResponse.json();
      
      if (pageData.success) {
        setExistingPage(pageData.page);
        setCurrentCode(pageData.page.html_code || '');
        if (pageData.page.html_code) {
          setPreviewKey(prev => prev + 1);
        }
      }
    } catch (err) {
      setError('Failed to load page data');
      console.error(err);
    }
  };

  const fetchVersions = async () => {
    try {
      const response = await fetch(`/api/admin/reserved-page-versions?pageType=${pageType}`);
      const data = await response.json();
      if (data.success) {
        setVersions(data.versions);
      }
    } catch (err) {
      console.error('Failed to fetch versions:', err);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if API key is configured
    if (!apiKeyConfigured) {
      setError('Please configure your Claude API key in Settings > AI Settings first');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload-layout-image', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setUploadedImage(data);

        // Auto-analyze the image using global Claude key
        setIsAnalyzingImage(true);
        const analysisResponse = await fetch('/api/ai/analyze-layout-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imagePath: data.path,
            userPrompt: currentPrompt
          })
        });

        const analysisData = await analysisResponse.json();
        if (analysisData.success) {
          setImageAnalysis(analysisData.analysis);

          const analysisMessage = {
            id: Date.now(),
            type: 'system',
            content: `📷 Image analyzed successfully! I can see the layout structure. Ready to generate based on this design.`,
            timestamp: new Date()
          };
          setChatHistory(prev => [...prev, analysisMessage]);
        } else {
          throw new Error(analysisData.error || 'Failed to analyze image');
        }
        setIsAnalyzingImage(false);
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      setError(error.message || 'Failed to upload or analyze image');
      setIsAnalyzingImage(false);
    }
  };

  const generatePage = async (prompt, isModification = false) => {
    if (!prompt.trim()) return;

    // Check if API key is configured
    if (!apiKeyConfigured) {
      setError('Please configure your Claude API key in Settings > AI Settings first');
      return;
    }

    setIsGenerating(true);
    setError('');

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: prompt,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, userMessage]);

    try {
      // Use global Claude API key (configured in Settings > AI Settings)
      // Send conversationId to enable edit stacking (edits build on each other)
      const response = await fetch('/api/ai/generate-reserved-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType: pageType,
          prompt: prompt,
          context: isModification ? currentCode : '',
          iteration_type: isModification ? 'modify' : 'new',
          layoutAnalysis: imageAnalysis,
          conversationId: conversationId // Send existing conversation ID for edit stacking
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentCode(data.html_code);
        setPreviewKey(prev => prev + 1);
        setToast({ visible: true, message: 'Design generated successfully!', type: 'success' });

        // Store conversation ID for subsequent edits (enables stacking)
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }

        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: isModification ? 'Page customization updated!' : 'Page customization generated!',
          code: data.html_code,
          tokens_used: data.tokens_used,
          estimated_cost: data.estimated_cost,
          timestamp: new Date()
        };
        setChatHistory(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.error || 'Failed to generate page');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setError(error.message);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Failed to generate page: ' + error.message,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
      setCurrentPrompt('');
    }
  };

  const handlePromptSubmit = (e) => {
    e.preventDefault();
    if (currentPrompt.trim() && !isGenerating) {
      const isModification = chatHistory.length > 0 && currentCode;
      generatePage(currentPrompt, isModification);
    }
  };

  const savePage = async () => {
    if (!currentCode) {
      setError('Please generate a page customization before saving');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const pageData = {
        html_code: currentCode,
        chat_history: chatHistory,
        title: rules?.name || pageTypeNames[pageType]
      };

      const response = await fetch('/api/admin/reserved-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType: pageType,
          pageData: pageData
        }),
      });

      const data = await response.json();

      if (data.success) {
        setExistingPage(data.page);
        fetchVersions(); // Refresh versions after saving
        
        const successMessage = {
          id: Date.now(),
          type: 'system',
          content: 'Page customization saved successfully!',
          timestamp: new Date()
        };
        setChatHistory(prev => [...prev, successMessage]);
        
        setTimeout(() => {
          setChatHistory(prev => prev.filter(msg => msg.id !== successMessage.id));
        }, 3000);
      } else {
        setError(data.error || 'Failed to save page');
      }
    } catch (err) {
      setError('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const deployPage = async () => {
    if (!existingPage?.html_code) {
      setError('Please save the customization before deploying');
      return;
    }

    setDeploying(true);
    setError('');

    try {
      const response = await fetch('/api/admin/deploy-reserved-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType: pageType,
          action: 'deploy'
        }),
      });

      const data = await response.json();

      if (data.success) {
        const successMessage = {
          id: Date.now(),
          type: 'system',
          content: `Page deployed successfully! Live at the customer ${pageType.replace('customer-', '')} page.`,
          timestamp: new Date()
        };
        setChatHistory(prev => [...prev, successMessage]);
        
        fetchPageData(); // Refresh to show deployment status
      } else {
        setError(data.error || 'Failed to deploy page');
      }
    } catch (err) {
      setError('Failed to deploy page');
    } finally {
      setDeploying(false);
    }
  };

  const resetToDefault = () => {
    if (confirm('Are you sure you want to reset to default? This will remove all customizations.')) {
      setCurrentCode('');
      setChatHistory([]);
      setPreviewKey(prev => prev + 1);
      
      fetch(`/api/admin/reserved-pages?pageType=${pageType}`, {
        method: 'DELETE'
      }).then(() => {
        setExistingPage(null);
        fetchVersions();
      });
    }
  };

  const restoreVersion = async (version) => {
    if (confirm(`Restore to version ${version}? Current changes will be saved as a new version.`)) {
      try {
        const response = await fetch(`/api/admin/reserved-page-versions?pageType=${pageType}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'restore',
            version: version
          })
        });

        const data = await response.json();
        if (data.success) {
          fetchPageData();
          fetchVersions();

          const successMessage = {
            id: Date.now(),
            type: 'system',
            content: `Restored to version ${version} successfully!`,
            timestamp: new Date()
          };
          setChatHistory(prev => [...prev, successMessage]);
        } else {
          setError(data.error || 'Failed to restore version');
        }
      } catch (err) {
        setError('Failed to restore version');
      }
    }
  };

  const handleCodeChange = (newCode) => {
    setCurrentCode(newCode);
    setPreviewKey(prev => prev + 1); // Refresh preview
  };


  if (!pageType) {
    return (
      <AdminLayout title="Reserved Page Customizer">
        <div className="flex justify-center items-center h-64">
          <div className="text-slate-400">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  const examplePrompts = {
    'customer-login': [
      "Make the login page have a modern dark theme with blue accents and glassmorphism effects",
      "Create a clean, professional design with your company branding colors",
      "Design a minimalist login form with subtle animations and green color scheme"
    ],
    'customer-signup': [
      "Create a vibrant signup page with gradient backgrounds and modern styling",
      "Make it look professional and trustworthy with clean forms and clear messaging",
      "Add fun animations and colorful accents to make registration engaging"
    ],
    'customer-dashboard': [
      "Design a modern dashboard with card-based layout and data visualizations",
      "Create a clean, organized interface with good use of whitespace and typography",
      "Make it colorful and engaging with progress bars and interactive elements"
    ],
    'customer-profile': [
      "Create an elegant profile page with modern form styling and user-friendly layout",
      "Design a professional profile management interface with clear sections",
      "Make it feel personal and welcoming with warm colors and smooth interactions"
    ],
    'customer-billing': [
      "Design a trustworthy billing page with clear pricing cards and secure payment feel",
      "Create a modern subscription interface with engaging upgrade prompts",
      "Make the pricing plans visually appealing with highlighting and clear benefits"
    ],
    'password-reset': [
      "Create a simple, reassuring password reset page with clear instructions",
      "Design a secure-feeling interface that builds user confidence",
      "Make it clean and minimal with helpful messaging and easy-to-use form"
    ]
  };

  return (
    <AdminLayout title={`Customize ${pageTypeNames[pageType] || pageType}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <button
                onClick={() => router.push('/admin/reserved-pages')}
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                ← Back to Reserved Pages
              </button>
            </div>
            <h1 className="text-3xl font-bold text-slate-100">{pageTypeNames[pageType] || pageType}</h1>
            <p className="text-slate-400 mt-1">
              {rules?.description || 'Customize this page while maintaining required functionality'}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {existingPage && (
              <div className="text-sm text-slate-400">
                Version {existingPage.version} • Last modified {new Date(existingPage.lastModified).toLocaleDateString()}
                {existingPage.deployed && <span className="ml-2 text-green-400">• Deployed</span>}
              </div>
            )}
            
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors"
            >
              Versions ({versions.length})
            </button>
            
            {existingPage && (
              <>
                <button
                  onClick={deployPage}
                  disabled={deploying}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {deploying ? 'Deploying...' : existingPage.deployed ? 'Redeploy' : 'Deploy Live'}
                </button>

                {existingPage.deployed && (
                  <a
                    href={getPageUrl(pageType)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Page
                  </a>
                )}
              </>
            )}

            <button
              onClick={() => router.push('/admin/settings')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                apiKeyConfigured
                  ? 'bg-slate-600 hover:bg-slate-500 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              {apiKeyConfigured ? 'Claude Key Configured' : 'Configure API Key'}
            </button>

            <button
              onClick={resetToDefault}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Versions Panel */}
        {showVersions && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
            <h3 className="text-slate-200 font-medium mb-4">Version History</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {versions.map((version) => (
                <div key={version.version} className="flex justify-between items-center p-2 bg-slate-700/50 rounded">
                  <div>
                    <span className="text-slate-200">Version {version.version}</span>
                    <span className="text-slate-400 text-sm ml-2">{new Date(version.timestamp).toLocaleDateString()}</span>
                    {version.deployed && <span className="ml-2 text-green-400 text-xs">Deployed</span>}
                  </div>
                  <button
                    onClick={() => restoreVersion(version.version)}
                    className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
                  >
                    Restore
                  </button>
                </div>
              ))}
              {versions.length === 0 && (
                <div className="text-slate-400 text-sm">No versions saved yet</div>
              )}
            </div>
          </div>
        )}

        {/* Required Elements Info */}
        {rules && (() => {
          const DESIGN_FREEDOM_PAGES = ['landing-page', 'pricing-page', 'about-page', 'blog-homepage'];
          const FLEXIBLE_STYLING_PAGES = ['customer-login', 'customer-signup', 'password-reset', 'contact-page'];

          const isDesignFreedom = DESIGN_FREEDOM_PAGES.includes(pageType);
          const isFlexibleStyling = FLEXIBLE_STYLING_PAGES.includes(pageType);

          // Get theme colors based on flexibility level
          const themeClasses = isDesignFreedom
            ? { bg: 'bg-blue-900/20 border-blue-600/30', title: 'text-blue-300', badge: 'bg-blue-800/30 text-blue-200 border-blue-600/30', text: 'text-blue-200/70' }
            : isFlexibleStyling
            ? { bg: 'bg-purple-900/20 border-purple-600/30', title: 'text-purple-300', badge: 'bg-purple-800/30 text-purple-200 border-purple-600/30', text: 'text-purple-200/70' }
            : { bg: 'bg-emerald-900/20 border-emerald-600/30', title: 'text-emerald-300', badge: 'bg-emerald-800/30 text-emerald-200 border-emerald-600/30', text: 'text-emerald-200/70' };

          return (
            <div className={`rounded-xl p-4 mb-6 border ${themeClasses.bg}`}>
              <h3 className={`font-medium mb-2 ${themeClasses.title}`}>
                {isDesignFreedom
                  ? 'Design Freedom - Complete Creative Control'
                  : isFlexibleStyling
                  ? 'Flexible Styling - Any Design, Working Forms'
                  : 'Required Elements (Automatically Maintained)'}
              </h3>

              {isDesignFreedom ? (
                <div>
                  <p className={`text-sm mb-3 ${themeClasses.text}`}>
                    Complete creative freedom. Design any layout, style, and structure. Only requirements:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-xs px-2 py-1 rounded border ${themeClasses.badge}`}>
                      link: /subscribe/login
                    </span>
                    <span className={`text-xs px-2 py-1 rounded border ${themeClasses.badge}`}>
                      link: /subscribe/signup
                    </span>
                    {rules.required_functionality?.length > 0 && (
                      <span className={`text-xs px-2 py-1 rounded border ${themeClasses.badge}`}>
                        API: {rules.required_functionality[0].api_endpoint}
                      </span>
                    )}
                  </div>
                </div>
              ) : isFlexibleStyling ? (
                <div>
                  <p className={`text-sm mb-3 ${themeClasses.text}`}>
                    Design any visual style. These form elements must work:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rules.required_elements
                      .filter(el => el.type === 'input' || el.type === 'textarea')
                      .map((element, index) => (
                        <span
                          key={index}
                          className={`text-xs px-2 py-1 rounded border ${themeClasses.badge}`}
                          title={element.description}
                        >
                          {element.name}: {element.input_type || 'text'}
                        </span>
                      ))}
                    {rules.required_functionality?.filter(f => f.api_endpoint).map((func, index) => (
                      <span
                        key={`api-${index}`}
                        className={`text-xs px-2 py-1 rounded border ${themeClasses.badge}`}
                      >
                        API: {func.api_endpoint}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {rules.required_elements.map((element, index) => (
                      <span
                        key={index}
                        className={`text-xs px-2 py-1 rounded border ${themeClasses.badge}`}
                        title={element.description}
                      >
                        {element.type}: {element.id || element.name}
                      </span>
                    ))}
                  </div>
                  <p className={`text-xs mt-2 ${themeClasses.text}`}>
                    All required functionality will be preserved. Focus on styling and user experience.
                  </p>
                </>
              )}
            </div>
          );
        })()}

        {/* AI Builder Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-400px)]">
          {/* Left Panel - Chat Interface */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 px-6 py-5 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDBMNDAgNDBIMHoiLz48cGF0aCBkPSJNMCAwaDIwdjIwSDB6TTIwIDIwaDIwdjIwSDIweiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+')] opacity-30"></div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/20">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">AI Customizer</h3>
                  <p className="text-emerald-100 text-sm mt-0.5">Describe your design vision</p>
                </div>
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-900/30">
              {chatHistory.length === 0 && (
                <div className="text-center py-6">
                  {/* API Key Not Configured State */}
                  {apiKeyConfigured === false && (
                    <div className="mb-8 p-6 bg-amber-900/20 border border-amber-500/30 rounded-2xl">
                      <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/20 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-amber-300 mb-2">Claude API Key Required</h3>
                      <p className="text-amber-200/70 text-sm mb-4 max-w-sm mx-auto">
                        Configure your Claude API key in Settings to start generating custom page designs.
                      </p>
                      <button
                        onClick={() => router.push('/admin/settings')}
                        className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium transition-colors inline-flex items-center gap-2 shadow-lg shadow-amber-900/30"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Go to AI Settings
                      </button>
                    </div>
                  )}

                  {/* Ready to Customize State - only show if API key configured */}
                  {(apiKeyConfigured === true || apiKeyConfigured === null) && (
                    <>
                      {/* Empty State Icon */}
                      <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                        <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Ready to customize?</h3>
                      <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">Describe your vision or try one of these examples:</p>

                      {/* Example Prompts */}
                      <div className="space-y-2 max-w-md mx-auto">
                        {(examplePrompts[pageType] || []).slice(0, 3).map((prompt, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentPrompt(prompt)}
                            className="w-full text-left p-4 bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 hover:border-emerald-500/50 rounded-xl text-sm text-slate-300 hover:text-white transition-all duration-200 group"
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-emerald-400 group-hover:scale-110 transition-transform">✨</span>
                              <span>{prompt}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Image Upload Section */}
                  <div className="mt-6 p-5 bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-600 hover:border-emerald-500/50 transition-colors group">
                    <input
                      type="file"
                      id="layoutImageReserved"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isAnalyzingImage}
                    />
                    <label
                      htmlFor="layoutImageReserved"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <div className="w-14 h-14 bg-slate-700 group-hover:bg-emerald-600/20 rounded-xl flex items-center justify-center mb-3 transition-colors">
                        <svg className="w-7 h-7 text-slate-400 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="text-white font-medium mb-1">Upload Reference Image</div>
                      <div className="text-slate-500 text-xs">PNG, JPG up to 10MB</div>
                    </label>
                  </div>
                </div>
              )}

              {uploadedImage && (
                <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                  <div className="flex items-center space-x-3">
                    <img
                      src={uploadedImage.url}
                      alt="Uploaded layout"
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-slate-200 font-medium">Layout Reference</p>
                      <p className="text-xs text-slate-400">{uploadedImage.filename}</p>
                    </div>
                    <button
                      onClick={() => {
                        setUploadedImage(null);
                        setImageAnalysis(null);
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {chatHistory.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                    message.type === 'user'
                      ? 'bg-emerald-600'
                      : message.type === 'error'
                      ? 'bg-red-600/20 border border-red-500/30'
                      : message.type === 'system'
                      ? 'bg-blue-600/20 border border-blue-500/30'
                      : 'bg-gradient-to-br from-violet-600 to-purple-600'
                  }`}>
                    {message.type === 'user' ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : message.type === 'error' ? (
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    ) : message.type === 'system' ? (
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    )}
                  </div>
                  {/* Message Bubble */}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-md'
                      : message.type === 'error'
                      ? 'bg-red-900/30 border border-red-500/30 text-red-200 rounded-tl-md'
                      : message.type === 'system'
                      ? 'bg-blue-900/30 border border-blue-500/30 text-blue-200 rounded-tl-md'
                      : 'bg-slate-700/80 text-slate-100 rounded-tl-md'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    {message.type === 'ai' && message.tokens_used && (
                      <div className="mt-2 pt-2 border-t border-white/10 text-xs text-slate-400 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-600/50 rounded-full">{message.tokens_used} tokens</span>
                        <span className="px-2 py-0.5 bg-emerald-600/30 text-emerald-300 rounded-full">${message.estimated_cost?.toFixed(4)}</span>
                      </div>
                    )}
                    <div className="text-xs opacity-60 mt-1.5">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {isAnalyzingImage && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-blue-600/20 border border-blue-500/30">
                    <svg className="w-5 h-5 text-blue-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="max-w-[75%] rounded-2xl rounded-tl-md px-4 py-3 bg-blue-900/30 border border-blue-500/30">
                    <div className="flex items-center gap-3">
                      <div className="flex space-x-1">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                      <span className="text-sm text-blue-200">Analyzing your image...</span>
                    </div>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-600 to-purple-600">
                    <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="max-w-[75%] rounded-2xl rounded-tl-md px-4 py-3 bg-slate-700/80">
                    <div className="flex items-center gap-3">
                      <div className="flex space-x-1">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                      <span className="text-sm text-slate-200">Generating your design...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-600/50 p-4 bg-slate-800/50">
              <form onSubmit={handlePromptSubmit} className="relative">
                {/* Main Input Container */}
                <div className="relative flex items-end gap-2 bg-slate-900/50 border border-slate-600/50 rounded-2xl p-2 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                  {/* Left Actions */}
                  <div className="flex items-center gap-1 pb-1">
                    {/* Image Upload Button */}
                    <input
                      type="file"
                      id="layoutImageReservedChat"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isAnalyzingImage}
                    />
                    <label
                      htmlFor="layoutImageReservedChat"
                      className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                        uploadedImage
                          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                          : 'hover:bg-slate-700 text-slate-400 hover:text-emerald-400'
                      }`}
                      title={uploadedImage ? "Reference image attached" : "Upload reference image"}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </label>
                  </div>

                  {/* Text Input */}
                  <div className="flex-1 min-w-0">
                    <textarea
                      value={currentPrompt}
                      onChange={(e) => {
                        setCurrentPrompt(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (currentPrompt.trim() && !isGenerating && !isAnalyzingImage) {
                            handlePromptSubmit(e);
                          }
                        }
                      }}
                      placeholder={chatHistory.length === 0 ? "Describe your design vision..." : "Describe changes..."}
                      className="w-full bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none resize-none text-sm leading-relaxed py-2 px-1 max-h-[120px]"
                      style={{ height: '40px' }}
                      disabled={isGenerating || isAnalyzingImage}
                      rows={1}
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={isGenerating || isAnalyzingImage || !currentPrompt.trim()}
                    className={`flex-shrink-0 p-3 rounded-xl font-medium transition-all duration-200 ${
                      isGenerating || isAnalyzingImage || !currentPrompt.trim()
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {isGenerating ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Helper Text */}
                <div className="flex items-center justify-between mt-2 px-2">
                  <span className="text-xs text-slate-500">
                    Press Enter to send, Shift+Enter for new line
                  </span>
                  {uploadedImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImage(null);
                        setImageAnalysis(null);
                      }}
                      className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Remove image
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Right Panel - Live Preview */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-600/50 bg-slate-900/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  viewMode === 'preview'
                    ? 'bg-blue-500/20 border border-blue-500/30'
                    : 'bg-violet-500/20 border border-violet-500/30'
                }`}>
                  {viewMode === 'preview' ? (
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {viewMode === 'preview' ? 'Live Preview' : 'Code Editor'}
                  </h3>
                  {currentCode && (
                    <p className="text-xs text-slate-400">{currentCode.length.toLocaleString()} characters</p>
                  )}
                </div>
              </div>
              <div className="flex bg-slate-700/50 rounded-xl p-1 border border-slate-600/50">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
                    viewMode === 'preview'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-600/50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
                    viewMode === 'code'
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-600/50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Code
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {viewMode === 'preview' ? (
                <div className="w-full h-full bg-white">
                  {currentCode ? (
                    <iframe
                      key={previewKey}
                      ref={previewRef}
                      srcDoc={currentCode}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-forms allow-modals"
                      title="Page Preview"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-100 to-slate-200">
                      <div className="text-center max-w-sm px-6">
                        <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl flex items-center justify-center border border-slate-300/50 shadow-lg">
                          <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Preview Area</h3>
                        <p className="text-sm text-slate-500 mb-5">
                          Your generated page will appear here. Use the AI customizer to create something amazing.
                        </p>
                        <div className="inline-flex flex-col gap-2.5 text-xs text-slate-500 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-sm shadow-emerald-500/50"></span>
                            <span>Setup Wizard auto-generates all pages</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 bg-blue-500 rounded-full shadow-sm shadow-blue-500/50"></span>
                            <span>AI chat lets you customize individually</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full bg-slate-900 p-4">
                  {currentCode ? (
                    <textarea
                      value={currentCode}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      className="w-full h-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-mono text-sm resize-none"
                      placeholder="HTML code will appear here..."
                      spellCheck="false"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-violet-500/30">
                          <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Code Yet</h3>
                        <p className="text-sm text-slate-400 max-w-xs mx-auto">Generate a page using the AI customizer to view and edit the source code</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-6 space-y-4">
          {/* Enhanced Error Display */}
          {error && (
            <div className="bg-gradient-to-r from-red-900/40 to-red-800/20 border border-red-500/50 rounded-2xl p-5 shadow-lg shadow-red-900/20">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-red-300 mb-1">Generation Failed</h4>
                  <p className="text-red-200/80">{error}</p>
                  {error.toLowerCase().includes('api key') && (
                    <button
                      onClick={() => router.push('/admin/settings')}
                      className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Go to AI Settings
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setError('')}
                  className="flex-shrink-0 text-red-400 hover:text-red-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {currentCode && (
              <button
                onClick={savePage}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Save Customization</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => router.push('/admin/reserved-pages')}
              className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Back to Reserved Pages
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={() => setToast({ ...toast, visible: false })}
      />
    </AdminLayout>
  );
}