import { useState, useEffect } from 'react';
import ConversationSidebar from './ConversationSidebar';
import ConversationHeader from './ConversationHeader';
import MessageList from './MessageList';
import InputArea from './InputArea';
import EmptyConversationState from './EmptyConversationState';
import apiKeyStorage from '../../utils/apiKeyStorage';
import conversationSync from '../../utils/conversationSync';

export default function AIChatContainer({
  onPageGenerated,
  onShowKeySetup,
  className = ''
}) {
  // State
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('claude');
  const [availableProviders, setAvailableProviders] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Load API keys and conversations on mount
  useEffect(() => {
    loadAPIKeys();
    loadConversations();
  }, []);

  const loadAPIKeys = () => {
    const keys = apiKeyStorage.getKeys();
    const configured = apiKeyStorage.getConfiguredProviders();
    setAvailableProviders(configured);

    if (configured.length > 0) {
      const preferred = apiKeyStorage.getPreferredProvider();
      setSelectedProvider(preferred || configured[0]);
    }
  };

  const loadConversations = () => {
    const loaded = conversationSync.getAllConversations();
    setConversations(loaded);

    // Auto-select the most recent conversation
    if (loaded.length > 0 && !activeConversationId) {
      const sorted = [...loaded].sort((a, b) => {
        const timeA = new Date(b.metadata?.lastUpdated || b.metadata?.createdAt || 0);
        const timeB = new Date(a.metadata?.lastUpdated || a.metadata?.createdAt || 0);
        return timeA - timeB;
      });
      setActiveConversationId(sorted[0].id);
    }
  };

  const getActiveConversation = () => {
    return conversations.find((c) => c.id === activeConversationId);
  };

  const handleNewConversation = () => {
    const newConversation = conversationSync.createConversation({
      provider: selectedProvider
    });

    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    setIsMobileSidebarOpen(false);
  };

  const handleConversationSelect = (id) => {
    setActiveConversationId(id);
    setIsMobileSidebarOpen(false);
  };

  const handleStarConversation = (id) => {
    conversationSync.toggleStar(id);
    loadConversations();
  };

  const handleDeleteConversation = (id) => {
    conversationSync.deleteConversation(id);
    loadConversations();

    if (id === activeConversationId) {
      setActiveConversationId(null);
    }
  };

  const handleTitleChange = (newTitle) => {
    if (!activeConversationId) return;

    conversationSync.updateConversationTitle(activeConversationId, newTitle);
    loadConversations();
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
      loadConversations();
    }
  };

  const handleSendMessage = async ({ content, attachments = [] }) => {
    if (!content.trim() && attachments.length === 0) return;

    // Create or use active conversation
    let conversationId = activeConversationId;
    if (!conversationId) {
      const newConv = conversationSync.createConversation({ provider: selectedProvider });
      setConversations((prev) => [newConv, ...prev]);
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
    loadConversations();

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
        loadConversations();
        setIsGenerating(false);
        return;
      }

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
          conversationHistory: getActiveConversation()?.messages || []
        })
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

        loadConversations();
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
        loadConversations();
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
      conversationSync.addMessage(conversationId, errorMessage);
      loadConversations();
    } finally {
      setIsGenerating(false);
    }
  };

  const activeConversation = getActiveConversation();

  return (
    <div className={`flex h-full ${className}`}>
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-slate-800 rounded-lg border border-slate-700 shadow-lg"
      >
        <svg className="w-6 h-6 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Conversation Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-30 w-64 lg:w-80
        transform transition-transform duration-300 ease-in-out
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          onStarConversation={handleStarConversation}
          onDeleteConversation={handleDeleteConversation}
          className="h-full bg-slate-900 border-r border-slate-700"
        />
      </div>

      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-800">
        {activeConversation ? (
          <>
            {/* Header */}
            <ConversationHeader
              conversation={activeConversation}
              onTitleChange={handleTitleChange}
              onExport={handleExportConversation}
              onSettingsClick={onShowKeySetup}
            />

            {/* Messages */}
            <MessageList
              messages={activeConversation.messages || []}
              isGenerating={isGenerating}
              className="flex-1"
            />

            {/* Input */}
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
          </>
        ) : (
          <EmptyConversationState onNewConversation={handleNewConversation} />
        )}
      </div>
    </div>
  );
}