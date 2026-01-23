import HelpIcon from './HelpIcon';

export default function Input({
  type = 'text',
  value,
  onChange,
  placeholder = '',
  disabled = false,
  error = '',
  label = '',
  icon = null,
  className = '',
  helpText = '',
  maxLength,
  showCounter = false,
  required = false,
  success = false,
  ...props
}) {
  const charCount = typeof value === 'string' ? value.length : 0;
  const isNearLimit = maxLength && charCount >= maxLength * 0.8;
  const isAtLimit = maxLength && charCount >= maxLength;

  const handleChange = (e) => {
    if (maxLength && e.target.value.length > maxLength) {
      return;
    }
    onChange?.(e);
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-sm font-medium text-slate-300">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
          {helpText && <HelpIcon content={helpText} size="sm" />}
        </div>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={`
            block w-full rounded-lg bg-slate-800 border text-slate-200 placeholder-slate-500
            focus:outline-none focus:ring-2 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            ${icon ? 'pl-10' : 'px-4'} ${success || error ? 'pr-10' : 'pr-4'} py-2.5
            ${error
              ? 'border-red-500 focus:ring-red-500'
              : success
                ? 'border-emerald-500 focus:ring-emerald-500'
                : 'border-slate-700 focus:ring-emerald-500'}
          `}
          {...props}
        />
        {/* Success/Error indicator */}
        {(success || error) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {success && !error && (
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {error && (
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-between items-start mt-1.5">
        <div className="flex-1">
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>
        {showCounter && maxLength && (
          <p className={`text-xs ml-2 ${
            isAtLimit
              ? 'text-red-400'
              : isNearLimit
                ? 'text-yellow-400'
                : 'text-slate-500'
          }`}>
            {charCount}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}
