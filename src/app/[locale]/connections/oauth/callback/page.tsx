'use client';

import { Suspense, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import apiService, { ApiError } from '@/services/api';
import { useConnectionCacheActions } from '@/queries/connections';
import { useUser } from '@/contexts/UserContext';
import AuthShell from '@/components/landing/AuthShell';

/**
 * Return address of the MCP OAuth handshake — the `redirect_uris` entry inside
 * `/connections/oauth/client.json`, so the path is fixed by the provider's copy
 * of that document and by the backend config; it must not be renamed casually.
 *
 * Everything the provider put in the query is forwarded to the backend as-is
 * and the backend decides what the user reads: until it has matched `iss`
 * against the issuer it recorded, any text in this URL is attacker-supplied
 * (anyone holding the link can open it with an `error_description` of their
 * choosing). Nothing from the query is rendered here.
 */

// `state` is single-use — a second POST answers 400 "already been used". React
// StrictMode remounts this page in development, so the guard has to outlive the
// component, not just the effect.
const consumedStates = new Set<string>();

type Failure =
  // the request the state belongs to is gone or was never ours
  | { kind: 'invalid' }
  // the user pressed "deny" on the consent screen; the connection is untouched
  | { kind: 'denied' }
  // anything else the backend had to say, in its own words
  | { kind: 'message'; text: string }
  // the request never reached a backend verdict (transport, expired session)
  | { kind: 'unknown' };

function OAuthCallbackContent() {
  const t = useTranslations('ConnectionAuth');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useUser();

  const { setConnection } = useConnectionCacheActions();

  const state = searchParams.get('state');
  const code = searchParams.get('code');
  const providerError = searchParams.get('error');
  const iss = searchParams.get('iss');

  const complete = useMutation({
    mutationFn: () =>
      apiService.completeConnectionOAuth({
        state: state!,
        ...(code ? { code } : {}),
        ...(providerError ? { error: providerError } : {}),
        ...(iss ? { iss } : {}),
      }),
    onSuccess: (connection) => {
      setConnection(connection);
      router.replace(`/dashboard/connections/${connection.id}?authorized=1`);
    },
    // The state is spent either way — a retry would only turn a real error into
    // "already been used".
    retry: false,
  });

  useEffect(() => {
    // Wait for the session to settle: without a token the POST would fail as
    // "access denied" and look like a broken link.
    if (userLoading) return;
    if (!user) {
      // Sign in, then land back here with the query intact — `code`/`state`
      // ride along in the URL rather than being parked in storage.
      const next = `${pathname}?${searchParams.toString()}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!state || consumedStates.has(state)) return;
    consumedStates.add(state);
    complete.mutate();
    // `complete` is recreated every render; the guard above is what keeps this
    // to one call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading, state, pathname, searchParams, router]);

  // A callback without `state` didn't come from a handshake we started, so
  // there is nothing to send and nothing to wait for.
  const failure: Failure | null = !state
    ? { kind: 'invalid' }
    : complete.isError
      ? classify(complete.error)
      : null;

  if (!failure) {
    return (
      <div className="text-center">
        <svg className="w-8 h-8 mx-auto mb-4 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <h1 className="text-xl font-semibold text-foreground mb-1">{t('completing')}</h1>
        <p className="text-muted text-sm">{t('completingHint')}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm p-8 max-w-md w-full text-center">
      <h1 className="text-xl font-semibold text-foreground mb-2">
        {t(failure.kind === 'denied' ? 'deniedTitle' : 'failedTitle')}
      </h1>
      <p className="text-muted text-sm mb-6 break-words">
        {failure.kind === 'message' && failure.text}
        {failure.kind === 'denied' && t('deniedHint')}
        {failure.kind === 'invalid' && t('invalidHint')}
        {failure.kind === 'unknown' && t('unknownHint')}
      </p>
      <Link
        href="/dashboard/connections"
        className="block w-full py-2.5 px-4 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
      >
        {t('backToConnections')}
      </Link>
    </div>
  );
}

// The backend distinguishes these by message text; the status alone can't tell
// a denied grant from a spent state.
function classify(err: unknown): Failure {
  // Not a backend verdict but a transport sentinel (`SERVICE_UNAVAILABLE`,
  // `ACCESS_DENIED`) — never show those strings to the user.
  if (!(err instanceof ApiError)) return { kind: 'unknown' };
  const message = err.message.toLowerCase();
  if (err.status === 404) return { kind: 'invalid' };
  if (message.includes('not granted') || message.includes('access_denied')) {
    return { kind: 'denied' };
  }
  // "expired" and "already been used" both mean the same to the user: this
  // handshake is over, start a new one from the connection card.
  if (message.includes('expired') || message.includes('already been used')) {
    return { kind: 'invalid' };
  }
  return { kind: 'message', text: err.message };
}

export default function OAuthCallbackPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <OAuthCallbackContent />
      </Suspense>
    </AuthShell>
  );
}
