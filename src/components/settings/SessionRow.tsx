'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowRightStartOnRectangleIcon,
  BellAlertIcon,
  BellSlashIcon,
  ChevronDownIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { Chip } from '@/components/ui/Chip';
import { RowAction } from '@/components/ui/RowAction';
import { localeMap } from '@/i18n/routing';
import { formatDate, formatDateTimeFull, parseBackendDate } from '@/utils/date';
import { describeUserAgent } from '@/utils/user-agent';
import type { UserSessionResponse } from '@/types';

interface SessionRowProps {
  session: UserSessionResponse;
  isCurrent: boolean;
  onRevoke: (session: UserSessionResponse, deviceName: string) => void;
}

/** Row title: the model for the app, a readable browser+OS for the web. */
export function deviceName(
  session: UserSessionResponse,
  fallback: { web: string; native: string },
): string {
  if (session.client === 'WEB') {
    return describeUserAgent(session.deviceLabel) ?? fallback.web;
  }
  return session.deviceLabel?.trim() || fallback.native;
}

export default function SessionRow({ session, isCurrent, onRevoke }: SessionRowProps) {
  const t = useTranslations('Settings');
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  const name = deviceName(session, { web: t('sessions.browser'), native: t('sessions.mobileApp') });
  const DeviceIcon = session.client === 'WEB' ? ComputerDesktopIcon : DevicePhoneMobileIcon;

  // Freshest first: a device that has just rotated its push token holds two
  // records for a while, and only the newest says anything about now.
  const freshestPush = [...session.push].sort(
    (a, b) => parseBackendDate(b.lastSeenAt).getTime() - parseBackendDate(a.lastSeenAt).getTime(),
  );
  const hasPush = freshestPush.length > 0;

  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-surface-secondary p-2">
          <DeviceIcon className="h-5 w-5 text-muted" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-foreground">{name}</span>
            {isCurrent && <Chip tone="accent">{t('sessions.current')}</Chip>}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span title={formatDateTimeFull(session.lastSeenAt)}>
              {t('sessions.lastSeen', { value: formatDate(session.lastSeenAt, localeMap[locale], {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              }) })}
            </span>
            <span title={formatDateTimeFull(session.createdAt)}>
              {t('sessions.signedIn', { value: formatDate(session.createdAt, localeMap[locale]) })}
            </span>
            {/* Only the app can subscribe to notifications, so on a browser row
                this says nothing — an empty `push` there is not a fault to report. */}
            {session.client === 'NATIVE' && (
              <Chip icon={hasPush ? BellAlertIcon : BellSlashIcon}>
                {hasPush ? t('sessions.pushOn') : t('sessions.pushOff')}
              </Chip>
            )}
          </div>

          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
            aria-expanded={expanded}
          >
            <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? t('sessions.hideDetails') : t('sessions.details')}
          </button>

          {expanded && (
            <dl className="mt-3 space-y-2 rounded-lg bg-surface-secondary p-3 text-xs">
              <div>
                <dt className="text-muted">{t('sessions.deviceLabel')}</dt>
                <dd className="mt-0.5 break-words font-mono text-foreground">
                  {session.deviceLabel ?? '—'}
                </dd>
              </div>
              {hasPush && (
                <div>
                  <dt className="text-muted">{t('sessions.pushTitle')}</dt>
                  <dd className="mt-1 space-y-1">
                    {freshestPush.map((push) => (
                      <div
                        key={`${push.provider}-${push.maskedToken}`}
                        className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-foreground"
                      >
                        <span className="font-medium">{push.provider}</span>
                        {/* A masked prefix, never the token — it goes nowhere
                            from here and is shown only as a technical detail. */}
                        <span className="font-mono text-muted">{push.maskedToken}</span>
                        <span className="text-muted">{formatDateTimeFull(push.lastSeenAt)}</span>
                      </div>
                    ))}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted">{t('sessions.sessionId')}</dt>
                <dd className="mt-0.5 break-all font-mono text-foreground">{session.id}</dd>
              </div>
            </dl>
          )}
        </div>

        <RowAction
          icon={ArrowRightStartOnRectangleIcon}
          label={isCurrent ? t('sessions.revokeCurrentConfirm') : t('sessions.revoke')}
          onClick={() => onRevoke(session, name)}
        />
      </div>
    </div>
  );
}
