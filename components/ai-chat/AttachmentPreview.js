import { useState } from 'react';

export default function AttachmentPreview({ file, extractedText = '', onRemove }) {
  const [showPreview, setShowPreview] = useState(false);

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('csv')) return '📊';
    if (type.includes('json') || type.includes('javascript')) return '📜';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImage = file.type.startsWith('image/');

  return (
    <div className="attachment-preview">
      <div className="flex items-start gap-4">
        {/* Icon or Image Preview */}
        <div className="flex-shrink-0">
          {isImage && file.url ? (
            <img
              src={file.url}
              alt={file.name}
              className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowPreview(true)}
            />
          ) : (
            <div className="w-16 h-16 flex items-center justify-center bg-slate-700 rounded-lg text-3xl">
              {getFileIcon(file.type)}
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-medium text-slate-200 truncate">{file.name}</h4>
            {onRemove && (
              <button
                onClick={onRemove}
                className="flex-shrink-0 text-slate-400 hover:text-red-400 transition-colors p-1"
                title="Remove attachment"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-400 mb-2">
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span className="truncate">{file.type}</span>
          </div>

          {extractedText && (
            <div className="mt-2">
              <p className="text-xs text-slate-500 mb-1">Extracted Text Preview:</p>
              <div className="bg-slate-900/50 rounded-lg p-3 text-xs text-slate-300 max-h-20 overflow-y-auto custom-scrollbar">
                {extractedText.substring(0, 200)}
                {extractedText.length > 200 && '...'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {showPreview && isImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowPreview(false)}
        >
          <img
            src={file.url}
            alt={file.name}
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setShowPreview(false)}
            className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
