'use client';

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useUser } from '@/contexts/UserContext';
import apiService, { ApiError, hasStoredSession } from '@/services/api';
import { API } from '@/config/constants';
import { getApiBaseUrl } from '@/utils/api-url';
import { safeNextPath } from '@/utils/next-path';
import { readReferralCode } from '@/utils/referral';
import { providersForOrigin, type OfferedProvider } from '@/config/authProviders';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import AuthShell from '@/components/landing/AuthShell';
import AuthCard from '@/components/auth/AuthCard';
import { AuthSpinner } from '@/components/auth/AuthSpinner';
import { ProviderIcon } from '@/components/auth/ProviderIcon';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

const subscribe = () => () => {};
const getSnapshot = () => window.location.origin;
const getServerSnapshot = () => '';

// Same shape for the stored referral code: read on the client only, absent
// during SSR. Both snapshots are primitives, so re-reading per render is free.
const getReferralSnapshot = () => readReferralCode();
const getReferralServerSnapshot = (): string | null => null;

// Whether a sign-in might already be restorable. The server knows nothing about
// this browser, so SSR renders the sign-in form as before — the spinner only
// appears where there is actually something to restore.
const getStoredSessionSnapshot = () => hasStoredSession();
const getStoredSessionServerSnapshot = () => false;

function LoginContent() {
  const t = useTranslations('Login');
  // Provider names live in Common: the sign-in screen and the "ways in" card in
  // settings name the same four things.
  const tp = useTranslations('Common');
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
  const [pendingProvider, setPendingProvider] = useState<OfferedProvider | null>(null);
  // Signing in again on top of a live sign-in is not a no-op: the backend opens a
  // second session, and the account collects a device row nobody asked for. So
  // this page never offers a way in to someone who is already signed in.
  const { user, loading, fetchUser } = useUser();
  const router = useRouter();
  const storedSession = useSyncExternalStore(
    subscribe,
    getStoredSessionSnapshot,
    getStoredSessionServerSnapshot,
  );
  // Only while there is a sign-in to restore: without one, `loading` is briefly
  // true on every visit and would flash a spinner over the form for nothing.
  const restoring = storedSession && loading;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loading: submitting, error, handleSubmit } = useAsyncForm({
    onSuccess: async () => {
      await fetchUser();
      router.replace(next ?? '/dashboard');
    },
    defaultError: t('signInFailed'),
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      try {
        await apiService.loginWithPassword(email.trim(), password);
      } catch (err) {
        // An unknown address and a wrong password answer 401 alike, on purpose
        // and in the same time — so the screen says the one thing that covers
        // both. Judged by status, not by matching the English message.
        if (err instanceof ApiError && err.status === 401) {
          throw new ApiError(t('invalidCredentials'), null, 401);
        }
        throw err;
      }
    }).catch(() => {});

  useEffect(() => {
    // `next` is where the interrupted flow wanted to go; it survives the check
    // exactly as it would have survived the sign-in.
    if (user) router.replace(next ?? '/dashboard');
  }, [user, next, router]);

  const providers = providersForOrigin(origin);
  const registerHref = next ? `/register?next=${encodeURIComponent(next)}` : '/register';

  if (restoring || user) {
    return (
      <AuthCard>
        <div className="flex items-center justify-center text-sm text-foreground">
          <AuthSpinner />
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
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">{t('title')}</h1>
        <p className="text-muted text-sm">{t('subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorAlert>{error}</ErrorAlert>}

        <FormField label={t('email')} required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            maxLength={254}
          />
        </FormField>

        <FormField label={t('password')} required>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </FormField>

        <Button type="submit" loading={submitting} className="w-full">
          {t('signIn')}
        </Button>
      </form>

      <div className="mt-3 text-center">
        <Link href="/password/forgot" className="text-xs text-muted hover:text-foreground hover:underline">
          {t('forgotPassword')}
        </Link>
      </div>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border/50" />
        <span className="text-xs text-muted">{t('or')}</span>
        <span className="h-px flex-1 bg-border/50" />
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
            aria-label={t('signInWith', { provider: tp(`providers.${provider}`) })}
          >
            {pendingProvider === provider
              ? <AuthSpinner />
              : <ProviderIcon provider={provider} className="w-5 h-5 mr-3" />}
            {pendingProvider === provider ? t('redirecting') : tp(`providers.${provider}`)}
          </a>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        {t('noAccount')}{' '}
        <Link href={registerHref} className="text-accent hover:underline">{t('registerLink')}</Link>
      </p>

      <div className="mt-8 pt-6 border-t border-border/50 text-center">
        <p className="text-muted text-xs">
          {t('terms')}{' '}
          <Link href="/terms" className="text-accent hover:underline">{t('termsLink')}</Link>
          {' '}{t('and')}{' '}
          <Link href="/privacy" className="text-accent hover:underline">{t('privacyLink')}</Link>.
        </p>
      </div>
    </AuthCard>
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
