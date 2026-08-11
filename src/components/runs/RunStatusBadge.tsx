'use client';

import { useTranslations } from 'next-intl';
import type { RunStatus } from '@/types';

const STATUS_BADGE = {
  ENQUEUED: { className: 'bg-muted/10 text-muted', labelKey: 'statusEnqueued' },
  RUNNING: { className: 'bg-accent/10 text-accent animate-pulse', labelKey: 'statusRunning' },
  DONE: { className: 'bg-success/10 text-success', labelKey: 'statusDone' },
  FAILED: { className: 'bg-error/10 text-error', labelKey: 'statusFailed' },
  CANCELLED: { className: 'bg-muted/10 text-muted', labelKey: 'statusCancelled' },
} as const satisfies Record<RunStatus, { className: string; labelKey: string }>;

// The two statuses a run can still be stopped from. Everything else has already
// ended — cancelling those isn't an error, just pointless, so no button.
export const STOPPABLE: RunStatus[] = ['ENQUEUED', 'RUNNING'];

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const t = useTranslations('Runs');
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.CANCELLED;

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${badge.className}`}>
      {t(badge.labelKey)}
    </span>
  );
}
