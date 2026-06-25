'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { ConnectorJobResponse, ConnectorJobKind, PagedResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  ArrowPathIcon,
  BoltIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const REFRESH_OPTIONS = [
  { value: null, label: 'Off' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
] as const;

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

const KIND_OPTIONS: ConnectorJobKind[] = ['SYSTEM', 'AGENT', 'USER'];

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

export default function ConnectorJobsTab() {
  const t = useTranslations('ConnectorJobs');
  const [pagedData, setPagedData] = useState<PagedResponse<ConnectorJobResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [actingIds, setActingIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ConnectorJobResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [refreshOpen, setRefreshOpen] = useState(false);
  const refreshRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [kindFilter, setKindFilter] = useState<ConnectorJobKind | ''>('');
  const [codeFilter, setCodeFilter] = useState('');
  const debouncedCodeFilter = useDebouncedValue(codeFilter.trim(), 300);

  const fetchData = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await apiService.getConnectorJobs({
        connectorCode: debouncedCodeFilter || undefined,
        kind: kindFilter || undefined,
        page,
        size: pageSize,
      });
      setPagedData(data);
      if (silent) setError('');
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load connector jobs');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, pageSize, kindFilter, debouncedCodeFilter]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    if (refreshInterval === null) return;
    const intervalId = setInterval(() => {
      fetchData(true);
    }, refreshInterval * 1000);
    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (refreshRef.current && !refreshRef.current.contains(e.target as Node)) {
        setRefreshOpen(false);
      }
    };
    if (refreshOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [refreshOpen]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const runAction = async (id: string, action: () => Promise<void>) => {
    setActingIds(prev => new Set(prev).add(id));
    setActionError('');
    try {
      await action();
      await fetchData(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('actionFailed'));
    } finally {
      setActingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleRunNow = async (id: string) => {
    setActingIds(prev => new Set(prev).add(id));
    setActionError('');
    try {
      // Fire-and-forget: 200 means "queued". The actual run happens within ~1s.
      await apiService.runConnectorJobNow(id);
      await fetchData(true);
      // Re-fetch after a short delay so the user sees the status transition (PENDING → RUNNING → …).
      setTimeout(() => { fetchData(true); }, 1500);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('actionFailed'));
    } finally {
      setActingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError('');
    try {
      await apiService.deleteConnectorJob(deleteTarget.id);
      setDeleteTarget(null);
      await fetchData(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('actionFailed'));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const formatDateTimeFull = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
      return dateStr;
    }
  };

  const formatDateTimeShort = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
        return time;
      }
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${time}`;
    } catch {
      return dateStr;
    }
  };

  const formatInterval = (totalSeconds: number) => {
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
  };

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

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const jobs = pagedData?.content ?? [];
  const totalElements = pagedData?.totalElements ?? 0;
  const totalPages = pagedData?.totalPages ?? 0;
  const hasFilters = kindFilter !== '' || debouncedCodeFilter !== '';

  const currentLabel = REFRESH_OPTIONS.find((o) => o.value === refreshInterval)?.label ?? 'Off';

  const refreshControls = (
    <div className="flex items-center gap-2">
      <div ref={refreshRef} className="relative">
        <button
          onClick={() => setRefreshOpen((v) => !v)}
          className="px-2 py-1 rounded-lg bg-surface-secondary text-xs font-medium text-muted hover:text-foreground transition-colors"
        >
          {refreshInterval === null ? 'Auto' : currentLabel}
        </button>
        {refreshOpen && (
          <div className="absolute right-0 mt-1 rounded-lg bg-surface-secondary shadow-lg border border-border py-1 z-50 min-w-[48px]">
            {REFRESH_OPTIONS.map(({ value, label }) => (
              <button
                key={label}
                onClick={() => {
                  setRefreshInterval(value);
                  setRefreshOpen(false);
                }}
                className={`block w-full px-3 py-1 text-xs font-medium transition-colors ${
                  value === refreshInterval
                    ? 'text-accent'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => fetchData(false)}
        className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
        title="Refresh"
      >
        <ArrowPathIcon className="h-4 w-4" />
      </button>
    </div>
  );

  const filters = (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={codeFilter}
        onChange={(e) => {
          setCodeFilter(e.target.value);
          setPage(0);
        }}
        placeholder={t('filterByConnector')}
        className="bg-surface-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground placeholder:text-muted w-40"
      />
      <select
        value={kindFilter}
        onChange={(e) => {
          setKindFilter(e.target.value as ConnectorJobKind | '');
          setPage(0);
        }}
        className="bg-surface-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground"
      >
        <option value="">{t('allKinds')}</option>
        {KIND_OPTIONS.map((k) => (
          <option key={k} value={k}>{t(`kind.${k}`)}</option>
        ))}
      </select>
    </div>
  );

  const pagination = totalElements > 10 && (
    <div className="flex items-center justify-between pt-2">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span>{t('rowsPerPage')}:</span>
        <select
          value={pageSize}
          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          className="bg-surface-secondary border border-border rounded px-1.5 py-0.5 text-xs text-foreground"
        >
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span>
          {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} / {totalElements}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
            className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{refreshControls}</div>
        <ErrorAlert>{error}</ErrorAlert>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-muted">{t('loading')}</div>;
  }

  if (jobs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          {filters}
          {refreshControls}
        </div>
        {actionError && <ErrorAlert>{actionError}</ErrorAlert>}
        <div className="text-center py-12 text-muted">
          {hasFilters ? t('noJobsFiltered') : t('noJobs')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {filters}
          <div className="text-sm text-muted">{t('jobsTotal', { count: totalElements })}</div>
        </div>
        {refreshControls}
      </div>
      {actionError && <ErrorAlert>{actionError}</ErrorAlert>}
      <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('kindLabel')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('connector')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('job')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('schedule')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('nextRun')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('statusLabel')}</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted">{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const acting = actingIds.has(job.id);
            const canRunNow = job.status === 'PENDING' && job.pausedAt === null;
            const canPause = job.status !== 'COMPLETED' && job.pausedAt === null;
            const canResume = job.status !== 'COMPLETED' && job.pausedAt !== null;
            const canDelete = job.kind !== 'SYSTEM';
            const expanded = expandedIds.has(job.id);
            const hasDetails =
              (job.args && Object.keys(job.args).length > 0) ||
              (job.config && Object.keys(job.config).length > 0) ||
              job.lastError !== null;

            return (
              <tr key={job.id} className={`border-b border-border last:border-b-0 transition-colors ${
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
                  {job.identity && (
                    <div className="text-xs font-mono text-muted/60 truncate max-w-[150px] text-left" dir="rtl" title={job.identity}>
                      {job.identity}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 align-top">
                  <span className="text-sm font-medium text-foreground">{job.name}</span>
                  {hasDetails && (
                    <div>
                      <button
                        onClick={() => toggleExpand(job.id)}
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
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning"
                        title={formatDateTimeFull(job.pausedAt)}
                      >
                        {t('paused')}
                      </span>
                    )}
                    {job.lastError && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-error/10 text-error" title={job.lastError}>
                        {t('error')}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 align-top">
                  <div className="flex items-center justify-end gap-1">
                    {canRunNow && (
                      <button
                        onClick={() => handleRunNow(job.id)}
                        disabled={acting}
                        className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={t('runNow')}
                      >
                        <BoltIcon className="h-4 w-4" />
                      </button>
                    )}
                    {canPause && (
                      <button
                        onClick={() => runAction(job.id, () => apiService.pauseConnectorJob(job.id))}
                        disabled={acting}
                        className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={t('pause')}
                      >
                        <PauseIcon className="h-4 w-4" />
                      </button>
                    )}
                    {canResume && (
                      <button
                        onClick={() => runAction(job.id, () => apiService.resumeConnectorJob(job.id))}
                        disabled={acting}
                        className="p-1.5 rounded-lg text-muted hover:text-success hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={t('resume')}
                      >
                        <PlayIcon className="h-4 w-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeleteTarget(job)}
                        disabled={acting}
                        className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={t('delete')}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      {pagination}

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        title={t('deleteTitle')}
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            {t('deleteConfirm', { name: deleteTarget?.name ?? '' })}
          </p>
          <p className="text-sm text-muted">{t('deleteWarning')}</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t('cancel')}
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              {t('delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
