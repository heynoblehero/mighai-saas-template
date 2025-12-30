import MessageBubble from './MessageBubble';

export default function MessageList({ messages = [], isGenerating = false, className = '' }) {
  if (messages.length === 0) {
    return (
      <div className={`flex-1 flex items-center justify-center ${className}`}>
        <div className="text-center text-slate-500">
          <div className="text-4xl mb-2">💬</div>
          <div className="text-lg font-medium">No messages yet</div>
          <div className="text-sm">Send a message to start the conversation</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${className}`}>
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id || index}
          message={message}
          isGenerating={isGenerating && index === messages.length - 1}
        />
      ))}
      
      {/* Scroll to bottom button */}
      <div className="sticky bottom-4 flex justify-center">
        <button className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-2 rounded-full shadow-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </div>
    </div>
  );
}