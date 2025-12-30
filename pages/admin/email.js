import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import TabNavigation from '../../components/admin/TabNavigation';
import HubPageLayout from '../../components/admin/HubPageLayout';
import Button from '../../components/ui/Button';
import { useRouter } from 'next/router';

export default function EmailMarketingHub() {
  const router = useRouter();

  const tabs = [
    {
      label: 'Campaigns',
      icon: '📧',
      content: (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <p className="text-slate-400">Create and manage email campaigns</p>
            <Button
              variant="primary"
              onClick={() => router.push('/admin/campaigns/new')}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              New Campaign
            </Button>
          </div>
          <iframe
            src="/admin/campaigns"
            className="w-full h-[600px] border border-slate-700 rounded-lg"
            title="Email Campaigns"
          />
        </div>
      )
    },
    {
      label: 'Templates',
      icon: '📝',
      content: (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <p className="text-slate-400">Manage email templates</p>
            <Button
              variant="primary"
              onClick={() => router.push('/admin/email-templates/new')}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              New Template
            </Button>
          </div>
          <iframe
            src="/admin/email-templates"
            className="w-full h-[600px] border border-slate-700 rounded-lg"
            title="Email Templates"
          />
        </div>
      )
    },
    {
      label: 'Settings',
      icon: '⚙️',
      content: (
        <div>
          <p className="text-slate-400 mb-6">Configure email delivery settings</p>
          <div className="glass rounded-xl p-8">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Email Configuration</h3>
            <p className="text-slate-400 text-sm mb-6">
              Configure your SMTP settings or email service provider integration.
            </p>
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <p className="text-sm text-slate-300">
                  Email settings will be available in a future update. For now, emails are sent using the default configuration.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <HubPageLayout
        title="Email Marketing"
        description="Manage campaigns, templates, and email settings"
        icon="✉️"
      >
        <TabNavigation tabs={tabs} />
      </HubPageLayout>
    </AdminLayout>
  );
}
