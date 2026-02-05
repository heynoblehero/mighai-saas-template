import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import TabNavigation from '../../components/admin/TabNavigation';
import HubPageLayout from '../../components/admin/HubPageLayout';

export default function InfrastructureHub() {
  const tabs = [
    {
      label: 'Database',
      icon: '🗄️',
      content: (
        <div>
          <p className="text-slate-400 mb-6">Manage database tables and records</p>
          <iframe
            src="/admin/database"
            className="w-full h-[700px] border border-slate-700 rounded-lg"
            title="Database Management"
          />
        </div>
      )
    },
    {
      label: 'My App',
      icon: '🚀',
      content: (
        <div>
          <p className="text-slate-400 mb-6">Deploy and manage your backend application</p>
          <iframe
            src="/admin/backend/app"
            className="w-full h-[700px] border border-slate-700 rounded-lg"
            title="My App"
          />
        </div>
      )
    },
  ];

  return (
    <AdminLayout>
      <HubPageLayout
        title="Infrastructure"
        description="Manage database and your backend app"
        icon="🖥️"
      >
        <TabNavigation tabs={tabs} />
      </HubPageLayout>
    </AdminLayout>
  );
}
