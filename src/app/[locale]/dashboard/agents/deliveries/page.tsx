'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { localeMap } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Select } from '@/components/ui/FormField';
import { RefreshControls } from '@/components/ui/RefreshControls';
import { usePagedLogsQuery } from '@/queries/logs';
import { allAgentsOptions } from '@/queries/agents';
import { parseBackendDate } from '@/utils/date';
import { Placeholder } from '@/components/ui/Placeholder';
import { Pagination } from '@/components/ui/Pagination';

export default function WebhookDeliveriesPage() {
  const t = useTranslations('Agents');
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];

  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const agentsQuery = useQuery(allAgentsOptions());
  const agents = agentsQuery.data?.content ?? [];

  const {
    content: deliveries,
    totalElements,
    totalPages,
    pageSize,
    loading,
    error,
    page,
    setPage,
    refreshInterval,
    setRefreshInterval,
    refresh,
  } = usePagedLogsQuery(
    'webhook-deliveries',
    [selectedAgent],
    ({ page, size }) =>
      apiService.getWebhookDeliveryLogs({
        agentId: selectedAgent || undefined,
        page,
        size,
      }),
    { defaultError: 'Failed to load delivery logs' },
  );

  const handleAgentChange = (agentId: string) => {
    setSelectedAgent(agentId);
    setPage(0);
  };

  const formatDate = (dateString: string) => {
    const date = parseBackendDate(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat(bcp47Locale, {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(date);
  };

  const getStatusBadge = (code: number) => {
    if (code >= 200 && code < 300) return 'bg-success/10 text-success border-success/20';
    if (code >= 400 && code < 500) return 'bg-warning/10 text-warning border-warning/20';
    if (code >= 500) return 'bg-error/10 text-error border-error/20';
    return 'bg-muted/10 text-muted border-muted/20';
  };

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <Link href="/dashboard/agents" className="flex items-center gap-2 text-muted hover:text-foreground transition-colors">
        <ArrowLeftIcon className="h-4 w-4" />
        <span className="text-sm">{t('backToAgents')}</span>
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('deliveriesTitle')}</h1>
        <p className="text-muted mt-1">{t('deliveriesSubtitle')}</p>
      </div>

      {/* Filter + Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Select
          size="sm"
          fullWidth={false}
          value={selectedAgent}
          onChange={e => handleAgentChange(e.target.value)}
        >
          <option value="">{t('allAgents')}</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
        <RefreshControls
          value={refreshInterval}
          onChange={setRefreshInterval}
          onRefresh={refresh}
        />
      </div>

      {/* Content */}
      {error ? (
        <ErrorAlert>{error}</ErrorAlert>
      ) : loading ? (
        <Placeholder>{t('loadingAgents')}</Placeholder>
      ) : deliveries.length === 0 ? (
        <Placeholder>{t('noDeliveries')}</Placeholder>
      ) : (
        <div className="bg-surface rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('status')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('url')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('duration')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('errorMessage')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('deliveredAt')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('success')}</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map(d => (
                  <tr key={d.id} className="border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors">
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(d.responseStatusCode)}`}>
                        {d.responseStatusCode}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-mono text-muted truncate max-w-xs block">{d.requestUrl}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-foreground">{d.durationMs}ms</span>
                    </td>
                    <td className="py-3 px-4">
                      {d.error ? (
                        <span className="text-sm text-error truncate max-w-xs block" title={d.error}>{d.error}</span>
                      ) : (
                        <span className="text-sm text-muted">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-muted">{formatDate(d.deliveredAt)}</span>
                    </td>
                    <td className="py-3 px-4">
                      {d.success ? (
                        <CheckCircleIcon className="h-5 w-5 text-success" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-error" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 pb-4">
            <Pagination
              page={page}
              pageSize={pageSize}
              totalElements={totalElements}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
