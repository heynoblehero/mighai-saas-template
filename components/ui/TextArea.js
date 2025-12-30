import { useEffect, useRef } from 'react';

export default function TextArea({
  value,
  onChange,
  placeholder = '',
  disabled = false,
  error = '',
  label = '',
  rows = 3,
  maxRows = 10,
  autoResize = false,
  className = '',
  ...props
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (autoResize && textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';

      // Calculate new height
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = parseInt(window.getComputedStyle(textareaRef.current).lineHeight);
      const maxHeight = lineHeight * maxRows;

      // Set new height (capped at maxRows)
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  }, [value, autoResize, maxRows]);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {label}
        </label>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={autoResize ? rows : rows}
        className={`
          block w-full rounded-lg bg-slate-800 border text-slate-200 placeholder-slate-500
          focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200 resize-none
          px-4 py-2.5
          ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-700'}
          ${autoResize ? 'overflow-hidden' : 'overflow-y-auto'}
        `}
        style={autoResize ? { minHeight: `${rows * 1.5}rem` } : {}}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
