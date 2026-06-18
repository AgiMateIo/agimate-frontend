'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { ToolUseLogResponse, PagedResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const REFRESH_OPTIONS = [
  { value: null, label: 'Off' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
] as const;

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

export default function ToolUseLogsTab() {
  const t = useTranslations('Connectors');
  const [pagedData, setPagedData] = useState<PagedResponse<ToolUseLogResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [refreshOpen, setRefreshOpen] = useState(false);
  const refreshRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const fetchData = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await apiService.getToolUseLogs({ page, size: pageSize });
      setPagedData(data);
      if (silent) setError('');
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load tool use logs');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, pageSize]);

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

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const logs = pagedData?.content ?? [];
  const totalElements = pagedData?.totalElements ?? 0;
  const totalPages = pagedData?.totalPages ?? 0;

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
    return <div className="text-center py-12 text-muted">{t('loadingToolUseLogs')}</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{refreshControls}</div>
        <div className="text-center py-12 text-muted">{t('noToolUseLogs')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">
          {totalElements} {totalElements === 1 ? 'log' : 'logs'} total
        </div>
        {refreshControls}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('createdAt')}</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('connectorCode')}</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('identity')}</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('toolName')}</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('toolInput')}</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('accessEffect')}</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('outputAt')}</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('outputOrError')}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const hasError = !!log.error;
              const rowColor = hasError
                ? 'bg-error/5 hover:bg-error/10'
                : log.output !== null
                  ? 'bg-success/5 hover:bg-success/10'
                  : 'hover:bg-surface-secondary';

              return (
                <tr key={log.id} className={`border-b border-border last:border-b-0 transition-colors ${rowColor}`}>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted" title={formatDateTimeFull(log.createdAt)}>
                      {formatDateTimeShort(log.createdAt)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-muted">{log.connectorCode}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-muted truncate block max-w-[150px] dir-rtl text-left" dir="rtl" title={log.identity}>{log.identity}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-foreground font-mono">{log.name}</span>
                  </td>
                  <td className="py-3 px-4">
                    {log.input && Object.keys(log.input).length > 0 ? (
                      <div>
                        <button
                          onClick={() => toggleExpand(`input-${log.id}`)}
                          className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium transition-colors"
                        >
                          <span className="max-w-[200px] truncate font-mono">
                            {JSON.stringify(log.input)}
                          </span>
                          <span className="shrink-0">{expandedIds.has(`input-${log.id}`) ? '\u25B2' : '\u25BC'}</span>
                        </button>
                        {expandedIds.has(`input-${log.id}`) && (
                          <pre className="mt-2 p-3 bg-background rounded-lg text-xs font-mono text-foreground/80 overflow-x-auto max-w-md">
                            {JSON.stringify(log.input, null, 2)}
                          </pre>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted text-xs">&mdash;</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      log.accessEffect === 'ALLOW'
                        ? 'bg-success/10 text-success'
                        : 'bg-error/10 text-error'
                    }`}>
                      {log.accessEffect}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted">
                      {log.finishAt ? formatDateTimeShort(log.finishAt) : '\u2014'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {hasError ? (
                      <span className="text-sm text-error">{log.error}</span>
                    ) : log.output !== null ? (
                      <div>
                        <button
                          onClick={() => toggleExpand(`output-${log.id}`)}
                          className="flex items-center gap-1 text-xs text-success hover:text-success/80 font-medium transition-colors"
                        >
                          <span className="max-w-[200px] truncate font-mono">
                            {log.output}
                          </span>
                          <span className="shrink-0">{expandedIds.has(`output-${log.id}`) ? '\u25B2' : '\u25BC'}</span>
                        </button>
                        {expandedIds.has(`output-${log.id}`) && (
                          <pre className="mt-2 p-3 bg-background rounded-lg text-xs font-mono text-foreground/80 overflow-x-auto max-w-md whitespace-pre-wrap">
                            {log.output}
                          </pre>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted text-xs">{t('pending')}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pagination}
    </div>
  );
}
