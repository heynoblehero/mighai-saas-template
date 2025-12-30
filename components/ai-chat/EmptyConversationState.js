import Button from '../ui/Button';

export default function EmptyConversationState({ onNewConversation }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl mb-6">💬</div>
      <h2 className="text-2xl font-bold text-slate-200 mb-2">Welcome to AI Chat</h2>
      <p className="text-slate-400 mb-8 max-w-md">
        Start a conversation with our AI assistant to generate web pages, get help with coding, or explore ideas.
      </p>
      
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 max-w-md w-full">
        <h3 className="font-semibold text-slate-200 mb-3">Try asking:</h3>
        <ul className="text-left text-slate-400 space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">•</span>
            <span>Create a landing page for a SaaS product</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">•</span>
            <span>Design a portfolio website with dark theme</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">•</span>
            <span>Build a dashboard for analytics</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">•</span>
            <span>Generate a blog layout with sidebar</span>
          </li>
        </ul>
      </div>

      <Button
        variant="primary"
        size="lg"
        onClick={onNewConversation}
        className="mt-8 px-8 py-3 text-lg"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }
      >
        Start New Conversation
      </Button>
    </div>
  );
}