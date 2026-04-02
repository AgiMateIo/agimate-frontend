'use client';

import { useRouter } from '@/i18n/navigation';
import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { useUser } from '@/contexts/UserContext';

export default function LoginCheckPage() {
  const router = useRouter();
  const { fetchUser } = useUser();
  const t = useTranslations('LoginCheck');
  const hasRun = useRef(false);
  const [error, setError] = useState(false);

  const handleOAuthCallback = async () => {
    setError(false);
    const hash = window.location.hash.substring(1);

    if (hash.startsWith('rti-')) {
      const refreshTokenId = hash.substring(4);
      try {
        const success = await apiService.refreshAuthTokens(refreshTokenId);

        if (success) {
          await fetchUser();
          router.replace('/dashboard');
          return;
        }
      } catch {
        setError(true);
        return;
      }
    }

    router.replace('/login');
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    handleOAuthCallback();
  }, []);

  if (error) {
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

        {/* Error Content */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="bg-surface/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm p-8 max-w-md w-full text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">{t('connectionError')}</h1>
            <p className="text-muted text-sm mb-6">{t('connectionErrorHint')}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  hasRun.current = false;
                  handleOAuthCallback();
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
              >
                {t('retry')}
              </button>
              <Link
                href="/login"
                className="w-full py-2.5 px-4 rounded-lg border border-border/50 text-muted font-medium hover:bg-surface-secondary transition-colors"
              >
                {t('backToLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="text-center">
          <svg className="w-8 h-8 mx-auto mb-4 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <h1 className="text-xl font-semibold text-foreground mb-1">{t('authorizing')}</h1>
          <p className="text-muted text-sm">{t('pleaseWait')}</p>
        </div>
      </div>
    </div>
  );
}
