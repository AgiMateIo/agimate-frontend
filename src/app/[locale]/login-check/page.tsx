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
  // 'network' — the gateway was unreachable, retrying the same id can work.
  // 'rejected' — the exchange itself failed (expired/spent id), only a fresh
  // sign-in helps. Both must surface: a silent bounce back to /login looks
  // exactly like nothing happening.
  const [error, setError] = useState<'network' | 'rejected' | null>(null);

  // Returns the failure kind, or null when the callback handled itself.
  const runOAuthCallback = useCallback(async (): Promise<'network' | 'rejected' | null> => {
    const hash = window.location.hash.substring(1);

    if (!hash.startsWith('rti-')) {
      router.replace('/login');
      return null;
    }

    try {
      const success = await apiService.refreshAuthTokens(hash.substring(4));
      if (!success) return 'rejected';
    } catch {
      return 'network';
    }

    await fetchUser();
    router.replace('/dashboard');
    return null;
  }, [fetchUser, router]);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    runOAuthCallback().then(setError);
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
            <h1 className="text-xl font-semibold text-foreground mb-2">
              {t(error === 'network' ? 'connectionError' : 'authError')}
            </h1>
            <p className="text-muted text-sm mb-6">
              {t(error === 'network' ? 'connectionErrorHint' : 'authErrorHint')}
            </p>
            <div className="flex flex-col gap-2">
              {/* Retrying only makes sense while the id is still unspent — a
                  rejected exchange needs a fresh sign-in, not another attempt. */}
              {error === 'network' && (
                <button
                  onClick={() => {
                    setError(null);
                    runOAuthCallback().then(setError);
                  }}
                  className="w-full py-2.5 px-4 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                >
                  {t('retry')}
                </button>
              )}
              <Link
                href="/login"
                className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors ${
                  error === 'network'
                    ? 'border border-border/50 text-muted hover:bg-surface-secondary'
                    : 'bg-accent text-white hover:bg-accent/90'
                }`}
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
