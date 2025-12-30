import { useState, useRef, useEffect } from 'react';
import AIKeySetupModal from './AIKeySetupModal';
import apiKeyStorage from '../../utils/apiKeyStorage';
import conversationSync from '../../utils/conversationSync';

/**
 * AI Chat Container with model selection, API key management, and image attachment
 */
export default function AIChatContainer({ 
  onPageGenerated, 
  onShowKeySetup,
  className = '',
  initialConversationId = null
}) {
  const [activeConversationId, setActiveConversationId] = useState(initialConversationId);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [availableProviders, setAvailableProviders] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [attachedImages, setAttachedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const chatEndRef = useRef(null);

  // Load API keys and conversations on mount
  useEffect(() => {
    loadAPIKeys();
    if (initialConversationId) {
      loadConversation(initialConversationId);
    } else {
      // Create a new conversation if none provided
      createNewConversation();
    }
  }, [initialConversationId]);

  const loadAPIKeys = () => {
    const keys = apiKeyStorage.getKeys();
    const configured = apiKeyStorage.getConfiguredProviders();
    setAvailableProviders(configured);

    if (configured.length > 0) {
      const preferred = apiKeyStorage.getPreferredProvider();
      setSelectedProvider(preferred || configured[0]);
    }
  };

  const createNewConversation = () => {
    const newConversation = conversationSync.createConversation({ provider: selectedProvider });
    setCurrentConversation(newConversation);
    setActiveConversationId(newConversation.id);
  };

  const loadConversation = (id) => {
    const conversation = conversationSync.getConversation(id);
    if (conversation) {
      setCurrentConversation(conversation);
      setActiveConversationId(id);
    }
  };

  const getActiveConversation = () => {
    if (currentConversation && currentConversation.id === activeConversationId) {
      return currentConversation;
    }
    // Fallback to loading from storage if needed
    return conversationSync.getConversation(activeConversationId);
  };

  const handleSendMessage = async (content, attachments = []) => {
    if (!content.trim() && attachments.length === 0) return;

    // Check if API key is configured for selected provider
    const apiKey = apiKeyStorage.getProviderKey(selectedProvider);
    if (!apiKey) {
      setShowKeySetup(true);
      return;
    }

    // Create or use active conversation
    let conversationId = activeConversationId;
    if (!conversationId) {
      const newConv = conversationSync.createConversation({ provider: selectedProvider });
      setCurrentConversation(newConv);
      conversationId = newConv.id;
      setActiveConversationId(conversationId);
    }

    // Add user message
    const userMessage = {
      id: `msg_${Date.now()}`,
      type: 'user',
      role: 'user',
      content,
      attachments,
      timestamp: new Date().toISOString()
    };

    conversationSync.addMessage(conversationId, userMessage);
    // Update local state
    setCurrentConversation(prev => ({
      ...prev,
      messages: [...(prev?.messages || []), userMessage]
    }));

    // Generate AI response
    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/generate-comprehensive-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: content,
          provider: selectedProvider,
          userApiKey: apiKey,
          attachments: attachments.map(a => ({
            type: a.type,
            text: a.extractedText || '',
            url: a.url
          })),
          conversationHistory: getActiveConversation()?.messages || [],
          conversationId: activeConversationId
        })
      });

      const data = await response.json();

      if (data.success) {
        // Add plan message if available
        if (data.plan) {
          const planMessage = {
            id: `msg_${Date.now()}_plan`,
            type: 'plan',
            content: data.plan,
            timestamp: new Date().toISOString()
          };
          conversationSync.addMessage(conversationId, planMessage);
        }

        // Add AI response
        const aiMessage = {
          id: `msg_${Date.now()}_ai`,
          type: 'assistant',
          role: 'assistant',
          content: data.message || 'Page generated successfully! Preview on the right.',
          provider: selectedProvider,
          timestamp: new Date().toISOString(),
          metadata: {
            html: data.html_code,
            css: data.css_code,
            js: data.js_code
          }
        };
        conversationSync.addMessage(conversationId, aiMessage);

        // Update conversation title if it's the first message
        const conv = getActiveConversation();
        if (!conv?.title || conv.title === 'Untitled Conversation') {
          const title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
          conversationSync.updateConversationTitle(conversationId, title);
        }

        // Notify parent about generated page
        onPageGenerated?.({
          html: data.html_code,
          css: data.css_code,
          js: data.js_code
        });

        // Update local state
        setCurrentConversation(prev => ({
          ...prev,
          messages: [...(prev?.messages || []), ...(data.plan ? [planMessage] : []), aiMessage]
        }));
      } else if (data.needsKeyReconfiguration) {
        // API key is invalid - prompt user to reconfigure
        setShowKeySetup(true);
        const errorMessage = {
          id: `msg_${Date.now()}_error`,
          type: 'error',
          content: `Error: ${data.details || 'Your API key is invalid. Please update it in settings.'}`,
          timestamp: new Date().toISOString()
        };
        conversationSync.addMessage(conversationId, errorMessage);
        // Update local state
        setCurrentConversation(prev => ({
          ...prev,
          messages: [...(prev?.messages || []), errorMessage]
        }));
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation error:', error);

      const errorMessage = {
        id: `msg_${Date.now()}_error`,
        type: 'error',
        content: `Error: ${error.message || 'Failed to generate page'}`,
        timestamp: new Date().toISOString()
      };
      conversationSync.addMessage(activeConversationId, errorMessage);
      // Update local state
      setCurrentConversation(prev => ({
        ...prev,
        messages: [...(prev?.messages || []), errorMessage]
      }));
    } finally {
      setIsGenerating(false);
      setChatInput('');
      setAttachedImages([]);
      setImagePreviews([]);
    }
  };

  const handleImageAttach = (e) => {
    const files = Array.from(e.target.files);
    const newImages = [];
    const newPreviews = [];

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          newPreviews.push({
            id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            file,
            preview: event.target.result
          });

          if (newPreviews.length === files.length) {
            setAttachedImages(prev => [...prev, ...newImages]);
            setImagePreviews(prev => [...prev, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleRemoveImage = (imageId) => {
    setImagePreviews(prev => prev.filter(img => img.id !== imageId));
    setAttachedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (chatInput.trim() || attachedImages.length > 0) {
      handleSendMessage(chatInput, attachedImages);
    }
  };

  // Scroll to bottom of chat when new messages are added
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [getActiveConversation()?.messages]);

  const activeConversation = getActiveConversation();

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with controls */}
      <div className="bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500/10 p-2 rounded-lg">
            <span className="text-emerald-400 text-lg">🤖</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-200">AI Assistant</h3>
            <p className="text-xs text-slate-400">Powered by {apiKeyStorage.getProviderDisplayName(selectedProvider)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-3 py-1.5 bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {apiKeyStorage.getConfiguredProviders().map(provider => (
              <option key={provider} value={provider}>
                {apiKeyStorage.getProviderDisplayName(provider)}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => setShowKeySetup(true)}
            className="px-3 py-1.5 bg-slate-700 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-600 transition-colors text-sm flex items-center space-x-1"
            title="AI Settings"
          >
            <span>⚙️</span>
            <span>Keys</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-800/50">
        {activeConversation?.messages?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
            <div className="text-5xl mb-4">🤖</div>
            <h3 className="text-xl font-medium mb-2 text-slate-300">AI Assistant</h3>
            <p className="text-slate-500">Start a conversation to generate pages with AI assistance</p>
          </div>
        ) : (
          activeConversation?.messages?.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg p-4 ${
                message.type === 'user' 
                  ? 'bg-emerald-600/20 border border-emerald-600/30 text-slate-200' 
                  : message.type === 'error'
                  ? 'bg-red-900/20 border border-red-600/30 text-red-300'
                  : message.type === 'plan'
                  ? 'bg-blue-900/20 border border-blue-600/30 text-blue-300'
                  : 'bg-slate-700/50 border border-slate-600 text-slate-200'
              }`}>
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.attachments.map((attachment, idx) => (
                      <div key={idx} className="bg-slate-600/50 rounded p-2 text-xs">
                        📷 {attachment.file?.name || 'Image attached'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
                <span className="text-slate-300">Generating page...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Image Previews */}
      {imagePreviews.length > 0 && (
        <div className="border-t border-slate-700 p-3 bg-slate-800/50">
          <div className="flex flex-wrap gap-2">
            {imagePreviews.map((preview) => (
              <div key={preview.id} className="relative group">
                <img
                  src={preview.preview}
                  alt="Attachment preview"
                  className="w-16 h-16 object-cover rounded border border-slate-600"
                />
                <button
                  onClick={() => handleRemoveImage(preview.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-slate-700 hover:bg-slate-600 border border-slate-500"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-slate-700 p-4 bg-slate-800">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Attach Image Button */}
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer text-slate-400 hover:text-slate-300 transition-colors">
              <span className="text-lg">📎</span>
              <span className="text-sm">Attach image</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageAttach}
                className="hidden"
              />
            </label>
          </div>

          {/* Text Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Describe your page in detail..."
              className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              disabled={isGenerating}
              autoFocus
            />
            <button
              type="submit"
              disabled={isGenerating || (!chatInput.trim() && attachedImages.length === 0)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isGenerating ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </span>
              ) : (
                <span>Send</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* API Key Setup Modal */}
      <AIKeySetupModal
        isOpen={showKeySetup}
        onClose={() => setShowKeySetup(false)}
        onSave={() => {
          loadAPIKeys(); // Reload available providers
          setShowKeySetup(false);
        }}
      />
    </div>
  );
}