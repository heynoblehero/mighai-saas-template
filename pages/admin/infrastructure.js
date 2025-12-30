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
      label: 'Storage',
      icon: '💾',
      content: (
        <div>
          <p className="text-slate-400 mb-6">Manage uploaded files and storage</p>
          <iframe
            src="/admin/storage"
            className="w-full h-[700px] border border-slate-700 rounded-lg"
            title="Storage Management"
          />
        </div>
      )
    },
    {
      label: 'API Routes',
      icon: '🔌',
      content: (
        <div>
          <p className="text-slate-400 mb-6">View and test API endpoints</p>
          <iframe
            src="/admin/backend/routes"
            className="w-full h-[700px] border border-slate-700 rounded-lg"
            title="API Routes"
          />
        </div>
      )
    },
    {
      label: 'Server Logs',
      icon: '📋',
      content: (
        <div>
          <p className="text-slate-400 mb-6">View server logs and activity</p>
          <iframe
            src="/admin/backend/server-logs"
            className="w-full h-[700px] border border-slate-700 rounded-lg"
            title="Server Logs"
          />
        </div>
      )
    },
    {
      label: 'Integrations',
      icon: '⚡',
      content: (
        <div>
          <p className="text-slate-400 mb-6">Manage third-party integrations</p>
          <iframe
            src="/admin/integrations"
            className="w-full h-[700px] border border-slate-700 rounded-lg"
            title="Integrations"
          />
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <HubPageLayout
        title="Infrastructure"
        description="Manage database, storage, API routes, logs, and integrations"
        icon="🖥️"
      >
        <TabNavigation tabs={tabs} />
      </HubPageLayout>
    </AdminLayout>
  );
}
