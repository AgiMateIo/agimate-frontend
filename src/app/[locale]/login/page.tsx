'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { API } from '@/config/constants';
import { getApiBaseUrl } from '@/utils/api-url';
import AuthShell from '@/components/landing/AuthShell';

const subscribe = () => () => {};
const getSnapshot = () => window.location.origin;
const getServerSnapshot = () => '';

export default function LoginPage() {
  const t = useTranslations('Login');
  const origin = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const redirectParams = useMemo(
    () => origin ? `?redirect_to=${encodeURIComponent(origin + '/login-check')}` : '',
    [origin]
  );
  const [pendingProvider, setPendingProvider] = useState<'google' | 'yandex' | null>(null);

  return (
    <AuthShell>
      <div className="bg-surface/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">{t('title')}</h1>
            <p className="text-muted text-sm">{t('subtitle')}</p>
          </div>

          <div className="space-y-3">
            <a
              href={`${getApiBaseUrl()}${API.ENDPOINTS.USER_API}/oauth2/authorization/google${redirectParams}`}
              onClick={(e) => {
                if (pendingProvider) { e.preventDefault(); return; }
                setPendingProvider('google');
              }}
              className={`w-full py-3 px-4 rounded-lg flex items-center justify-center font-medium transition-colors border border-border/50 ${
                pendingProvider
                  ? 'opacity-60 bg-surface-secondary text-foreground cursor-default'
                  : 'bg-surface-secondary hover:bg-border text-foreground'
              }`}
              aria-disabled={!!pendingProvider}
            >
              {pendingProvider === 'google' ? (
                <svg className="w-5 h-5 mr-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {pendingProvider === 'google' ? t('redirecting') : t('google')}
            </a>

            <a
              href={`${getApiBaseUrl()}${API.ENDPOINTS.USER_API}/oauth2/authorization/yandex${redirectParams}`}
              onClick={(e) => {
                if (pendingProvider) { e.preventDefault(); return; }
                setPendingProvider('yandex');
              }}
              className={`w-full py-3 px-4 rounded-lg flex items-center justify-center font-medium transition-colors border border-border/50 ${
                pendingProvider
                  ? 'opacity-60 bg-surface-secondary text-foreground cursor-default'
                  : 'bg-surface-secondary hover:bg-border text-foreground'
              }`}
              aria-disabled={!!pendingProvider}
            >
              {pendingProvider === 'yandex' ? (
                <svg className="w-5 h-5 mr-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <rect width="24" height="24" rx="12" fill="#FC3F1D"/>
                  <path d="M12.3255 13.2396C13.0267 14.7756 13.2605 15.3099 13.2605 17.1548V19.6007H10.7561V15.4769L6.0312 5.2007H8.6441L12.3255 13.2396ZM15.4142 5.2007L12.3506 12.1628H14.8966L17.9686 5.2007H15.4142Z" fill="white"/>
                </svg>
              )}
              {pendingProvider === 'yandex' ? t('redirecting') : t('yandex')}
            </a>
          </div>

          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <p className="text-muted text-xs">
              {t('terms')}{' '}
              <Link href="/terms" className="text-accent hover:underline">{t('termsLink')}</Link>
              {' '}{t('and')}{' '}
              <Link href="/privacy" className="text-accent hover:underline">{t('privacyLink')}</Link>.
            </p>
          </div>
        </div>
    </AuthShell>
  );
}
