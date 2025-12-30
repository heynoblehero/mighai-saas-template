import { useState, useRef } from 'react';
import TextArea from '../ui/TextArea';
import Button from '../ui/Button';
import ModelSelector from './ModelSelector';
import AttachmentChip from './AttachmentChip';

export default function InputArea({
  onSendMessage,
  selectedProvider,
  availableProviders,
  onProviderChange,
  disabled = false,
  placeholder = 'Describe your page in detail...',
  className = ''
}) {
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSend = () => {
    if (!message.trim() && attachedFiles.length === 0) return;

    onSendMessage({
      content: message.trim(),
      attachments: attachedFiles
    });

    // Clear input
    setMessage('');
    setAttachedFiles([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadedFiles = [];

      for (const file of files) {
        // Create FormData
        const formData = new FormData();
        formData.append('file', file);

        // Upload file
        const response = await fetch('/api/upload-chat-file', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          uploadedFiles.push({
            id: data.id,
            name: file.name,
            type: file.type,
            size: file.size,
            url: data.url,
            extractedText: data.extractedText || ''
          });
        } else {
          console.error(`Failed to upload ${file.name}`);
        }
      }

      setAttachedFiles((prev) => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={`border-t border-slate-700 bg-slate-900/50 backdrop-blur-sm ${className}`}>
      {/* Attached Files */}
      {attachedFiles.length > 0 && (
        <div className="px-6 py-3 border-b border-slate-700 bg-slate-800/50">
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <AttachmentChip
                key={`${file.id || index}`}
                file={file}
                onRemove={() => removeAttachment(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-6 py-4">
        <div className="flex items-end gap-3">
          {/* Text Input */}
          <div className="flex-1">
            <TextArea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isUploading}
              autoResize
              rows={1}
              maxRows={6}
              className="w-full bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500"
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-shrink-0 pb-2">
            {/* File Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx,.js,.jsx,.ts,.tsx,.json,.html,.css"
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled || isUploading}
            />
            <Button
              variant="ghost"
              size="md"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              icon={
                isUploading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                )
              }
              title="Upload files"
            />

            {/* Model Selector */}
            <ModelSelector
              selectedProvider={selectedProvider}
              availableProviders={availableProviders}
              onChange={onProviderChange}
              disabled={disabled}
            />

            {/* Send Button */}
            <Button
              variant="primary"
              size="md"
              onClick={handleSend}
              disabled={disabled || isUploading || (!message.trim() && attachedFiles.length === 0)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              }
            >
              Send
            </Button>
          </div>
        </div>

        {/* Hint */}
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">Enter</kbd> to send,
            <kbd className="ml-1 px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">Shift+Enter</kbd> for new line
          </span>
          <span className="text-slate-600">
            {message.length} / 4000
          </span>
        </div>
      </div>
    </div>
  );
}