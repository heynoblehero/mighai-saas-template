export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = ''
}) {
  const variants = {
    default: 'bg-slate-700 text-slate-300',
    primary: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
    success: 'bg-green-600/20 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30',
    danger: 'bg-red-600/20 text-red-400 border border-red-500/30',
    purple: 'bg-purple-600/20 text-purple-400 border border-purple-500/30',
    blue: 'bg-blue-600/20 text-blue-400 border border-blue-500/30',
    pink: 'bg-pink-600/20 text-pink-400 border border-pink-500/30'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  const dotColors = {
    default: 'bg-slate-400',
    primary: 'bg-emerald-400',
    success: 'bg-green-400',
    warning: 'bg-yellow-400',
    danger: 'bg-red-400',
    purple: 'bg-purple-400',
    blue: 'bg-blue-400',
    pink: 'bg-pink-400'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
