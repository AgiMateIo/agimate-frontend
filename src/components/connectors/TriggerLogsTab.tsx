'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { RefreshControls } from '@/components/ui/RefreshControls';
import { Pagination } from '@/components/ui/Pagination';
import { usePagedLogsQuery } from '@/queries/logs';
import { formatDateTimeFull, formatDateTimeShort } from '@/utils/date';

export default function TriggerLogsTab() {
  const t = useTranslations('Connectors');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const {
    content: logs,
    totalElements,
    totalPages,
    loading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    refreshInterval,
    setRefreshInterval,
    refresh,
  } = usePagedLogsQuery(
    'trigger-logs',
    [],
    (params) => apiService.getTriggerLogs(params),
    { defaultError: 'Failed to load trigger logs' },
  );

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

  const refreshControls = (
    <RefreshControls value={refreshInterval} onChange={setRefreshInterval} onRefresh={refresh} />
  );

  const pagination = (
    <Pagination
      page={page}
      pageSize={pageSize}
      totalElements={totalElements}
      totalPages={totalPages}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      rowsPerPageLabel={t('rowsPerPage')}
    />
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
          {totalElements} {totalElements === 1 ? 'log' : 'logs'} total
        </div>
        {refreshControls}
      </div>
      <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('occurredAt')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('connectorCode')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('identity')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('triggerName')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('triggerInput')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('agentCount')}</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors">
              <td className="py-3 px-4">
                <span className="text-sm text-muted" title={formatDateTimeFull(log.occurredAt)}>
                  {formatDateTimeShort(log.occurredAt)}
                </span>
                <div className="text-xs text-muted/60" title={formatDateTimeFull(log.createdAt)}>
                  {formatDateTimeShort(log.createdAt)}
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm font-mono text-muted">{log.connectorCode}</span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm font-mono text-muted truncate block max-w-[150px] dir-rtl text-left" dir="rtl" title={log.identity}>{log.identity}</span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm font-medium text-foreground">{log.name}</span>
              </td>
              <td className="py-3 px-4">
                {log.input && Object.keys(log.input).length > 0 ? (
                  <div>
                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium transition-colors"
                    >
                      <span className="max-w-[200px] truncate font-mono">
                        {JSON.stringify(log.input)}
                      </span>
                      <span className="shrink-0">{expandedIds.has(log.id) ? '\u25B2' : '\u25BC'}</span>
                    </button>
                    {expandedIds.has(log.id) && (
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
                <span className="text-sm text-muted">{log.agentsCount}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {pagination}
    </div>
  );
}
