import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import AIPageBuilder from '../../../components/AIPageBuilder';

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

        // Auto-analyze the image
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
        }
        setIsAnalyzingImage(false);
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      setError('Failed to upload or analyze image');
      setIsAnalyzingImage(false);
    }
  };

  const generatePage = async (prompt, isModification = false) => {
    if (!prompt.trim()) return;

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
      const response = await fetch('/api/ai/generate-reserved-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType: pageType,
          prompt: prompt,
          context: isModification ? currentCode : '',
          iteration_type: isModification ? 'modify' : 'new',
          layoutAnalysis: imageAnalysis
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentCode(data.html_code);
        setPreviewKey(prev => prev + 1);
        
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
        {rules && (
          <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-4 mb-6">
            <h3 className="text-emerald-300 font-medium mb-2">Required Elements (Automatically Maintained)</h3>
            <div className="flex flex-wrap gap-2">
              {rules.required_elements.map((element, index) => (
                <span 
                  key={index}
                  className="bg-emerald-800/30 text-emerald-200 text-xs px-2 py-1 rounded border border-emerald-600/30"
                  title={element.description}
                >
                  {element.type}: {element.id || element.name}
                </span>
              ))}
            </div>
            <p className="text-emerald-200/70 text-xs mt-2">
              All required functionality will be preserved. Focus on styling and user experience.
            </p>
          </div>
        )}

        {/* AI Builder Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-400px)]">
          {/* Left Panel - Chat Interface */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center">
                <span className="mr-2">🎨</span>
                AI Customizer
              </h3>
              <p className="text-sm text-slate-400 mt-1">Describe how you want to customize this page</p>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🎨</div>
                  <h3 className="text-lg font-medium text-slate-200 mb-2">Ready to customize?</h3>
                  <p className="text-slate-400 text-sm mb-6">Try one of these examples or describe your own style:</p>
                  <div className="space-y-2">
                    {(examplePrompts[pageType] || []).slice(0, 3).map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPrompt(prompt)}
                        className="w-full text-left p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-300 hover:text-slate-200 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  {/* Image Upload Section */}
                  <div className="mt-6 p-6 bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-600">
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
                      <div className="text-5xl mb-3">📸</div>
                      <div className="text-slate-200 font-medium mb-1">Upload Layout Image (Optional)</div>
                      <div className="text-slate-400 text-xs">Upload a reference design or screenshot</div>
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
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-emerald-600 text-white'
                      : message.type === 'error'
                      ? 'bg-red-900/20 border border-red-600/30 text-red-300'
                      : message.type === 'system'
                      ? 'bg-green-900/20 border border-green-600/30 text-green-300'
                      : 'bg-slate-700 text-slate-200'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    {message.type === 'ai' && message.tokens_used && (
                      <div className="mt-2 pt-2 border-t border-slate-600 text-xs text-slate-400">
                        Tokens: {message.tokens_used} • Cost: ${message.estimated_cost?.toFixed(4)}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {isAnalyzingImage && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-blue-900/20 border border-blue-600/30 text-blue-200 rounded-lg px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                      <span className="text-sm">Analyzing layout image...</span>
                    </div>
                  </div>
                </div>
              )}
              
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-slate-700 text-slate-200 rounded-lg px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                      <span className="text-sm">Customizing your page...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-700 p-4">
              {/* Image Upload Button */}
              {chatHistory.length > 0 && !uploadedImage && (
                <div className="mb-3">
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
                    className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-slate-200 text-sm transition-colors"
                  >
                    <span>📷</span>
                    <span>Upload Layout Image</span>
                  </label>
                </div>
              )}

              <form onSubmit={handlePromptSubmit} className="flex space-x-3">
                <input
                  type="text"
                  value={currentPrompt}
                  onChange={(e) => setCurrentPrompt(e.target.value)}
                  placeholder={chatHistory.length === 0 ? "Describe how you want to customize this page..." : "How would you like to modify the design?"}
                  className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  disabled={isGenerating || isAnalyzingImage}
                />
                <button
                  type="submit"
                  disabled={isGenerating || isAnalyzingImage || !currentPrompt.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isGenerating ? '⏳' : '🎨'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Panel - Live Preview */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center">
                <span className="mr-2">{viewMode === 'preview' ? '👁️' : '💻'}</span>
                {viewMode === 'preview' ? 'Live Preview' : 'Code Editor'}
              </h3>
              <div className="flex items-center space-x-3">
                {currentCode && (
                  <div className="text-xs text-slate-400">
                    {currentCode.length} characters
                  </div>
                )}
                <div className="flex bg-slate-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      viewMode === 'preview'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    👁️ Preview
                  </button>
                  <button
                    onClick={() => setViewMode('code')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      viewMode === 'code'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    💻 Code
                  </button>
                </div>
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
                    <div className="flex items-center justify-center h-full bg-slate-50">
                      <div className="text-center text-slate-500">
                        <div className="text-6xl mb-4">🎨</div>
                        <h3 className="text-lg font-medium mb-2">No customization yet</h3>
                        <p className="text-sm">Start customizing to see a live preview</p>
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
                      <div className="text-center text-slate-400">
                        <div className="text-6xl mb-4">💻</div>
                        <h3 className="text-lg font-medium mb-2">No code yet</h3>
                        <p className="text-sm">Generate a page to view and edit the code</p>
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
          {/* Error Display */}
          {error && (
            <div className="bg-red-900/20 border border-red-600/30 text-red-300 px-4 py-3 rounded-xl">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
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
    </AdminLayout>
  );
}