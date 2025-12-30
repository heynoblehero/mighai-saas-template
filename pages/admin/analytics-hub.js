import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import TabNavigation from '../../components/admin/TabNavigation';
import HubPageLayout from '../../components/admin/HubPageLayout';

export default function AnalyticsHub() {
  const tabs = [
    {
      label: 'Overview',
      icon: '📊',
      content: (
        <div>
          <p className="text-slate-400 mb-6">View analytics overview and key metrics</p>
          <iframe
            src="/admin/analytics"
            className="w-full h-[700px] border border-slate-700 rounded-lg"
            title="Analytics Overview"
          />
        </div>
      )
    },
    {
      label: 'A/B Tests',
      icon: '🧪',
      content: (
        <div>
          <p className="text-slate-400 mb-6">Manage and analyze A/B tests</p>
          <iframe
            src="/admin/ab-tests"
            className="w-full h-[700px] border border-slate-700 rounded-lg"
            title="A/B Tests"
          />
        </div>
      )
    },
    {
      label: 'Heatmaps',
      icon: '🔥',
      content: (
        <div>
          <p className="text-slate-400 mb-6">View user interaction heatmaps</p>
          <iframe
            src="/admin/heatmaps"
            className="w-full h-[700px] border border-slate-700 rounded-lg"
            title="Heatmaps"
          />
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <HubPageLayout
        title="Analytics & Testing"
        description="View analytics, A/B tests, and heatmaps"
        icon="📈"
      >
        <TabNavigation tabs={tabs} />
      </HubPageLayout>
    </AdminLayout>
  );
}
