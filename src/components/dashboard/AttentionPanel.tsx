'use client';

import { useTranslations } from 'next-intl';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Link } from '@/i18n/navigation';
import type { AttentionKind, AttentionSignal } from '@/queries/dashboard';
import { formatDateTimeFull, formatDateTimeShort } from '@/utils/date';

type LabelKey =
  | 'attentionJobsFailed'
  | 'attentionJobsPaused'
  | 'attentionToolErrors'
  | 'attentionToolDenied'
  | 'attentionConnectionsDisabled'
  | 'attentionConnectionsUnauthorized'
  | 'attentionWebhooksFailed';

// Broken now vs. worth a look: failures are errors, everything the user may have
// done on purpose (paused jobs, disabled connections, policy denials) is a warning.
const SIGNAL_STYLE: Record<
  AttentionKind,
  { labelKey: LabelKey; tone: 'error' | 'warning' }
> = {
  jobsFailed: { labelKey: 'attentionJobsFailed', tone: 'error' },
  jobsPaused: { labelKey: 'attentionJobsPaused', tone: 'warning' },
  toolErrors: { labelKey: 'attentionToolErrors', tone: 'error' },
  toolDenied: { labelKey: 'attentionToolDenied', tone: 'warning' },
  connectionsDisabled: { labelKey: 'attentionConnectionsDisabled', tone: 'warning' },
  // Not a choice the user made — the integration is simply dead until they
  // re-authorize, so it reads as an error.
  connectionsUnauthorized: { labelKey: 'attentionConnectionsUnauthorized', tone: 'error' },
  webhooksFailed: { labelKey: 'attentionWebhooksFailed', tone: 'error' },
};

function SignalRow({ signal }: { signal: AttentionSignal }) {
  const t = useTranslations('DashboardHome');
  const { labelKey, tone } = SIGNAL_STYLE[signal.kind];
  const Icon = tone === 'error' ? XCircleIcon : ExclamationTriangleIcon;
  const toneText = tone === 'error' ? 'text-error' : 'text-warning';

  return (
    <Link
      href={signal.href}
      className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-secondary"
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${toneText}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-medium text-foreground">{t(labelKey)}</span>
          {signal.count !== null && (
            <span
              className={`text-sm font-semibold tabular-nums ${toneText}`}
              title={signal.partial ? t('attentionPartial') : undefined}
            >
              {signal.count}
              {signal.partial && '+'}
            </span>
          )}
          {signal.latestAt && (
            <span
              className="text-xs text-muted"
              title={formatDateTimeFull(signal.latestAt)}
            >
              {formatDateTimeShort(signal.latestAt)}
            </span>
          )}
        </div>
        {signal.samples.length > 0 && (
          <p className="truncate text-xs text-muted">{signal.samples.join(', ')}</p>
        )}
      </div>
      <span className="mt-0.5 shrink-0 text-accent opacity-0 transition-opacity group-hover:opacity-100">
        →
      </span>
    </Link>
  );
}

export default function AttentionPanel({
  signals,
  loading,
  error,
}: {
  signals: AttentionSignal[];
  loading: boolean;
  error: string | null;
}) {
  const t = useTranslations('DashboardHome');

  return (
    <section className="space-y-2 rounded-xl border border-border bg-surface p-4">
      <h2 className="px-1 font-semibold text-foreground">{t('attentionTitle')}</h2>

      {error !== null && <ErrorAlert>{error || t('loadFailed')}</ErrorAlert>}

      {loading ? (
        <div className="space-y-2">
          <div className="h-10 animate-pulse rounded-lg bg-surface-secondary" />
          <div className="h-10 w-2/3 animate-pulse rounded-lg bg-surface-secondary" />
        </div>
      ) : signals.length === 0 ? (
        error === null && (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <CheckCircleIcon className="h-5 w-5 shrink-0 text-success" />
            <span className="text-sm text-muted">{t('attentionClear')}</span>
          </div>
        )
      ) : (
        <div className="space-y-0.5">
          {signals.map((signal) => (
            <SignalRow key={signal.kind} signal={signal} />
          ))}
        </div>
      )}
    </section>
  );
}
