'use client';

import { useRouter } from '@/i18n/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { useUser } from '@/contexts/UserContext';
import AuthShell from '@/components/landing/AuthShell';

export default function LoginCheckPage() {
  const router = useRouter();
  const { fetchUser } = useUser();
  const t = useTranslations('LoginCheck');
  const hasRun = useRef(false);
  const [error, setError] = useState(false);

  // Returns false when the token exchange failed and the retry UI should show.
  const runOAuthCallback = useCallback(async (): Promise<boolean> => {
    const hash = window.location.hash.substring(1);

    if (hash.startsWith('rti-')) {
      const refreshTokenId = hash.substring(4);
      try {
        const success = await apiService.refreshAuthTokens(refreshTokenId);

        if (success) {
          await fetchUser();
          router.replace('/dashboard');
          return true;
        }
      } catch {
        return false;
      }
    }

    router.replace('/login');
    return true;
  }, [fetchUser, router]);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    runOAuthCallback().then((ok) => {
      if (!ok) setError(true);
    });
  }, [runOAuthCallback]);

  if (error) {
    return (
      <AuthShell>
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
                  setError(false);
                  runOAuthCallback().then((ok) => {
                    if (!ok) setError(true);
                  });
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
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="text-center">
        <svg className="w-8 h-8 mx-auto mb-4 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <h1 className="text-xl font-semibold text-foreground mb-1">{t('authorizing')}</h1>
        <p className="text-muted text-sm">{t('pleaseWait')}</p>
      </div>
    </AuthShell>
  );
}
