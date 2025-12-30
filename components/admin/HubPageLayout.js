export default function HubPageLayout({
  title,
  description,
  icon,
  actions = null,
  children,
  className = ''
}) {
  return (
    <div className={`hub-page-layout ${className}`}>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && <span className="text-4xl">{icon}</span>}
            <div>
              <h1 className="text-3xl font-bold text-slate-100">{title}</h1>
              {description && (
                <p className="text-slate-400 mt-1">{description}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-3">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Page Content */}
      <div className="hub-page-content">
        {children}
      </div>
    </div>
  );
}
