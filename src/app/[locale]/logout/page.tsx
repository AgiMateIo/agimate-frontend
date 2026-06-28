'use client';

import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import AuthShell from '@/components/landing/AuthShell';

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useUser();
  const t = useTranslations('Logout');

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  return (
    <AuthShell>
      <div className="bg-surface/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">{t('title')}</h1>
            <p className="text-muted text-sm">{t('subtitle')}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full bg-error text-white py-3 px-4 rounded-lg font-medium hover:bg-error/90 transition-colors"
            >
              {t('confirm')}
            </button>

            <button
              onClick={() => router.back()}
              className="w-full bg-surface-secondary text-foreground border border-border/50 py-3 px-4 rounded-lg font-medium hover:bg-border transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              {t('back')}
            </button>
          </div>
        </div>
    </AuthShell>
  );
}
