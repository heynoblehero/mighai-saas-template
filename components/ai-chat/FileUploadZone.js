import { useRef, useState } from 'react';

export default function FileUploadZone({ onFilesSelected, disabled = false, className = '' }) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const acceptedTypes = {
    // Images
    'image/jpeg': '.jpg,.jpeg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    // Documents
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt',
    'text/markdown': '.md',
    // Spreadsheets
    'text/csv': '.csv',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    // Code
    'text/javascript': '.js',
    'text/jsx': '.jsx',
    'text/typescript': '.ts',
    'text/tsx': '.tsx',
    'application/json': '.json',
    'text/html': '.html',
    'text/css': '.css'
  };

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const validateFiles = (files) => {
    const validFiles = [];
    const errors = [];

    Array.from(files).forEach((file) => {
      // Check file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: File size exceeds 10MB`);
        return;
      }

      // Check file type
      const isValidType = Object.keys(acceptedTypes).includes(file.type) ||
        file.name.match(/\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|txt|md|csv|xls|xlsx|js|jsx|ts|tsx|json|html|css)$/i);

      if (!isValidType) {
        errors.push(`${file.name}: File type not supported`);
        return;
      }

      validFiles.push(file);
    });

    return { validFiles, errors };
  };

  const handleFiles = (files) => {
    const { validFiles, errors } = validateFiles(files);

    if (errors.length > 0) {
      alert('Some files could not be uploaded:\n\n' + errors.join('\n'));
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={Object.values(acceptedTypes).join(',')}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${className}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-emerald-500 hover:bg-emerald-500/5'}
          ${isDragging ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02]' : 'border-slate-700'}
        `}
      >
        <div className="flex flex-col items-center gap-3">
          {/* Icon */}
          <div className={`text-5xl transition-transform ${isDragging ? 'scale-110' : ''}`}>
            {isDragging ? '📥' : '📎'}
          </div>

          {/* Text */}
          <div>
            <p className="text-base font-medium text-slate-300 mb-1">
              {isDragging ? 'Drop files here' : 'Upload reference files'}
            </p>
            <p className="text-sm text-slate-400">
              Click to browse or drag and drop
            </p>
          </div>

          {/* Supported Types */}
          <div className="mt-2">
            <p className="text-xs text-slate-500 mb-2">Supported formats:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">Images</span>
              <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">PDF</span>
              <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">Docs</span>
              <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">CSV</span>
              <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">Code</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Max 10MB per file</p>
          </div>
        </div>
      </div>
    </>
  );
}
