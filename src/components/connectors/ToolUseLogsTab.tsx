'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import type { ToolCallStatus } from '@/types';
import { STATUS_BADGE, getRowStatus } from './toolCallStatus';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { RefreshControls } from '@/components/ui/RefreshControls';
import { Pagination } from '@/components/ui/Pagination';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { FilterPill, FilterRow } from '@/components/ui/FilterPill';
import { Select } from '@/components/ui/FormField';
import { usePagedLogsQuery } from '@/queries/logs';
import { connectionsListOptions } from '@/queries/connections';
import { agentConnectionsOptions } from '@/queries/agents';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatDateTimeFull, formatDateTimeShort } from '@/utils/date';
import { Placeholder } from '@/components/ui/Placeholder';

export type StatusFilter = 'ALL' | ToolCallStatus;
export type AccessFilter = 'ALL' | 'ALLOW' | 'DENY';

const STATUS_FILTERS: StatusFilter[] = ['ALL', 'SUCCESS', 'ERROR', 'PENDING'];

// Standalone on the tool-use-logs page; scoped to one agent when `agentId` is
// set (the agent page's Tool Calls tab — filter selectors then offer only the
// agent's bound connectors/connections). `initialStatus`/`initialAccess` only
// seed the filters, so the user can clear them like any other.
export default function ToolUseLogsTab({
  agentId,
  initialStatus = 'ALL',
  initialAccess = 'ALL',
}: {
  agentId?: string;
  initialStatus?: StatusFilter;
  initialAccess?: AccessFilter;
}) {
  const t = useTranslations('Connectors');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [accessFilter, setAccessFilter] = useState<AccessFilter>(initialAccess);
  const [connectorFilter, setConnectorFilter] = useState('ALL');
  const [connectionFilter, setConnectionFilter] = useState('ALL');

  // Resolve connectionId → human-readable name.
  const { data: connections } = useQuery(connectionsListOptions());
  const connectionsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of connections ?? []) {
      map.set(c.id, c.name || c.fullCode || c.id);
    }
    return map;
  }, [connections]);

  // Filter selectors need exact values: the agent's bound connections when
  // scoped, otherwise every connection of the user.
  const { data: agentConnections } = useQuery({
    ...agentConnectionsOptions(agentId ?? ''),
    enabled: !!agentId,
  });
  const filterSource = useMemo(
    () =>
      agentId
        ? (agentConnections ?? []).map((c) => ({
            connectionId: c.connectionId,
            connectorCode: c.connectorCode,
            label: c.name || c.fullCode || c.connectionId,
          }))
        : (connections ?? []).map((c) => ({
            connectionId: c.id,
            connectorCode: c.connectorCode,
            label: c.name || c.fullCode || c.id,
          })),
    [agentId, agentConnections, connections],
  );
  const connectorOptions = useMemo(
    () => [...new Set(filterSource.map((c) => c.connectorCode))].sort(),
    [filterSource],
  );
  const connectionOptions = useMemo(() => {
    const scoped = connectorFilter === 'ALL'
      ? filterSource
      : filterSource.filter((c) => c.connectorCode === connectorFilter);
    return [...new Map(scoped.map((c) => [c.connectionId, c])).values()];
  }, [filterSource, connectorFilter]);

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
    'tool-use-logs',
    [agentId ?? 'all', debouncedSearch, statusFilter, accessFilter, connectorFilter, connectionFilter],
    (params) =>
      apiService.getToolUseLogs({
        ...params,
        agentId,
        name: debouncedSearch || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        accessEffect: accessFilter === 'ALL' ? undefined : accessFilter,
        connectorCode: connectorFilter === 'ALL' ? undefined : connectorFilter,
        connectionId: connectionFilter === 'ALL' ? undefined : connectionFilter,
      }),
    { defaultError: t('loadToolUseLogsError') },
  );

  const filtersActive =
    statusFilter !== 'ALL' || accessFilter !== 'ALL' || connectorFilter !== 'ALL' || connectionFilter !== 'ALL';
  const anyFilterSet = filtersActive || debouncedSearch !== '';

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };
  const changeStatus = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(0);
  };
  const changeAccess = (value: AccessFilter) => {
    setAccessFilter(value);
    setPage(0);
  };
  const changeConnector = (value: string) => {
    setConnectorFilter(value);
    // The connection selector is scoped to the chosen connector — a previously
    // picked connection may no longer belong to it.
    setConnectionFilter('ALL');
    setPage(0);
  };
  const changeConnection = (value: string) => {
    setConnectionFilter(value);
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

  const toolbar = (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <SearchToolbar
          value={search}
          onChange={changeSearch}
          placeholder={t('searchToolsPlaceholder')}
          size="sm"
          filtersActive={filtersActive}
          filters={
            <div className="space-y-2">
              <FilterRow label={t('status')}>
                {STATUS_FILTERS.map((value) => (
                  <FilterPill key={value} active={statusFilter === value} onClick={() => changeStatus(value)}>
                    {value === 'ALL' ? t('filterAll') : t(STATUS_BADGE[value].labelKey)}
                  </FilterPill>
                ))}
              </FilterRow>
              <FilterRow label={t('accessEffect')}>
                <FilterPill active={accessFilter === 'ALL'} onClick={() => changeAccess('ALL')}>
                  {t('filterAll')}
                </FilterPill>
                <FilterPill active={accessFilter === 'ALLOW'} onClick={() => changeAccess('ALLOW')}>
                  {t('accessAllowed')}
                </FilterPill>
                <FilterPill active={accessFilter === 'DENY'} onClick={() => changeAccess('DENY')}>
                  {t('accessDenied')}
                </FilterPill>
              </FilterRow>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-52">
                  <Select value={connectorFilter} onChange={(e) => changeConnector(e.target.value)}>
                    <option value="ALL">{t('allConnectors')}</option>
                    {connectorOptions.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </Select>
                </div>
                <div className="w-52">
                  <Select
                    value={connectionFilter}
                    onChange={(e) => changeConnection(e.target.value)}
                    disabled={connectionOptions.length === 0}
                  >
                    <option value="ALL">{t('allConnections')}</option>
                    {connectionOptions.map((c) => (
                      <option key={c.connectionId} value={c.connectionId}>{c.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          }
        />
      </div>
      <RefreshControls value={refreshInterval} onChange={setRefreshInterval} onRefresh={refresh} />
    </div>
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
        {toolbar}
        <ErrorAlert>{error}</ErrorAlert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toolbar}
      {loading ? (
        <Placeholder>{t('loadingToolUseLogs')}</Placeholder>
      ) : logs.length === 0 ? (
        <Placeholder>
          {anyFilterSet ? t('noToolUseLogsFiltered') : t('noToolUseLogs')}
        </Placeholder>
      ) : (
        <>
          <div className="text-sm text-muted">{t('toolUseLogsTotal', { count: totalElements })}</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted w-32 whitespace-nowrap">{t('createdAt')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('toolName')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted w-full">{t('toolInput')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('status')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted whitespace-nowrap">{t('outputAt')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('outputOrError')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const status = getRowStatus(log);
                  const rowColor =
                    status === 'ERROR'
                      ? 'bg-error/5 hover:bg-error/10'
                      : status === 'DENIED'
                        ? 'bg-warning/5 hover:bg-warning/10'
                        : status === 'SUCCESS'
                          ? 'bg-success/5 hover:bg-success/10'
                          : 'hover:bg-surface-secondary';
                  const connectionName = log.connectionId ? connectionsById.get(log.connectionId) : undefined;

                  return (
                    <tr key={log.id} className={`border-b border-border last:border-b-0 transition-colors ${rowColor}`}>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted" title={formatDateTimeFull(log.createdAt)}>
                          {formatDateTimeShort(log.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div
                          className="text-sm font-medium text-foreground font-mono"
                          title={[
                            log.agentSessionId && `session: ${log.agentSessionId}`,
                            log.externalId && `call: ${log.externalId}`,
                          ].filter(Boolean).join('\n')}
                        >
                          {log.name}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted" title={log.connectionId ?? undefined}>
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
                              onClick={() => toggleExpand(`input-${log.id}`)}
                              className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium transition-colors"
                            >
                              <span className="max-w-[340px] truncate font-mono">
                                {JSON.stringify(log.input)}
                              </span>
                              <span className="shrink-0">{expandedIds.has(`input-${log.id}`) ? '▲' : '▼'}</span>
                            </button>
                            {expandedIds.has(`input-${log.id}`) && (
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
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_BADGE[status].className}`}>
                          {t(STATUS_BADGE[status].labelKey)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted">
                          {log.finishAt ? formatDateTimeShort(log.finishAt) : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {log.error ? (
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
                              <span className="shrink-0">{expandedIds.has(`output-${log.id}`) ? '▲' : '▼'}</span>
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
        </>
      )}
    </div>
  );
}
