'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { TriggerLog } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const REFRESH_OPTIONS = [
  { value: null, label: 'Off' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
] as const;

export default function TriggerLogsTab() {
  const t = useTranslations('Devices');
  const [logs, setLogs] = useState<TriggerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [refreshOpen, setRefreshOpen] = useState(false);
  const refreshRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await apiService.getTriggerLogs();
      setLogs(data);
      if (silent) setError('');
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load trigger logs');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
      return dateStr;
    }
  };

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

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{refreshControls}</div>
        <ErrorAlert>{error}</ErrorAlert>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-muted">{t('loadingTriggerLogs')}</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{refreshControls}</div>
        <div className="text-center py-12 text-muted">{t('noTriggerLogs')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">
          {logs.length} {logs.length === 1 ? 'log' : 'logs'} total
        </div>
        {refreshControls}
      </div>
      <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('createdAt')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('occurredAt')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('triggerName')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('deviceId')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('triggerData')}</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors">
              <td className="py-3 px-4">
                <span className="text-sm text-muted">{formatDateTime(log.createdAt)}</span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-muted">{formatDateTime(log.occurredAt)}</span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm font-medium text-foreground">{log.triggerName}</span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm font-mono text-muted">{log.linkedDeviceId}</span>
              </td>
              <td className="py-3 px-4">
                {log.triggerData && Object.keys(log.triggerData).length > 0 ? (
                  <div>
                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium transition-colors"
                    >
                      <span className="max-w-[200px] truncate font-mono">
                        {JSON.stringify(log.triggerData)}
                      </span>
                      <span className="shrink-0">{expandedIds.has(log.id) ? '▲' : '▼'}</span>
                    </button>
                    {expandedIds.has(log.id) && (
                      <pre className="mt-2 p-3 bg-background rounded-lg text-xs font-mono text-foreground/80 overflow-x-auto max-w-md">
                        {JSON.stringify(log.triggerData, null, 2)}
                      </pre>
                    )}
                  </div>
                ) : (
                  <span className="text-muted text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
