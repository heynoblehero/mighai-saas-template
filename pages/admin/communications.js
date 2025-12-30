import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import TabNavigation from '../../components/admin/TabNavigation';
import HubPageLayout from '../../components/admin/HubPageLayout';

export default function CommunicationsHub() {
  const tabs = [
    {
      label: 'Telegram Bots',
      icon: '💬',
      content: (
        <div>
          <p className="text-slate-400 mb-6">Configure and manage Telegram bots</p>
          <iframe
            src="/admin/telegram-bots"
            className="w-full h-[600px] border border-slate-700 rounded-lg"
            title="Telegram Bots"
          />
        </div>
      )
    },
    {
      label: 'Support Messages',
      icon: '💭',
      content: (
        <div>
          <p className="text-slate-400 mb-6">View and respond to support messages</p>
          <iframe
            src="/admin/support-messages"
            className="w-full h-[600px] border border-slate-700 rounded-lg"
            title="Support Messages"
          />
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <HubPageLayout
        title="Communications"
        description="Manage Telegram bots and support messages"
        icon="📢"
      >
        <TabNavigation tabs={tabs} />
      </HubPageLayout>
    </AdminLayout>
  );
}
