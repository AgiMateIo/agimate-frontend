'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Chip } from '@/components/ui/Chip';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import type { ConnectionAuthStatus } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

// A connection that still needs the user to pass a provider consent screen.
// PENDING_AUTH was never authorized, AUTH_EXPIRED lost its grant — the two
// differ only in wording, both are fixed by the same call.
export const needsAuthorization = (status: ConnectionAuthStatus) => status !== 'AUTHORIZED';

export function ConnectionAuthBadge({ status }: { status: ConnectionAuthStatus }) {
  const t = useTranslations('ConnectionAuth');

  if (status === 'AUTHORIZED') return null;

  return (
    <Chip strong tone={status === 'AUTH_EXPIRED' ? 'error' : 'warning'}>
      {status === 'AUTH_EXPIRED' ? t('badgeExpired') : t('badgePending')}
    </Chip>
  );
}

/**
 * Starts (or restarts) the OAuth handshake for one connection and hands the
 * browser to the provider. The URL is a third-party consent screen with a
 * ~10 minute lifetime, so it is minted on click and used immediately — never
 * fetched, framed, or kept around.
 */
export function AuthorizeConnectionButton({
  connectionId,
  status,
  className,
}: {
  connectionId: string;
  status: ConnectionAuthStatus;
  className?: string;
}) {
  const t = useTranslations('ConnectionAuth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const { authorizationUrl } = await apiService.startConnectionAuthorization(connectionId);
      // Leaving the app on purpose: `loading` stays true so the button can't be
      // pressed twice while the navigation is in flight.
      window.location.assign(authorizationUrl);
    } catch (err) {
      setError(getErrorMessage(err, t('startError')));
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <Button onClick={start} loading={loading} disabled={loading} className="inline-flex items-center gap-2">
        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        {status === 'AUTH_EXPIRED' ? t('reconnect') : t('connect')}
      </Button>
      {error && <p className="text-sm text-error mt-2 break-words">{error}</p>}
    </div>
  );
}

/** Explains why a connection does nothing, and offers the one fix. */
export function ConnectionAuthPanel({
  connectionId,
  status,
}: {
  connectionId: string;
  status: ConnectionAuthStatus;
}) {
  const t = useTranslations('ConnectionAuth');

  if (!needsAuthorization(status)) return null;

  return (
    <Alert variant={status === 'AUTH_EXPIRED' ? 'error' : 'warning'}>
      <div className="space-y-3">
        <p className="text-sm">{status === 'AUTH_EXPIRED' ? t('expiredHint') : t('pendingHint')}</p>
        <AuthorizeConnectionButton connectionId={connectionId} status={status} />
      </div>
    </Alert>
  );
}
