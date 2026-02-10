'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { TriggerLog } from '@/types';

export default function TriggerLogsTab() {
  const t = useTranslations('Devices');
  const [logs, setLogs] = useState<TriggerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const data = await apiService.getTriggerLogs();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trigger logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  if (loading) {
    return <div className="text-center py-12 text-muted">{t('loadingTriggerLogs')}</div>;
  }

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-lg p-4">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted">{t('noTriggerLogs')}</div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface border-b border-border text-left text-muted">
            <th className="px-4 py-3 font-medium whitespace-nowrap">{t('createdAt')}</th>
            <th className="px-4 py-3 font-medium whitespace-nowrap">{t('occurredAt')}</th>
            <th className="px-4 py-3 font-medium whitespace-nowrap">{t('triggerName')}</th>
            <th className="px-4 py-3 font-medium whitespace-nowrap">{t('deviceId')}</th>
            <th className="px-4 py-3 font-medium whitespace-nowrap">{t('triggerData')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {logs.map((log) => (
            <tr key={log.id} className="bg-surface hover:bg-surface/80 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDateTime(log.createdAt)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDateTime(log.occurredAt)}</td>
              <td className="px-4 py-3">
                <span className="text-foreground font-medium">{log.triggerName}</span>
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-xs text-muted">{log.linkedDeviceId}</span>
              </td>
              <td className="px-4 py-3">
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
  );
}
