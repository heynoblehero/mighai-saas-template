export default function Spinner({ size = 'md', color = 'emerald', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4'
  };

  const colors = {
    emerald: 'border-emerald-600 border-t-transparent',
    purple: 'border-purple-600 border-t-transparent',
    blue: 'border-blue-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    slate: 'border-slate-600 border-t-transparent'
  };

  return (
    <div className={`${sizes[size]} ${colors[color]} rounded-full animate-spin ${className}`} />
  );
}
