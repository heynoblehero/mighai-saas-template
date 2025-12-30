import { useState, useRef, useEffect } from 'react';
import SimpleAIChat from './ai-chat/SimpleAIChat';
import AIKeySetupModal from './AIKeySetupModal';
import apiKeyStorage from '../utils/apiKeyStorage';

export default function AIPageBuilder({
  onPageGenerated,
  initialPageData = null,
  mode = 'page', // 'page' for regular pages, 'reserved' for reserved pages
  pageType = null,
  onShowKeySetup: onShowKeySetupProp
}) {
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [generatedPage, setGeneratedPage] = useState(initialPageData || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [currentCode, setCurrentCode] = useState(initialPageData?.html_content || '');
  const [viewMode, setViewMode] = useState('preview'); // 'preview' or 'code'
  const [error, setError] = useState('');
  const iframeRef = useRef(null);

  // Handle page generation from AI chat
  const handlePageGenerated = (pageData) => {
    setGeneratedPage(pageData);
    setCurrentCode(pageData.html || pageData.html_content || '');
    setPreviewKey(prev => prev + 1);
    setIsGenerating(false);

    // Notify parent component
    if (onPageGenerated) {
      onPageGenerated(pageData);
    }
  };

  const handleIframeLoad = () => {
    if (iframeRef.current && currentCode) {
      const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>${generatedPage?.css_content || ''}</style>
          </head>
          <body>
            ${currentCode}
            <script>${generatedPage?.js_content || ''}</script>
          </body>
        </html>
      `);
      iframeDoc.close();
    }
  };

  // Handle code changes (for manual editing)
  const handleCodeChange = (newCode) => {
    setCurrentCode(newCode);
    setPreviewKey(prev => prev + 1);
  };

  // Show key setup modal
  const handleShowKeySetup = () => {
    setShowKeySetup(true);
    if (onShowKeySetupProp) {
      onShowKeySetupProp();
    }
  };

  // Save current page data
  const savePage = async (pageData) => {
    // This would be implemented based on the specific requirements
    // For now, just update the state
    setGeneratedPage(pageData);
    setCurrentCode(pageData.html_content || pageData.html || '');
    setPreviewKey(prev => prev + 1);
  };

  return (
    <div className="h-full flex flex-col bg-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-slate-800">
        {/* AI Chat Panel - Always visible */}
        <div className="w-full lg:w-1/2 h-1/2 lg:h-auto border-r border-slate-700 flex flex-col bg-slate-900/50">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <div className="bg-emerald-500/10 p-2 rounded-lg">
                    <span className="text-emerald-400 text-lg">🤖</span>
                  </div>
                  <h1 className="text-xl font-bold text-slate-100">
                    {mode === 'reserved' ? `${pageType || 'Reserved Page'} Customizer` : 'AI Page Builder'}
                  </h1>
                </div>
                <p className="text-slate-400 text-sm ml-12">Describe your page and AI will generate it</p>
              </div>
              <button
                onClick={handleShowKeySetup}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-emerald-500/20 flex items-center space-x-2"
              >
                <span>⚙️</span>
                <span>AI Settings</span>
              </button>
            </div>
          </div>
          <SimpleAIChat
            onPageGenerated={handlePageGenerated}
            onShowKeySetup={handleShowKeySetup}
            className="flex-1"
          />
        </div>

        {/* Preview Panel */}
        <div className="w-full lg:w-1/2 h-1/2 lg:h-auto flex flex-col bg-slate-900/30">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center">
                <span className="mr-3 text-xl">{viewMode === 'preview' ? '👁️' : '💻'}</span>
                <span className="text-slate-100">{viewMode === 'preview' ? 'Page Preview' : 'Code Editor'}</span>
              </h2>
              <div className="flex bg-slate-700/50 backdrop-blur-sm rounded-xl p-1 border border-slate-600">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === 'preview'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-600/50'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === 'code'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-600/50'
                  }`}
                >
                  Code
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-gradient-to-b from-slate-900/50 to-slate-800 p-4">
            {viewMode === 'preview' ? (
              <div className="w-full h-full bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200/50">
                {currentCode ? (
                  <iframe
                    ref={iframeRef}
                    title="Generated Page Preview"
                    className="w-full h-full border-0 rounded-xl"
                    onLoad={handleIframeLoad}
                    srcDoc={currentCode}
                    sandbox="allow-scripts allow-forms allow-modals"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800/30 to-slate-900/30 border-2 border-dashed border-slate-600/50 rounded-xl">
                    <div className="text-center text-slate-500 p-8 max-w-md">
                      <div className="text-7xl mb-6">🎨</div>
                      <h3 className="text-2xl font-bold mb-3 text-slate-300">Page Preview</h3>
                      <p className="text-slate-400 text-lg mb-2">AI-generated pages will appear here</p>
                      <p className="text-slate-500 text-base">Start describing your page in the AI chat to see results</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700/50 shadow-inner">
                {currentCode ? (
                  <textarea
                    value={currentCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className="w-full h-full px-5 py-4 bg-slate-900/80 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors font-mono text-sm resize-none border-0 font-mono"
                    placeholder="HTML code will appear here..."
                    spellCheck="false"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8">
                    <div className="text-center text-slate-400 max-w-md">
                      <div className="text-7xl mb-6">💻</div>
                      <h3 className="text-2xl font-bold mb-3 text-slate-300">Code Editor</h3>
                      <p className="text-slate-500 text-lg mb-2">Generated code will appear here</p>
                      <p className="text-slate-500 text-base">The AI will generate HTML, CSS, and JavaScript for your page</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-600/40 text-red-200 px-6 py-4 rounded-xl m-4 backdrop-blur-sm">
          <div className="flex items-center">
            <span className="text-xl mr-3">⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* AI Key Setup Modal */}
      <AIKeySetupModal
        isOpen={showKeySetup}
        onClose={() => setShowKeySetup(false)}
        onSave={() => {
          // Handle save if needed
        }}
      />
    </div>
  );
}