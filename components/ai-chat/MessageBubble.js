import { useState } from 'react';

export default function MessageBubble({ message, isGenerating = false }) {
  const [showFullContent, setShowFullContent] = useState(false);

  const isUser = message.role === 'user';
  const isSystem = message.type === 'system';
  const isAssistant = message.role === 'assistant';
  const isError = message.type === 'error';
  const isPlan = message.type === 'plan';

  // Truncate long messages
  const shouldTruncate = message.content && message.content.length > 500;
  const displayContent = shouldTruncate && !showFullContent
    ? message.content.substring(0, 500) + '...'
    : message.content;

  const messageClasses = `
    flex flex-col gap-2 p-4 rounded-2xl max-w-[85%] min-w-[200px] relative
    ${isUser 
      ? 'bg-emerald-600/20 border border-emerald-600/30 self-end ml-auto' 
      : isSystem
        ? 'bg-amber-600/20 border border-amber-600/30 self-center text-center'
        : isError
          ? 'bg-red-600/20 border border-red-600/30'
          : isPlan
            ? 'bg-blue-600/20 border border-blue-600/30'
            : 'bg-slate-700/50 border border-slate-600/50 self-start'
    }
  `;

  const avatar = isUser 
    ? '👤' 
    : isSystem 
      ? '⚙️' 
      : isAssistant 
        ? message.provider === 'claude' ? '⚡' : message.provider === 'gemini' ? '✨' : '🔮'
        : isError 
          ? '❌' 
          : isPlan 
            ? '📋' 
            : '🤖';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={messageClasses}>
        {/* Message header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="text-lg">{avatar}</div>
          <div className="font-medium text-sm">
            {isUser ? 'You' : isSystem ? 'System' : isAssistant ? 'Assistant' : isError ? 'Error' : isPlan ? 'Plan' : 'AI'}
          </div>
          {message.provider && !isUser && !isSystem && !isError && !isPlan && (
            <div className="text-xs bg-slate-800/50 px-2 py-0.5 rounded-full text-slate-400">
              {message.provider}
            </div>
          )}
          {message.timestamp && (
            <div className="text-xs text-slate-500 ml-auto">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {/* Message content */}
        <div className={`text-slate-200 ${isSystem ? 'text-center' : ''}`}>
          {isPlan ? (
            <div className="prose prose-invert max-w-none">
              <h3 className="font-bold text-lg mb-2 text-blue-300">AI Plan</h3>
              <pre className="whitespace-pre-wrap font-sans text-sm">{displayContent}</pre>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">
              {displayContent}
              {shouldTruncate && (
                <button
                  onClick={() => setShowFullContent(!showFullContent)}
                  className="text-emerald-400 hover:text-emerald-300 text-sm mt-1 block"
                >
                  {showFullContent ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Generating indicator */}
        {isGenerating && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-xs text-slate-400">Thinking...</span>
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-600/50">
            <div className="text-xs text-slate-400 mb-2">Attachments:</div>
            <div className="flex flex-wrap gap-2">
              {message.attachments.map((attachment, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-800/50 px-2 py-1 rounded text-xs">
                  <span>📎</span>
                  <span className="truncate max-w-[100px]">{attachment.name || 'File'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}