export default function AttachmentChip({ file, onRemove, className = '' }) {
  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('csv')) return '📊';
    if (type.includes('json') || type.includes('javascript')) return '📜';
    if (type.includes('text') || type.includes('plain')) return '📄';
    if (type.includes('html')) return '🌐';
    if (type.includes('css')) return '🎨';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={`
      flex items-center gap-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg
      ${className}
    `}>
      <span className="text-lg">{getFileIcon(file.type)}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-200 truncate max-w-[120px]">{file.name}</div>
        <div className="text-xs text-slate-400">{formatFileSize(file.size)}</div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-slate-400 hover:text-red-400 transition-colors p-1"
          title="Remove file"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}