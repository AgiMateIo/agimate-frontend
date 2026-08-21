'use client';

import { useTranslations } from 'next-intl';
import { ConnectorJobResponse, ConnectorJobKind } from '@/types';
import { formatDateTimeFull, formatDateTimeShort } from '@/utils/date';
import { Chip } from '@/components/ui/Chip';
import {
  BoltIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const KIND_BADGE: Record<ConnectorJobKind, string> = {
  SYSTEM: 'bg-surface-secondary text-muted',
  AGENT: 'bg-accent/10 text-accent',
  USER: 'bg-success/10 text-success',
};

const STATUS_BADGE: Record<ConnectorJobResponse['status'], string> = {
  PENDING: 'bg-surface-secondary text-muted',
  RUNNING: 'bg-success/10 text-success',
  COMPLETED: 'bg-surface-secondary text-muted/60',
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

interface JobRowProps {
  job: ConnectorJobResponse;
  isExpanded: boolean;
  acting: boolean;
  onToggleExpand: () => void;
  onRunNow: () => void;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
}

export function JobRow({
  job,
  isExpanded,
  acting,
  onToggleExpand,
  onRunNow,
  onPause,
  onResume,
  onDelete,
}: JobRowProps) {
  const t = useTranslations('ConnectorJobs');

  const tCommon = useTranslations('Common');
  const renderSchedule = (job: ConnectorJobResponse) => {
    if (job.type === 'PERIODIC') {
      const interval = Number(job.config?.intervalSeconds ?? 0);
      return (
        <span className="text-sm text-foreground">{t('every', { interval: formatInterval(interval) })}</span>
      );
    }
    if (job.type === 'CRON') {
      return (
        <div>
          <span className="text-sm font-mono text-foreground">{String(job.config?.cron ?? '')}</span>
          {job.config?.zone ? (
            <div className="text-xs text-muted">{String(job.config.zone)}</div>
          ) : null}
        </div>
      );
    }
    return <span className="text-sm text-foreground">{t('oneTime')}</span>;
  };

  const canRunNow = job.status === 'PENDING' && job.pausedAt === null;
  const canPause = job.status !== 'COMPLETED' && job.pausedAt === null;
  const canResume = job.status !== 'COMPLETED' && job.pausedAt !== null;
  const canDelete = job.kind !== 'SYSTEM';
  const expanded = isExpanded;
  const hasDetails =
    (job.args && Object.keys(job.args).length > 0) ||
    (job.config && Object.keys(job.config).length > 0) ||
    job.lastError !== null;

  return (
    <tr className={`border-b border-border last:border-b-0 transition-colors ${
      job.lastError ? 'bg-error/5 hover:bg-error/10' : 'hover:bg-surface-secondary'
    }`}>
      <td className="py-3 px-4 align-top">
        <span
          className={`inline-flex items-center justify-center h-5 w-5 text-xs font-medium rounded-full ${KIND_BADGE[job.kind]}`}
          title={t(`kind.${job.kind}`)}
        >
          {t(`kindShort.${job.kind}`)}
        </span>
      </td>
      <td className="py-3 px-4 align-top">
        <span className="text-sm font-mono text-muted">{job.connectorCode}</span>
        {job.connectionId && (
          <div className="text-xs font-mono text-muted/60 truncate max-w-[150px] text-left" dir="rtl" title={job.connectionId}>
            {job.connectionId}
          </div>
        )}
      </td>
      <td className="py-3 px-4 align-top">
        <span className="text-sm font-medium text-foreground">{job.name}</span>
        {hasDetails && (
          <div>
            <button
              onClick={onToggleExpand}
              className="mt-1 flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium transition-colors"
            >
              <span>{t('details')}</span>
              <span className="shrink-0">{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && (
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
                {job.lastError && (
                  <div>
                    <div className="text-xs text-muted">{t('lastError')}</div>
                    <pre className="mt-1 p-3 bg-error/5 rounded-lg text-xs font-mono text-error overflow-x-auto whitespace-pre-wrap">
                      {job.lastError}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </td>
      <td className="py-3 px-4 align-top">{renderSchedule(job)}</td>
      <td className="py-3 px-4 align-top">
        {job.nextRunAt ? (
          <span className="text-sm text-foreground" title={formatDateTimeFull(job.nextRunAt)}>
            {formatDateTimeShort(job.nextRunAt)}
          </span>
        ) : (
          <span className="text-muted text-xs">&mdash;</span>
        )}
        <div className="text-xs text-muted/60" title={formatDateTimeFull(job.createdAt)}>
          {formatDateTimeShort(job.createdAt)}
        </div>
      </td>
      <td className="py-3 px-4 align-top">
        <div className="flex flex-wrap items-center gap-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[job.status]}`}>
            {t(`status.${job.status}`)}
          </span>
          {job.pausedAt && (
            <Chip strong tone="warning" title={formatDateTimeFull(job.pausedAt)}>
              {t('paused')}
            </Chip>
          )}
          {job.lastError && (
            <Chip strong tone="error" title={job.lastError}>
              {t('error')}
            </Chip>
          )}
        </div>
      </td>
      <td className="py-3 px-4 align-top">
        <div className="flex items-center justify-end gap-1">
          {canRunNow && (
            <button
              onClick={onRunNow}
              disabled={acting}
              className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={t('runNow')}
            >
              <BoltIcon className="h-4 w-4" />
            </button>
          )}
          {canPause && (
            <button
              onClick={onPause}
              disabled={acting}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={t('pause')}
            >
              <PauseIcon className="h-4 w-4" />
            </button>
          )}
          {canResume && (
            <button
              onClick={onResume}
              disabled={acting}
              className="p-1.5 rounded-lg text-muted hover:text-success hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={t('resume')}
            >
              <PlayIcon className="h-4 w-4" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              disabled={acting}
              className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={tCommon('delete')}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
