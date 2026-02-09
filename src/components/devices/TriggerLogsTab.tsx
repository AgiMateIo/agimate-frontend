'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { localeMap } from '@/i18n/routing';
import apiService from '@/services/api';
import { TriggerLog } from '@/types';
import { UI } from '@/config/constants';

export default function TriggerLogsTab() {
  const t = useTranslations('Devices');
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];
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
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat(bcp47Locale, UI.DATE_FORMAT_OPTIONS).format(date);
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
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="bg-surface rounded-xl border border-border p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-foreground">{log.triggerName}</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                  {log.triggerType}
                </span>
              </div>
              <div className="text-sm text-muted mt-2 space-y-1">
                <p>
                  <span className="text-foreground/70">{t('triggerSource')}:</span>{' '}
                  {log.triggerSource}
                </p>
                <p>
                  <span className="text-foreground/70">{t('triggerId')}:</span>{' '}
                  <span className="font-mono text-xs">{log.triggerId}</span>
                </p>
                <p>
                  <span className="text-foreground/70">{t('deviceId')}:</span>{' '}
                  <span className="font-mono text-xs">{log.linkedDeviceId}</span>
                </p>
                <p>
                  <span className="text-foreground/70">{t('occurredAt')}:</span>{' '}
                  {formatDateTime(log.occurredAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Collapsible trigger data */}
          {log.triggerData && Object.keys(log.triggerData).length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <button
                onClick={() => toggleExpand(log.id)}
                className="text-sm text-accent hover:text-accent/80 font-medium transition-colors"
              >
                {t('triggerData')} {expandedIds.has(log.id) ? '▲' : '▼'}
              </button>
              {expandedIds.has(log.id) && (
                <pre className="mt-2 p-3 bg-background rounded-lg text-xs font-mono text-foreground/80 overflow-x-auto">
                  {JSON.stringify(log.triggerData, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
