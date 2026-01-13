import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import TabNavigation from '../../components/admin/TabNavigation';
import HubPageLayout from '../../components/admin/HubPageLayout';
import Button from '../../components/ui/Button';
import { useRouter } from 'next/router';

export default function MonetizationHub() {
  const router = useRouter();

  const tabs = [
    {
      label: 'Plans',
      icon: '💳',
      content: (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <p className="text-slate-400">Manage subscription plans and pricing</p>
            <Button
              variant="primary"
              onClick={() => router.push('/admin/plans/new')}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              New Plan
            </Button>
          </div>
          <iframe
            src="/admin/plans"
            className="w-full h-[600px] border border-slate-700 rounded-lg"
            title="Plans Management"
          />
        </div>
      )
    },
    {
      label: 'Checkout Links',
      icon: '🔗',
      content: (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <p className="text-slate-400">Manage payment checkout links</p>
            <Button
              variant="primary"
              onClick={() => router.push('/admin/checkout-links/new')}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              New Link
            </Button>
          </div>
          <iframe
            src="/admin/checkout-links"
            className="w-full h-[600px] border border-slate-700 rounded-lg"
            title="Checkout Links"
          />
        </div>
      )
    },
    {
      label: 'Subscribers',
      icon: '👥',
      content: (
        <div>
          <p className="text-slate-400 mb-6">View and manage subscribers</p>
          <iframe
            src="/admin/subscribers"
            className="w-full h-[600px] border border-slate-700 rounded-lg"
            title="Subscribers Management"
          />
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <HubPageLayout
        title="Monetization"
        description="Manage plans, pricing, checkout links, and subscribers"
        icon="💰"
      >
        <TabNavigation tabs={tabs} />
      </HubPageLayout>
    </AdminLayout>
  );
}
