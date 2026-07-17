'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { RefreshControls } from '@/components/ui/RefreshControls';
import { Pagination } from '@/components/ui/Pagination';
import { usePagedLogsQuery } from '@/queries/logs';
import { connectionsListOptions } from '@/queries/connections';
import { formatDateTimeFull, formatDateTimeShort } from '@/utils/date';

export default function TriggerLogsTab() {
  const t = useTranslations('Connectors');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [connectorFilter, setConnectorFilter] = useState('');

  // Resolve connectionId → human-readable name, and provide the connector
  // options for the filter. All scopes, since triggers can fire on any of them.
  const { data: connections } = useQuery(connectionsListOptions(undefined, 'ALL'));

  const connectionsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of connections ?? []) {
      map.set(c.id, c.name || c.fullCode || c.id);
    }
    return map;
  }, [connections]);

  const connectorOptions = useMemo(() => {
    return Array.from(new Set((connections ?? []).map((c) => c.connectorCode))).sort();
  }, [connections]);

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
    [connectorFilter],
    (params) => apiService.getTriggerLogs({ ...params, connectorCode: connectorFilter || undefined }),
    { defaultError: t('loadTriggerLogsError') },
  );

  const handleConnectorChange = (code: string) => {
    setConnectorFilter(code);
    setPage(0);
  };

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

  const filter = (
    <div className="relative">
      <select
        value={connectorFilter}
        onChange={(e) => handleConnectorChange(e.target.value)}
        className="appearance-none bg-surface-secondary border border-border rounded-lg pl-3 pr-8 py-1.5 text-sm text-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
      >
        <option value="">{t('allConnectors')}</option>
        {connectorOptions.map((code) => (
          <option key={code} value={code}>{code}</option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
    </div>
  );

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
        <div className="flex items-center justify-between gap-4">
          {filter}
          {refreshControls}
        </div>
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
        <div className="flex items-center justify-between gap-4">
          {filter}
          {refreshControls}
        </div>
        <div className="text-center py-12 text-muted">
          {connectorFilter ? t('noTriggerLogsFiltered') : t('noTriggerLogs')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {filter}
          <div className="text-sm text-muted">{t('triggerLogsTotal', { count: totalElements })}</div>
        </div>
        {refreshControls}
      </div>
      <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('occurredAt')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('triggerName')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('triggerInput')}</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('agentCount')}</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const connectionName = connectionsById.get(log.connectionId);
            return (
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
                <div className="text-sm font-medium text-foreground">{log.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted" title={log.connectionId}>
                  <span className="font-mono text-muted/70">{log.connectorCode}</span>
                  {connectionName && (
                    <>
                      <span className="text-muted/50">&ndash;</span>
                      <span className="truncate max-w-[160px]">{connectionName}</span>
                    </>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                {log.input && Object.keys(log.input).length > 0 ? (
                  <div>
                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium transition-colors"
                    >
                      <span className="max-w-[340px] truncate font-mono">
                        {JSON.stringify(log.input)}
                      </span>
                      <span className="shrink-0">{expandedIds.has(log.id) ? '▲' : '▼'}</span>
                    </button>
                    {expandedIds.has(log.id) && (
                      <pre className="mt-2 p-3 bg-background rounded-lg text-xs font-mono text-foreground/80 overflow-x-auto max-w-xl">
                        {JSON.stringify(log.input, null, 2)}
                      </pre>
                    )}
                  </div>
                ) : (
                  <span className="text-muted text-xs">&mdash;</span>
                )}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`text-sm ${
                    log.agentsCount === 0
                      ? 'text-error'
                      : log.agentsCount > 3
                        ? 'font-bold text-foreground'
                        : 'text-muted'
                  }`}
                >
                  {log.agentsCount}
                </span>
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
