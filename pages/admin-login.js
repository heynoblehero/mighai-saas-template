import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function AdminLoginRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/admin/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
        <p className="mt-4">Redirecting to admin login...</p>
      </div>
    </div>
  );
}