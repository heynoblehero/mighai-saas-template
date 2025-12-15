import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/AdminLayout';

export default function AdminWelcome() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to dashboard where onboarding now happens
    router.push('/admin');
  }, []);

  return (
    <AdminLayout title="Welcome">
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Redirecting to dashboard...</p>
        </div>
      </div>
    </AdminLayout>
  );
}