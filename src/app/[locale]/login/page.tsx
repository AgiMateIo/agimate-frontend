'use client';

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useUser } from '@/contexts/UserContext';
import { hasStoredSession } from '@/services/api';
import { API } from '@/config/constants';
import { getApiBaseUrl } from '@/utils/api-url';
import { safeNextPath } from '@/utils/next-path';
import { readReferralCode } from '@/utils/referral';
import AuthShell from '@/components/landing/AuthShell';

const subscribe = () => () => {};
const getSnapshot = () => window.location.origin;
const getServerSnapshot = () => '';

// Same shape for the stored referral code: read on the client only, absent
// during SSR. Both snapshots are primitives, so re-reading per render is free.
const getReferralSnapshot = () => readReferralCode();
const getReferralServerSnapshot = (): string | null => null;

// Whether a sign-in might already be restorable. The server knows nothing about
// this browser, so SSR renders the provider buttons as before — the spinner only
// appears where there is actually something to restore.
const getStoredSessionSnapshot = () => hasStoredSession();
const getStoredSessionServerSnapshot = () => false;

// Provider codes are fixed by the backend and case-sensitive; there is no endpoint
// listing which ones an installation has configured, so the buttons live here.
type Provider = 'github' | 'google' | 'yandex';

const PROVIDERS: Provider[] = ['github', 'google', 'yandex'];

const ICONS: Record<Provider, React.ReactNode> = {
  github: (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  ),
  google: (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  yandex: (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
      <rect width="24" height="24" rx="12" fill="#FC3F1D"/>
      <path d="M12.3255 13.2396C13.0267 14.7756 13.2605 15.3099 13.2605 17.1548V19.6007H10.7561V15.4769L6.0312 5.2007H8.6441L12.3255 13.2396ZM15.4142 5.2007L12.3506 12.1628H14.8966L17.9686 5.2007H15.4142Z" fill="white"/>
    </svg>
  ),
};

function Spinner() {
  return (
    <svg className="w-5 h-5 mr-3 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function LoginContent() {
  const t = useTranslations('Login');
  const origin = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Where to land after sign-in, when the user was sent here mid-flow (the MCP
  // OAuth callback carries single-use parameters, so the whole address travels
  // through the round trip instead of being stored anywhere).
  const next = safeNextPath(useSearchParams().get('next'));
  // Whoever's invite link brought this visitor here, possibly days ago.
  const referral = useSyncExternalStore(subscribe, getReferralSnapshot, getReferralServerSnapshot);
  const authParams = useMemo(() => {
    const params = new URLSearchParams();
    if (origin) {
      params.set('redirect_to', `${origin}/login-check${next ? `?next=${encodeURIComponent(next)}` : ''}`);
    }
    // The one moment the backend can learn who invited this account: it is
    // stored against the user only if the sign-in creates one. An unusable code
    // costs nothing — the backend drops it and the sign-in proceeds.
    if (referral) params.set('ref', referral);
    const query = params.toString();
    return query ? `?${query}` : '';
  }, [origin, next, referral]);
  // Google is hidden on the .ru domain and offered everywhere else. An unknown origin
  // (SSR, where the host isn't available to a client component) counts as hidden: the
  // button fades in after hydration elsewhere rather than flashing on .ru for a frame.
  // The other providers stay available everywhere.
  const showGoogle = useMemo(() => {
    if (!origin) return false;
    try {
      return !new URL(origin).hostname.endsWith('.ru');
    } catch {
      return false;
    }
  }, [origin]);
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null);
  // Signing in again on top of a live sign-in is not a no-op: the backend opens a
  // second session, and the account collects a device row nobody asked for. So
  // this page never offers a provider to someone who is already signed in.
  const { user, loading } = useUser();
  const router = useRouter();
  const storedSession = useSyncExternalStore(
    subscribe,
    getStoredSessionSnapshot,
    getStoredSessionServerSnapshot,
  );
  // Only while there is a sign-in to restore: without one, `loading` is briefly
  // true on every visit and would flash a spinner over the buttons for nothing.
  const restoring = storedSession && loading;

  useEffect(() => {
    // `next` is where the interrupted flow wanted to go; it survives the check
    // exactly as it would have survived the sign-in.
    if (user) router.replace(next ?? '/dashboard');
  }, [user, next, router]);

  const providers = PROVIDERS.filter((p) => p !== 'google' || showGoogle);

  if (restoring || user) {
    return (
      <div className="bg-surface/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm p-8 max-w-md w-full">
        <div className="flex items-center justify-center text-sm text-foreground">
          <Spinner />
          {user ? t('alreadySignedIn') : t('checkingSession')}
        </div>
        {/* Nothing to do here for someone who wants a different account: the
            way to one is signing out, not signing in twice. */}
        {user && (
          <div className="mt-6 pt-5 border-t border-border/50 text-center">
            <Link href="/logout" className="text-xs text-muted hover:text-foreground hover:underline">
              {t('signInAsAnother')}
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
      <div className="bg-surface/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">{t('title')}</h1>
            <p className="text-muted text-sm">{t('subtitle')}</p>
          </div>

          <div className="space-y-3">
            {providers.map((provider) => (
              <a
                key={provider}
                href={`${getApiBaseUrl()}${API.ENDPOINTS.USER_API}/oauth2/authorization/${provider}${authParams}`}
                onClick={(e) => {
                  if (pendingProvider) { e.preventDefault(); return; }
                  setPendingProvider(provider);
                }}
                className={`w-full py-3 px-4 rounded-lg flex items-center justify-center font-medium transition-colors border border-border/50 ${
                  pendingProvider
                    ? 'opacity-60 bg-surface-secondary text-foreground cursor-default'
                    : 'bg-surface-secondary hover:bg-border text-foreground'
                }`}
                aria-disabled={!!pendingProvider}
                // The visible label is the bare provider name — "Sign in with" once in the
                // heading is enough. Assistive tech still gets the whole phrase.
                aria-label={t('signInWith', { provider: t(provider) })}
              >
                {pendingProvider === provider ? <Spinner /> : ICONS[provider]}
                {pendingProvider === provider ? t('redirecting') : t(provider)}
              </a>
            ))}
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
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <LoginContent />
      </Suspense>
    </AuthShell>
  );
}
