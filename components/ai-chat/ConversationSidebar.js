import { useState } from 'react';
import Button from '../ui/Button';

export default function ConversationSidebar({
  conversations = [],
  activeConversationId,
  onConversationSelect,
  onNewConversation,
  onStarConversation,
  onDeleteConversation,
  className = ''
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conv =>
    conv.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.messages?.some(msg =>
      msg.content?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className={`flex flex-col h-full bg-slate-900 border-r border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-200">Conversations</h2>
          <Button
            variant="primary"
            size="sm"
            onClick={onNewConversation}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            New
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <svg className="absolute right-3 top-2.5 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredConversations.length === 0 ? (
          <div className="text-center text-slate-500 p-8">
            <div className="text-2xl mb-2">💬</div>
            <div>No conversations yet</div>
            <div className="text-sm mt-1">Start a new conversation</div>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`
                  group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                  ${activeConversationId === conversation.id
                    ? 'bg-emerald-600/20 border border-emerald-600/30'
                    : 'hover:bg-slate-800/50 border border-transparent'
                  }
                `}
                onClick={() => onConversationSelect(conversation.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-200 truncate">
                    {conversation.title || 'Untitled Conversation'}
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-1">
                    {conversation.messages?.[0]?.content?.substring(0, 60) || 'No messages yet'}...
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {new Date(conversation.metadata?.createdAt || conversation.createdAt || Date.now()).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStarConversation(conversation.id);
                    }}
                    className={`p-1 rounded ${conversation.starred ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'}`}
                    title={conversation.starred ? 'Unstar conversation' : 'Star conversation'}
                  >
                    {conversation.starred ? '★' : '☆'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conversation.id);
                    }}
                    className="p-1 text-slate-500 hover:text-red-400 rounded"
                    title="Delete conversation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}