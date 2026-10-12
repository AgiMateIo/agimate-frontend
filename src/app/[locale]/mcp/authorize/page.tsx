'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useUser } from '@/contexts/UserContext';
import { ApiError } from '@/services/api';
import { mcpAuthorizeCheckOptions } from '@/queries/mcp-oauth';
import AuthShell from '@/components/landing/AuthShell';
import AuthCard from '@/components/auth/AuthCard';
import { AuthSpinner } from '@/components/auth/AuthSpinner';
import McpConsentForm from '@/components/mcp-oauth/McpConsentForm';
import type { McpAuthorizationParams } from '@/types';

// Consent page of an external MCP client; the backend announces this exact path.
// No state of its own: the query is forwarded verbatim, return addresses come back finished.

const PARAMS = [
  'response_type',
  'client_id',
  'redirect_uri',
  'code_challenge',
  'code_challenge_method',
  'state',
  'resource',
  'scope',
] as const;

function authorizationFrom(search: URLSearchParams): McpAuthorizationParams {
  const params: McpAuthorizationParams = {};
  for (const name of PARAMS) {
    const value = search.get(name);
    if (value !== null) params[name] = value;
  }
  return params;
}

function McpAuthorizeContent() {
  const t = useTranslations('McpAuthorize');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const authorization = useMemo(() => authorizationFrom(new URLSearchParams(query)), [query]);
  const { user, loading } = useUser();
  const [leaving, setLeaving] = useState<string | null>(null);

  // Back from /login by client navigation, the analytics script loaded there is
  // still in the page. A full reload is what keeps third-party code off here.
  useEffect(() => {
    if ('ym' in window) window.location.reload();
  }, []);

  useEffect(() => {
    if (loading || user) return;
    // The whole query rides through sign-in in `next`; nothing is stored.
    router.replace(`/login?next=${encodeURIComponent(`${pathname}?${query}`)}`);
  }, [loading, user, pathname, query, router]);

  // Waits for the session: without a token the transport would bounce to
  // /login itself and drop the query.
  const check = useQuery({ ...mcpAuthorizeCheckOptions(query, authorization), enabled: !!user });

  // A bad request from a verified client: the error belongs to the client.
  const redirectUrl = check.data?.redirectUrl ?? leaving;
  useEffect(() => {
    if (redirectUrl) window.location.assign(redirectUrl);
  }, [redirectUrl]);

  const consent = check.data?.consent;

  if (leaving && consent) {
    return (
      <AuthCard>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">{t('doneTitle')}</h1>
          <p className="text-sm text-muted">
            {consent.localApplication
              ? t('doneLocal', { name: consent.clientName })
              : t('doneRemote', { host: consent.redirectHost })}
          </p>
        </div>
      </AuthCard>
    );
  }

  if (check.isError || (check.isSuccess && !consent && !redirectUrl)) {
    // 400 = return address unverified: going anywhere would make this an open redirect.
    const error = check.error;
    const detail = error instanceof ApiError && error.status ? error.message : null;
    return (
      <AuthCard>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">{t('failedTitle')}</h1>
          <p className="text-sm text-muted">{t('failedHint')}</p>
          {detail && <p className="mt-3 text-xs text-muted break-words">{detail}</p>}
        </div>
      </AuthCard>
    );
  }

  if (!consent) {
    return (
      <AuthCard>
        <div className="flex items-center justify-center text-sm text-foreground">
          <AuthSpinner />
          {redirectUrl ? t('returning') : t('checking')}
        </div>
      </AuthCard>
    );
  }

  return (
    <McpConsentForm
      consent={consent}
      authorization={authorization}
      userEmail={user?.email ?? null}
      onRecheck={() => check.refetch()}
      onLeave={setLeaving}
    />
  );
}

export default function McpAuthorizePage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <McpAuthorizeContent />
      </Suspense>
    </AuthShell>
  );
}
