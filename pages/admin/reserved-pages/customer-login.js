import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';

export default function CustomerLoginCustomizer() {
  const pageType = 'customer-login';
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [rules, setRules] = useState(null);
  const [existingPage, setExistingPage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const previewRef = useRef(null);
  const chatEndRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    fetchPageData();
  }, []);

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
          iteration_type: isModification ? 'modify' : 'new'
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
        title: rules?.name || 'Customer Login Page'
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
        // Show success message briefly
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

  const resetToDefault = () => {
    if (confirm('Are you sure you want to reset to default? This will remove all customizations.')) {
      setCurrentCode('');
      setChatHistory([]);
      setPreviewKey(prev => prev + 1);
      
      // Delete the saved customization
      fetch(`/api/admin/reserved-pages?pageType=${pageType}`, {
        method: 'DELETE'
      }).then(() => {
        setExistingPage(null);
      });
    }
  };

  const examplePrompts = [
    "Make the login page have a modern dark theme with blue accents and glassmorphism effects",
    "Create a clean, professional design with your company branding colors",
    "Design a minimalist login form with subtle animations and green color scheme", 
    "Make it look like a tech startup login page with gradients and modern typography",
    "Create a corporate-style login page with professional blue and white colors"
  ];

  return (
    <AdminLayout title={`Customize ${rules?.name || 'Customer Login Page'}`}>
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
            <h1 className="text-3xl font-bold text-slate-100">{rules?.name || 'Customer Login Page'}</h1>
            <p className="text-slate-400 mt-1">
              {rules?.description || 'Customize the customer login page while maintaining required functionality'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {existingPage && (
              <div className="text-sm text-slate-400">
                Version {existingPage.version} • Last modified {new Date(existingPage.lastModified).toLocaleDateString()}
              </div>
            )}
            <button
              onClick={resetToDefault}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Reset to Default
            </button>
          </div>
        </div>

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
                    {examplePrompts.slice(0, 3).map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPrompt(prompt)}
                        className="w-full text-left p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-300 hover:text-slate-200 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
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
              <form onSubmit={handlePromptSubmit} className="flex space-x-3">
                <input
                  type="text"
                  value={currentPrompt}
                  onChange={(e) => setCurrentPrompt(e.target.value)}
                  placeholder={chatHistory.length === 0 ? "Describe how you want to customize the login page..." : "How would you like to modify the design?"}
                  className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  disabled={isGenerating}
                />
                <button
                  type="submit"
                  disabled={isGenerating || !currentPrompt.trim()}
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
                <span className="mr-2">👁️</span>
                Live Preview
              </h3>
              {currentCode && (
                <div className="text-xs text-slate-400">
                  {currentCode.length} characters
                </div>
              )}
            </div>

            <div className="flex-1 bg-white">
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