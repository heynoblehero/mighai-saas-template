import { useState, useRef, useEffect } from 'react';
import Badge from '../ui/Badge';

export default function ModelSelector({
  selectedProvider,
  availableProviders = [],
  onChange,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const providerInfo = {
    claude: {
      name: 'Claude Sonnet 4.5',
      shortName: 'Claude',
      icon: '⚡',
      color: 'purple',
      dotColor: '#8b5cf6'
    },
    gemini: {
      name: 'Gemini 2.0 Flash',
      shortName: 'Gemini',
      icon: '✨',
      color: 'blue',
      dotColor: '#3b82f6'
    },
    openai: {
      name: 'GPT-4o',
      shortName: 'GPT-4o',
      icon: '🔮',
      color: 'primary',
      dotColor: '#10b981'
    },
    'claude-opus': {
      name: 'Claude Opus',
      shortName: 'Claude Opus',
      icon: '⚡',
      color: 'purple',
      dotColor: '#8b5cf6'
    },
    'claude-haiku': {
      name: 'Claude Haiku',
      shortName: 'Claude Haiku',
      icon: '⚡',
      color: 'purple',
      dotColor: '#8b5cf6'
    },
    'gemini-pro': {
      name: 'Gemini Pro',
      shortName: 'Gemini Pro',
      icon: '✨',
      color: 'blue',
      dotColor: '#3b82f6'
    },
    'gpt-4': {
      name: 'GPT-4',
      shortName: 'GPT-4',
      icon: '🔮',
      color: 'primary',
      dotColor: '#10b981'
    },
    'gpt-3.5-turbo': {
      name: 'GPT-3.5 Turbo',
      shortName: 'GPT-3.5',
      icon: '🔮',
      color: 'primary',
      dotColor: '#10b981'
    }
  };

  const currentProvider = providerInfo[selectedProvider] || providerInfo.claude;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-700'}
          bg-slate-800 border border-slate-700 text-slate-200
        `}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: currentProvider.dotColor }}
        />
        <span>{currentProvider.icon} {currentProvider.shortName}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50 animate-fadeIn">
          <div className="py-1">
            {availableProviders.map((provider) => {
              const info = providerInfo[provider];
              if (!info) return null;
              
              const isSelected = provider === selectedProvider;

              return (
                <button
                  key={provider}
                  onClick={() => {
                    onChange(provider);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                    ${isSelected ? 'bg-emerald-600/20 text-emerald-300' : 'text-slate-300 hover:bg-slate-700'}
                  `}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: info.dotColor }}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{info.icon} {info.name}</div>
                    {isSelected && (
                      <div className="text-xs text-emerald-400 mt-0.5">Currently selected</div>
                    )}
                  </div>
                  {isSelected && (
                    <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}