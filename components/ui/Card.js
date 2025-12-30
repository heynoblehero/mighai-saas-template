export default function Card({
  children,
  className = '',
  variant = 'default',
  padding = 'default',
  hover = false
}) {
  const variants = {
    default: 'bg-slate-800 border border-slate-700',
    glass: 'bg-slate-800/50 backdrop-blur-xl border border-slate-700/50',
    gradient: 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700'
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8'
  };

  const hoverEffect = hover ? 'hover:border-slate-600 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200' : '';

  return (
    <div className={`rounded-xl shadow-xl ${variants[variant]} ${paddings[padding]} ${hoverEffect} ${className}`}>
      {children}
    </div>
  );
}
