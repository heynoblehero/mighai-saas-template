import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function TabNavigation({ tabs, defaultTab = 0, className = '' }) {
  const router = useRouter();
  const tabFromUrl = parseInt(router.query.tab) || defaultTab;
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Sync with URL changes
  useEffect(() => {
    const tabFromQuery = parseInt(router.query.tab);
    if (!isNaN(tabFromQuery) && tabFromQuery !== activeTab) {
      setActiveTab(tabFromQuery);
    }
  }, [router.query.tab]);

  const handleTabChange = (index) => {
    setActiveTab(index);

    // Update URL with shallow routing (no page reload)
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, tab: index }
      },
      undefined,
      { shallow: true }
    );
  };

  if (!tabs || tabs.length === 0) {
    return null;
  }

  return (
    <div className={`tab-navigation ${className}`}>
      {/* Tab Headers */}
      <div className="flex gap-2 border-b border-slate-700 mb-6 overflow-x-auto">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            onClick={() => handleTabChange(index)}
            className={`
              tab-header flex items-center gap-2 px-6 py-3 font-medium text-sm
              transition-all duration-200 whitespace-nowrap flex-shrink-0
              ${activeTab === index
                ? 'tab-header-active text-emerald-400 border-b-2 border-emerald-400 bg-emerald-400/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-b-2 border-transparent'
              }
            `}
          >
            {tab.icon && <span className="text-base">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className={`
                ml-1 px-2 py-0.5 text-xs rounded-full font-medium
                ${activeTab === index
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-700 text-slate-300'
                }
              `}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
}
