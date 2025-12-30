export default function EmptyState({
  icon,
  title,
  description,
  action = null,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {icon && (
        <div className="text-6xl mb-4 opacity-50">
          {icon}
        </div>
      )}
      {title && (
        <h3 className="text-lg font-medium text-slate-300 mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-slate-400 max-w-sm mb-6">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
