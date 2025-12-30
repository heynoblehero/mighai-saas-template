import { useState, useRef, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import AIChatContainer from '../../components/ai-chat/AIChatContainer';
import AIKeySetupModal from '../../components/AIKeySetupModal';

export default function AIPageBuilder() {
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [generatedPage, setGeneratedPage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const iframeRef = useRef(null);

  const handlePageGenerated = (pageData) => {
    setGeneratedPage(pageData);
    setIsGenerating(false);
  };

  const handleIframeLoad = () => {
    if (iframeRef.current && generatedPage) {
      const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>${generatedPage.css || ''}</style>
          </head>
          <body>
            ${generatedPage.html || '<p>Generated page will appear here</p>'}
            <script>${generatedPage.js || ''}</script>
          </body>
        </html>
      `);
      iframeDoc.close();
    }
  };

  return (
    <AdminLayout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">AI Page Builder</h1>
              <p className="text-slate-400">Create stunning web pages with AI assistance</p>
            </div>
            <button
              onClick={() => setShowKeySetup(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              AI Settings
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* AI Chat Panel */}
          <div className="w-full lg:w-1/2 h-1/2 lg:h-auto border-r border-slate-700 flex flex-col">
            <AIChatContainer
              onPageGenerated={handlePageGenerated}
              onShowKeySetup={() => setShowKeySetup(true)}
            />
          </div>

          {/* Preview Panel */}
          <div className="w-full lg:w-1/2 h-1/2 lg:h-auto flex flex-col">
            <div className="bg-slate-800 border-b border-slate-700 p-4">
              <h2 className="text-lg font-semibold text-slate-200">Page Preview</h2>
              <p className="text-slate-400 text-sm">Live preview of generated pages</p>
            </div>
            
            <div className="flex-1 bg-slate-900 p-4">
              {generatedPage ? (
                <div className="w-full h-full bg-white rounded-lg overflow-hidden">
                  <iframe
                    ref={iframeRef}
                    title="Generated Page Preview"
                    className="w-full h-full border-0"
                    onLoad={handleIframeLoad}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-lg">
                  <div className="text-center text-slate-500">
                    <div className="text-4xl mb-4">🎨</div>
                    <h3 className="text-lg font-medium mb-2">Page Preview</h3>
                    <p>Generated pages will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Key Setup Modal */}
        <AIKeySetupModal
          isOpen={showKeySetup}
          onClose={() => setShowKeySetup(false)}
          onSave={() => {
            // Handle save if needed
          }}
        />
      </div>
    </AdminLayout>
  );
}