export default function ConversationItem({ conversation, isActive, onClick, onStar, onDelete }) {
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPreviewText = () => {
    if (!conversation.messages || conversation.messages.length === 0) {
      return 'No messages yet';
    }
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const text = lastMessage.content || '';
    return text.length > 60 ? text.substring(0, 60) + '...' : text;
  };

  return (
    <div
      className={`conversation-item ${isActive ? 'conversation-item-active' : ''} ${
        conversation.metadata?.starred ? 'conversation-item-starred' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="font-medium text-slate-200 truncate flex-1">
          {conversation.title || 'Untitled Conversation'}
        </h4>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Star Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStar?.(conversation.id);
            }}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title={conversation.metadata?.starred ? 'Unstar' : 'Star'}
          >
            <span className="text-sm">
              {conversation.metadata?.starred ? '⭐' : '☆'}
            </span>
          </button>

          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this conversation?')) {
                onDelete?.(conversation.id);
              }
            }}
            className="p-1 hover:bg-red-600/20 hover:text-red-400 rounded transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Preview Text */}
      <p className="text-sm text-slate-400 truncate mb-1">{getPreviewText()}</p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{formatTimestamp(conversation.metadata?.lastUpdated || conversation.metadata?.createdAt)}</span>
        {conversation.metadata?.totalMessages > 0 && (
          <span>{conversation.metadata.totalMessages} messages</span>
        )}
      </div>

      {/* Provider Badge */}
      {conversation.metadata?.provider && (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-400">
            {conversation.metadata.provider === 'claude' && '⚡ Claude'}
            {conversation.metadata.provider === 'gemini' && '✨ Gemini'}
            {conversation.metadata.provider === 'openai' && '🔮 OpenAI'}
          </span>
        </div>
      )}
    </div>
  );
}
