import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import TabNavigation from '../../components/admin/TabNavigation';
import HubPageLayout from '../../components/admin/HubPageLayout';
import Button from '../../components/ui/Button';
import { useRouter } from 'next/router';

export default function ContentHub() {
  const router = useRouter();

  const tabs = [
    {
      label: 'Pages',
      icon: '📄',
      content: (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <p className="text-slate-400">Manage all your custom pages</p>
            <Button
              variant="primary"
              onClick={() => router.push('/admin/pages/new')}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              New Page
            </Button>
          </div>
          <iframe
            src="/admin/pages"
            className="w-full h-[600px] border border-slate-700 rounded-lg"
            title="Pages Management"
          />
        </div>
      )
    },
    {
      label: 'Reserved Pages',
      icon: '🎨',
      content: (
        <div>
          <p className="text-slate-400 mb-6">Customize landing, pricing, and other reserved pages</p>
          <iframe
            src="/admin/pages"
            className="w-full h-[600px] border border-slate-700 rounded-lg"
            title="Pages Management"
          />
        </div>
      )
    },
    {
      label: 'Blog',
      icon: '✍️',
      content: (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <p className="text-slate-400">Manage your blog posts</p>
            <Button
              variant="primary"
              onClick={() => router.push('/admin/blog/new')}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              New Post
            </Button>
          </div>
          <iframe
            src="/admin/blog"
            className="w-full h-[600px] border border-slate-700 rounded-lg"
            title="Blog Management"
          />
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <HubPageLayout
        title="Content Management"
        description="Manage pages, reserved pages, and blog posts"
        icon="📝"
      >
        <TabNavigation tabs={tabs} />
      </HubPageLayout>
    </AdminLayout>
  );
}
