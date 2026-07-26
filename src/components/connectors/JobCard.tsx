'use client';

import { useTranslations } from 'next-intl';
import type { ComponentType, SVGProps } from 'react';
import {
  ArrowPathIcon,
  BoltIcon,
  CalendarDaysIcon,
  ClockIcon,
  ForwardIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { ConnectorJobResponse, ConnectorJobKind, ConnectorJobType } from '@/types';
import { formatDateTimeFull, formatDateTimeShort } from '@/utils/date';
import { Chip, type ChipTone } from '@/components/ui/Chip';

// The schedule kind is what distinguishes one job from another at a glance, so
// it drives the icon tile (same tile as the tool/trigger/skill cards).
const TYPE_ICON: Record<ConnectorJobType, ComponentType<SVGProps<SVGSVGElement>>> = {
  PERIODIC: ArrowPathIcon,
  CRON: CalendarDaysIcon,
  ONETIME: ClockIcon,
};

const KIND_TONE: Record<ConnectorJobKind, ChipTone> = {
  SYSTEM: 'default',
  AGENT: 'accent',
  USER: 'success',
};

const STATUS_TONE: Record<ConnectorJobResponse['status'], ChipTone> = {
  PENDING: 'default',
  RUNNING: 'success',
  COMPLETED: 'default',
};

function formatInterval(totalSeconds: number) {
  if (totalSeconds <= 0) return `${totalSeconds}s`;
  const units: [number, string][] = [[86400, 'd'], [3600, 'h'], [60, 'm'], [1, 's']];
  const parts: string[] = [];
  let rest = totalSeconds;
  for (const [size, suffix] of units) {
    const n = Math.floor(rest / size);
    if (n > 0) {
      parts.push(`${n}${suffix}`);
      rest -= n * size;
    }
    if (parts.length === 2) break;
  }
  return parts.join(' ');
}

interface JobCardProps {
  job: ConnectorJobResponse;
  isExpanded: boolean;
  acting: boolean;
  onToggleExpand: () => void;
  onRunNow: () => void;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
}

// Card form of a connector job, for lists scoped to one connection: the connector
// code and connection id are the page's own context and are dropped, schedule /
// next run / created collapse into one chip row, and the raw args+config JSON
// stays behind "details". The last error is the one thing a user acts on, so it
// shows on the card itself.
export function JobCard({
  job,
  isExpanded,
  acting,
  onToggleExpand,
  onRunNow,
  onPause,
  onResume,
  onDelete,
}: JobCardProps) {
  const t = useTranslations('ConnectorJobs');

  const Icon = TYPE_ICON[job.type];

  const schedule =
    job.type === 'PERIODIC'
      ? t('every', { interval: formatInterval(Number(job.config?.intervalSeconds ?? 0)) })
      : job.type === 'CRON'
        ? [job.config?.cron, job.config?.zone].filter(Boolean).join(' ')
        : t('oneTime');

  const canRunNow = job.status === 'PENDING' && job.pausedAt === null;
  const canPause = job.status !== 'COMPLETED' && job.pausedAt === null;
  const canResume = job.status !== 'COMPLETED' && job.pausedAt !== null;
  const canDelete = job.kind !== 'SYSTEM';
  const hasDetails =
    (job.args && Object.keys(job.args).length > 0) ||
    (job.config && Object.keys(job.config).length > 0);

  return (
    <div
      className={`rounded-lg border p-4 ${
        job.lastError ? 'border-error/30 bg-error/5' : 'border-border bg-surface-secondary'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground break-all">{job.name}</span>
            <Chip tone={KIND_TONE[job.kind]}>{t(`kind.${job.kind}`)}</Chip>
            <Chip tone={STATUS_TONE[job.status]}>{t(`status.${job.status}`)}</Chip>
            {job.pausedAt && (
              <span title={formatDateTimeFull(job.pausedAt)}>
                <Chip tone="warning">{t('paused')}</Chip>
              </span>
            )}
          </div>

          {/* Schedule, next run and creation date as one metadata row. */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Chip icon={ClockIcon}>{schedule}</Chip>
            {job.nextRunAt && (
              <span title={formatDateTimeFull(job.nextRunAt)}>
                <Chip icon={ForwardIcon}>
                  {t('nextRun')}: {formatDateTimeShort(job.nextRunAt)}
                </Chip>
              </span>
            )}
            <span title={formatDateTimeFull(job.createdAt)}>
              <Chip icon={CalendarDaysIcon}>
                {t('createdLabel')}: {formatDateTimeShort(job.createdAt)}
              </Chip>
            </span>
          </div>

          {job.lastError && (
            <div className="mt-2">
              <div className="text-xs text-muted">{t('lastError')}</div>
              <pre className="mt-1 p-3 bg-error/5 rounded-lg text-xs font-mono text-error overflow-x-auto whitespace-pre-wrap">
                {job.lastError}
              </pre>
            </div>
          )}

          {hasDetails && (
            <div className="mt-2">
              <button
                onClick={onToggleExpand}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium transition-colors"
              >
                <span>{t('details')}</span>
                <span className="shrink-0">{isExpanded ? '▲' : '▼'}</span>
              </button>
              {isExpanded && (
                <div className="mt-2 space-y-2 max-w-md">
                  {job.args && Object.keys(job.args).length > 0 && (
                    <div>
                      <div className="text-xs text-muted">{t('args')}</div>
                      <pre className="mt-1 p-3 bg-background rounded-lg text-xs font-mono text-foreground/80 overflow-x-auto">
                        {JSON.stringify(job.args, null, 2)}
                      </pre>
                    </div>
                  )}
                  {job.config && Object.keys(job.config).length > 0 && (
                    <div>
                      <div className="text-xs text-muted">{t('config')}</div>
                      <pre className="mt-1 p-3 bg-background rounded-lg text-xs font-mono text-foreground/80 overflow-x-auto">
                        {JSON.stringify(job.config, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {canRunNow && (
            <button
              onClick={onRunNow}
              disabled={acting}
              className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={t('runNow')}
            >
              <BoltIcon className="h-4 w-4" />
            </button>
          )}
          {canPause && (
            <button
              onClick={onPause}
              disabled={acting}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={t('pause')}
            >
              <PauseIcon className="h-4 w-4" />
            </button>
          )}
          {canResume && (
            <button
              onClick={onResume}
              disabled={acting}
              className="p-1.5 rounded-lg text-muted hover:text-success hover:bg-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={t('resume')}
            >
              <PlayIcon className="h-4 w-4" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              disabled={acting}
              className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={t('delete')}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
