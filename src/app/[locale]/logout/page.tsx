'use client';

import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

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
    <div className="min-h-screen flex flex-col">
      {/* Background gradient mesh */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F0EEE9] to-[#F8F7F5] dark:from-[#1a1715] dark:to-[#0f0e0d]" />
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#A47764]/30 dark:bg-[#A47764]/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#A47764]/20 dark:bg-[#A47764]/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="text-xl font-bold text-foreground">
            AgiMate
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
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
      </div>
    </div>
  );
}
