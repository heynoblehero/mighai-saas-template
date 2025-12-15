import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';

export default function NewPage() {
  const [mode, setMode] = useState('ai'); // 'ai' or 'manual'
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  
  const [pageData, setPageData] = useState({
    title: '',
    slug: '',
    meta_description: '',
    html_content: '',
    is_published: true,
    access_level: 'public'
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  
  const previewRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom of chat when new messages are added
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const generatePage = async (prompt, isModification = false) => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError('');

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: prompt,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/ai/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          context: isModification ? currentCode : '',
          iteration_type: isModification ? 'modify' : 'new'
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentCode(data.html_code);
        setPreviewKey(prev => prev + 1); // Force preview refresh
        
        // Add AI response to chat
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: isModification ? 'Page updated successfully!' : 'Page generated successfully!',
          code: data.html_code,
          tokens_used: data.tokens_used,
          estimated_cost: data.estimated_cost,
          timestamp: new Date()
        };
        setChatHistory(prev => [...prev, aiMessage]);

        // Auto-generate title and slug if it's a new page
        if (!isModification && !pageData.title) {
          const titleMatch = data.html_code.match(/<title[^>]*>([^<]*)<\/title>/i);
          const h1Match = data.html_code.match(/<h1[^>]*>([^<]*)<\/h1>/i);
          const extractedTitle = titleMatch?.[1] || h1Match?.[1] || prompt.slice(0, 50) + '...';
          
          setPageData(prev => ({
            ...prev,
            title: extractedTitle,
            slug: generateSlug(extractedTitle),
            html_content: data.html_code
          }));
        } else {
          setPageData(prev => ({
            ...prev,
            html_content: data.html_code
          }));
        }
      } else {
        throw new Error(data.error || 'Failed to generate page');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setError(error.message);
      
      // Add error message to chat
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
    if (!pageData.title || !pageData.html_content) {
      setError('Please generate a page and add a title before saving');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageData),
      });

      if (response.ok) {
        router.push('/admin/pages');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save page');
      }
    } catch (err) {
      setError('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  };

  const examplePrompts = [
    "Create a modern landing page for a SaaS product with hero section, features, pricing, and contact form",
    "Build a portfolio website with a dark theme, project gallery, and contact information",
    "Design a restaurant website with menu, location, hours, and online ordering section",
    "Create a blog homepage with featured posts, categories, and search functionality",
    "Build a corporate about page with team section, company history, and values"
  ];

  return (
    <AdminLayout title="Create New Page">
      <div className="p-6">
        {/* Header with Mode Toggle */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Create New Page</h1>
            <p className="text-slate-400 mt-1">
              {mode === 'ai' ? 'Describe your page and let AI build it for you' : 'Build custom pages with HTML, CSS, and JavaScript'}
            </p>
          </div>
          <div className="flex bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setMode('ai')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'ai' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              🤖 AI Builder
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'manual' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              💻 Manual Code
            </button>
          </div>
        </div>

        {mode === 'ai' ? (
          /* AI Page Builder Interface */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
            {/* Left Panel - Chat Interface */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
                <h3 className="text-lg font-semibold text-slate-200 flex items-center">
                  <span className="mr-2">🤖</span>
                  AI Page Builder
                </h3>
                <p className="text-sm text-slate-400 mt-1">Describe what you want and I'll build it</p>
              </div>

              {/* Chat History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🎨</div>
                    <h3 className="text-lg font-medium text-slate-200 mb-2">Ready to build your page?</h3>
                    <p className="text-slate-400 text-sm mb-6">Try one of these examples or describe your own:</p>
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
                        <span className="text-sm">Generating your page...</span>
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
                    placeholder={chatHistory.length === 0 ? "Describe the page you want to create..." : "How would you like to modify the page?"}
                    className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    disabled={isGenerating}
                  />
                  <button
                    type="submit"
                    disabled={isGenerating || !currentPrompt.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? '⏳' : '🚀'}
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
                      <div className="text-6xl mb-4">📄</div>
                      <h3 className="text-lg font-medium mb-2">No page generated yet</h3>
                      <p className="text-sm">Start by describing your page in the chat</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Manual Code Interface - Your existing form */
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200">Manual Page Configuration</h3>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Your existing manual form fields here - keeping it simple for now */}
                <div className="text-center py-12 text-slate-400">
                  <p>Manual code interface will be available soon.</p>
                  <p className="text-sm mt-2">For now, use the AI Builder to create your pages!</p>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bottom Actions for AI Mode */}
        {mode === 'ai' && (
          <div className="mt-6 space-y-4">
            {/* Page Settings */}
            {currentCode && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Page Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Page Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={pageData.title}
                      onChange={(e) => setPageData(prev => ({ ...prev, title: e.target.value, slug: generateSlug(e.target.value) }))}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      placeholder="Enter page title"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      URL Slug
                    </label>
                    <input
                      type="text"
                      value={pageData.slug}
                      onChange={(e) => setPageData(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      placeholder="page-url-slug"
                    />
                    <p className="text-sm text-slate-400 mt-1">Will be accessible at: /{pageData.slug}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Meta Description
                    </label>
                    <textarea
                      value={pageData.meta_description}
                      onChange={(e) => setPageData(prev => ({ ...prev, meta_description: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      rows={2}
                      placeholder="Brief description for SEO"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={pageData.is_published}
                        onChange={(e) => setPageData(prev => ({ ...prev, is_published: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                      />
                      <span className="text-sm font-medium text-slate-300">Publish immediately</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Access Level
                    </label>
                    <select
                      value={pageData.access_level}
                      onChange={(e) => setPageData(prev => ({ ...prev, access_level: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    >
                      <option value="public">Public - Anyone can view</option>
                      <option value="subscriber">Subscriber - Only logged-in subscribers</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

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
                  disabled={saving || !pageData.title}
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
                      <span>Save Page</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => router.push('/admin/pages')}
                className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}