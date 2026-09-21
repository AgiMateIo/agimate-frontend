'use client';

import { useTranslations } from 'next-intl';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Chip, type ChipTone } from '@/components/ui/Chip';
import type { AgentRequestRow, AgentRequestStatus } from '@/types';

// How a branch is doing, in one pill. `STALLED` is deliberately not the
// accent of WORKING: the errand was handed over and its run never reached the
// queue, so nothing is happening and nothing will — a warning, not progress.
const TONES: Record<AgentRequestStatus, ChipTone> = {
  WORKING: 'accent',
  DONE: 'success',
  FAILED: 'error',
  CANCELLED: 'muted',
  STALLED: 'warning',
};

const ICONS: Record<AgentRequestStatus, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  WORKING: ArrowPathIcon,
  DONE: CheckCircleIcon,
  FAILED: XCircleIcon,
  CANCELLED: NoSymbolIcon,
  STALLED: ExclamationTriangleIcon,
};

// Exported: the filter pills label the same five statuses, and two lists of
// them drift. `as const`, because next-intl types `t()` against the message
// keys — a widened `string` here is not a key it will accept.
export const STATUS_LABEL_KEYS = {
  WORKING: 'statusWorking',
  DONE: 'statusDone',
  FAILED: 'statusFailed',
  CANCELLED: 'statusCancelled',
  STALLED: 'statusStalled',
} as const satisfies Record<AgentRequestStatus, string>;

export function AgentRequestStatusChip({ status }: { status: AgentRequestStatus }) {
  const t = useTranslations('AgentRequests');
  return (
    <Chip
      strong
      tone={TONES[status]}
      icon={ICONS[status]}
      title={status === 'STALLED' ? t('statusStalledHint') : undefined}
    >
      {t(STATUS_LABEL_KEYS[status])}
    </Chip>
  );
}

// The addressee answered and the answer never reached the sender's
// conversation. Finished as far as the work goes, unfinished as far as the
// conversation that asked for it goes — which is the whole of the difference
// and nothing on the row would otherwise show it.
export function isReportUndelivered(request: AgentRequestRow): boolean {
  return request.status === 'DONE' && request.lastReport?.reportedAt === null;
}

export function UndeliveredReportChip() {
  const t = useTranslations('AgentRequests');
  return (
    <Chip tone="warning" icon={ExclamationTriangleIcon} title={t('reportUndeliveredHint')}>
      {t('reportUndelivered')}
    </Chip>
  );
}
