'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import SessionRow from '@/components/settings/SessionRow';
import RevokeSessionModal from '@/components/settings/RevokeSessionModal';
import { useCurrentSessionId } from '@/hooks/useCurrentSessionId';
import { useSessionCacheActions, useUserSessionsQuery } from '@/queries/sessions';
import type { UserSessionResponse } from '@/types';

/**
 * Where the account is signed in, and how to end one of those sign-ins.
 *
 * Reachable before the account is approved on purpose — losing a phone does not
 * wait for a role change.
 */
export default function SessionsCard() {
  const t = useTranslations('Settings');
  const { data, isPending, error } = useUserSessionsQuery();
  const { invalidateSessions } = useSessionCacheActions();
  const currentSessionId = useCurrentSessionId();
  // `isCurrent` is captured when the modal opens: signing out clears the stored
  // session id, so re-deriving it mid-flight would flip the dialog's meaning
  // underneath the confirm button.
  const [revoking, setRevoking] = useState<
    { session: UserSessionResponse; name: string; isCurrent: boolean } | null
  >(null);

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-surface-secondary">
            <DevicePhoneMobileIcon className="h-5 w-5 text-muted" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{t('sessions.title')}</h2>
            <p className="text-sm text-muted">{t('sessions.description')}</p>
          </div>
        </div>
      </div>

      {isPending ? (
        <div className="space-y-3 p-5">
          <div className="h-14 animate-pulse rounded-lg bg-surface-secondary" />
          <div className="h-14 animate-pulse rounded-lg bg-surface-secondary" />
        </div>
      ) : error ? (
        <p className="p-5 text-sm text-muted">{t('sessions.error')}</p>
      ) : data.length === 0 ? (
        <p className="p-5 text-sm text-muted">{t('sessions.empty')}</p>
      ) : (
        // Server order is by last activity, freshest first — rendered as it came.
        <div className="divide-y divide-border">
          {data.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              // Null until this browser has refreshed its tokens once: then no
              // row is marked, which is better than marking the wrong one.
              isCurrent={currentSessionId !== null && session.id === currentSessionId}
              onRevoke={(target, name) =>
                setRevoking({
                  session: target,
                  name,
                  isCurrent: currentSessionId !== null && target.id === currentSessionId,
                })
              }
            />
          ))}
        </div>
      )}

      {revoking && (
        <RevokeSessionModal
          session={revoking.session}
          deviceName={revoking.name}
          isCurrent={revoking.isCurrent}
          onClose={() => setRevoking(null)}
          onRevoked={() => {
            setRevoking(null);
            // Revoking this very device is a sign-out that is already leaving
            // the page — re-reading the list would only fire a request with
            // tokens that no longer work.
            if (!revoking.isCurrent) invalidateSessions();
          }}
        />
      )}
    </div>
  );
}
