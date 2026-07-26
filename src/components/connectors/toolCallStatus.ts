import type { ToolCallStatus, ToolUseLogResponse } from '@/types';

// DENY rows never executed, so they carry no SUCCESS/ERROR/PENDING status —
// the badge is derived client-side from accessEffect + finishAt/error (spec §3).
export type RowStatus = ToolCallStatus | 'DENIED';

export const STATUS_BADGE = {
  SUCCESS: { className: 'bg-success/10 text-success', labelKey: 'statusSuccess' },
  ERROR: { className: 'bg-error/10 text-error', labelKey: 'statusError' },
  PENDING: { className: 'bg-muted/10 text-muted', labelKey: 'statusPending' },
  DENIED: { className: 'bg-warning/10 text-warning', labelKey: 'statusDenied' },
} as const satisfies Record<RowStatus, { className: string; labelKey: string }>;

export const getRowStatus = (log: ToolUseLogResponse): RowStatus => {
  if (log.accessEffect === 'DENY') return 'DENIED';
  if (log.error) return 'ERROR';
  if (log.finishAt) return 'SUCCESS';
  return 'PENDING';
};
