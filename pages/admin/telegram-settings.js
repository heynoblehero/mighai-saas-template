import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/AdminLayout';

export default function TelegramSettings() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to new multi-bot system
    router.replace('/admin/telegram-bots');
  }, [router]);

  return (
    <AdminLayout title="Telegram Settings">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Redirecting to New System</h2>
          <p className="text-slate-400 mb-4">The Telegram notification system has been upgraded to support multiple bots...</p>
          
          <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-blue-300 mb-3">What's New?</h3>
            <ul className="text-blue-200/80 text-sm space-y-2 text-left">
              <li>• Multiple bots support</li>
              <li>• Individual event subscriptions per bot</li>
              <li>• Message history tracking</li>
              <li>• Better bot management</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}