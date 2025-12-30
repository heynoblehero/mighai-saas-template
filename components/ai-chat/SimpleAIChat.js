import { useState, useEffect } from 'react';
import ConversationHeader from './ConversationHeader';
import MessageList from './MessageList';
import InputArea from './InputArea';
import apiKeyStorage from '../../utils/apiKeyStorage';
import conversationSync from '../../utils/conversationSync';

export default function SimpleAIChat({
  onPageGenerated,
  onShowKeySetup,
  className = '',
  initialConversationId = null
}) {
  // State
  const [activeConversationId, setActiveConversationId] = useState(initialConversationId);
  const [selectedProvider, setSelectedProvider] = useState('gemini'); // Default to gemini
  const [availableProviders, setAvailableProviders] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentConversation, setCurrentConversation] = useState(null);

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

  const loadConversation = (id) => {
    const conversation = conversationSync.getConversation(id);
    if (conversation) {
      setCurrentConversation(conversation);
      setActiveConversationId(id);
    }
  };

  const createNewConversation = () => {
    const newConversation = conversationSync.createConversation({
      provider: selectedProvider
    });

    setCurrentConversation(newConversation);
    setActiveConversationId(newConversation.id);
  };

  const getActiveConversation = () => {
    if (currentConversation && currentConversation.id === activeConversationId) {
      return currentConversation;
    }
    // Fallback to loading from storage if needed
    return conversationSync.getConversation(activeConversationId);
  };

  const handleNewConversation = () => {
    createNewConversation();
  };

  const handleClearHistory = () => {
    if (activeConversationId) {
      // Create a new conversation with the same provider
      const conv = getActiveConversation();
      const newConversation = conversationSync.createConversation({
        provider: conv?.metadata?.provider || selectedProvider,
        title: 'New Conversation'
      });

      setCurrentConversation(newConversation);
      setActiveConversationId(newConversation.id);
    }
  };

  const handleTitleChange = (newTitle) => {
    if (!activeConversationId) return;

    conversationSync.updateConversationTitle(activeConversationId, newTitle);
    // Update local state
    setCurrentConversation(prev => ({
      ...prev,
      title: newTitle
    }));
  };

  const handleExportConversation = () => {
    const conversation = getActiveConversation();
    if (!conversation) return;

    const dataStr = JSON.stringify(conversation, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `conversation-${conversation.id}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleProviderChange = (newProvider) => {
    setSelectedProvider(newProvider);
    apiKeyStorage.savePreferredProvider(newProvider);

    // Add system message
    if (activeConversationId) {
      const systemMessage = {
        id: `msg_${Date.now()}`,
        type: 'system',
        content: `🔄 Switched to ${apiKeyStorage.getProviderDisplayName(newProvider)}`,
        timestamp: new Date().toISOString()
      };

      conversationSync.addMessage(activeConversationId, systemMessage);
      // Update local state
      setCurrentConversation(prev => ({
        ...prev,
        messages: [...(prev?.messages || []), systemMessage]
      }));
    }
  };

  const handleSendMessage = async ({ content, attachments = [] }) => {
    if (!content.trim() && attachments.length === 0) return;

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
      const apiKey = apiKeyStorage.getProviderKey(selectedProvider);

      // Check if API key is configured
      if (!apiKey) {
        const errorMessage = {
          id: `msg_${Date.now()}_error`,
          type: 'error',
          content: 'Error: No API key configured. Please set up your API key in the settings.',
          timestamp: new Date().toISOString()
        };
        conversationSync.addMessage(conversationId, errorMessage);
        // Update local state
        setCurrentConversation(prev => ({
          ...prev,
          messages: [...(prev?.messages || []), errorMessage]
        }));
        setIsGenerating(false);

        // Show the key setup modal
        onShowKeySetup?.();
        return;
      }

      // Determine which endpoint to use based on whether user has provided an API key
      const hasUserKey = !!apiKey;
      const endpoint = hasUserKey
        ? '/api/ai/forward-request'
        : '/api/ai/generate-comprehensive-page';

      const requestBody = {
        userPrompt: content,
        provider: selectedProvider,
        conversationHistory: getActiveConversation()?.messages || [],
        conversationId: activeConversationId
      };

      // Only include user API key if available
      if (hasUserKey) {
        requestBody.userApiKey = apiKey;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (data.success) {
        // Add plan message
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
          content: 'Page generated successfully! Preview on the right.',
          provider: selectedProvider,
          timestamp: new Date().toISOString(),
          metadata: {
            html: data.html_code,
            css: data.css_code,
            js: data.js_code
          }
        };
        conversationSync.addMessage(activeConversationId, aiMessage);

        // Update conversation title if it's the first message
        const conv = getActiveConversation();
        if (!conv?.title || conv.title === 'Untitled Conversation') {
          const title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
          conversationSync.updateConversationTitle(activeConversationId, title);
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
          messages: [...(prev?.messages || []), ...(data.plan ? [{...planMessage}] : []), aiMessage]
        }));
      } else if (data.needsKeyReconfiguration) {
        // API key is invalid - prompt user to reconfigure
        onShowKeySetup?.();
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
    }
  };

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
          <button
            onClick={handleNewConversation}
            className="px-3 py-1.5 text-xs bg-slate-700 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-600 transition-colors flex items-center space-x-1"
            title="Start new conversation"
          >
            <span>🆕</span>
            <span>New</span>
          </button>

          <button
            onClick={handleClearHistory}
            className="px-3 py-1.5 text-xs bg-rose-700/20 text-rose-300 border border-rose-600/30 rounded-lg hover:bg-rose-700/30 transition-colors flex items-center space-x-1"
            title="Clear conversation history"
          >
            <span>🗑️</span>
            <span>Clear</span>
          </button>

          <button
            onClick={onShowKeySetup}
            className="px-3 py-1.5 text-xs bg-slate-700 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-600 transition-colors flex items-center space-x-1"
            title="AI Settings"
          >
            <span>⚙️</span>
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden bg-slate-800/50">
        <MessageList
          messages={activeConversation?.messages || []}
          isGenerating={isGenerating}
          className="h-full"
        />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 p-4 bg-slate-800">
        <InputArea
          onSendMessage={handleSendMessage}
          selectedProvider={selectedProvider}
          availableProviders={availableProviders}
          onProviderChange={handleProviderChange}
          disabled={isGenerating || availableProviders.length === 0}
          placeholder={
            availableProviders.length === 0
              ? 'Please configure API keys first...'
              : 'Describe your page in detail...'
          }
        />
      </div>
    </div>
  );
}