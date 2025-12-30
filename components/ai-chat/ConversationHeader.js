import { useState } from 'react';
import Button from '../ui/Button';

export default function ConversationHeader({
  conversation,
  onTitleChange,
  onExport,
  onSettingsClick
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(conversation.title || '');

  const handleSaveTitle = () => {
    onTitleChange(title.trim() || 'Untitled Conversation');
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setTitle(conversation.title || '');
    setIsEditingTitle(false);
  };

  return (
    <div className="border-b border-slate-700 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <Button variant="primary" size="sm" onClick={handleSaveTitle}>
                Save
              </Button>
              <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h2
                className="text-lg font-semibold text-slate-200 truncate cursor-pointer hover:text-slate-100"
                onClick={() => setIsEditingTitle(true)}
              >
                {conversation.title || 'Untitled Conversation'}
              </h2>
              {conversation.starred && (
                <span className="text-amber-400">★</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            title="Export conversation"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onSettingsClick}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            title="Settings"
          />
        </div>
      </div>
    </div>
  );
}