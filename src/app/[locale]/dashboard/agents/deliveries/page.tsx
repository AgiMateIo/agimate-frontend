'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { localeMap } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { ArrowLeftIcon, ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { WebhookDeliveryLog, AgentResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

const REFRESH_OPTIONS = [
  { value: null, label: 'Off' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
] as const;

export default function WebhookDeliveriesPage() {
  const t = useTranslations('Agents');
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];

  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [deliveries, setDeliveries] = useState<WebhookDeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [refreshOpen, setRefreshOpen] = useState(false);
  const refreshRef = useRef<HTMLDivElement>(null);
  const pageSize = 20;

  // Load agents on mount
  useEffect(() => {
    apiService.getAgentsList().then(r => setAgents(r.content)).catch(() => {});
  }, []);

  const fetchDeliveries = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const response = await apiService.getWebhookDeliveryLogs({
        agentPubId: selectedAgent || undefined,
        page,
        size: pageSize,
      });
      setDeliveries(response.content);
      setTotalElements(response.totalElements);
      setTotalPages(response.totalPages);
      if (silent) setError('');
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load delivery logs');
        setDeliveries([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedAgent, page]);

  useEffect(() => { fetchDeliveries(false); }, [fetchDeliveries]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval === null) return;
    const id = setInterval(() => fetchDeliveries(true), refreshInterval * 1000);
    return () => clearInterval(id);
  }, [refreshInterval, fetchDeliveries]);

  // Close refresh dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (refreshRef.current && !refreshRef.current.contains(e.target as Node)) setRefreshOpen(false);
    };
    if (refreshOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [refreshOpen]);

  // Reset page when filter changes
  useEffect(() => { setPage(0); }, [selectedAgent]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  const currentLabel = REFRESH_OPTIONS.find(o => o.value === refreshInterval)?.label ?? t('autoRefreshOff');

  // Render refresh controls inline
  const refreshControls = (
    <div className="flex items-center gap-2">
      <div ref={refreshRef} className="relative">
        <button onClick={() => setRefreshOpen(v => !v)} className="px-2 py-1 rounded-lg bg-surface-secondary text-xs font-medium text-muted hover:text-foreground transition-colors">
          {refreshInterval === null ? t('autoRefresh') : currentLabel}
        </button>
        {refreshOpen && (
          <div className="absolute right-0 mt-1 rounded-lg bg-surface-secondary shadow-lg border border-border py-1 z-50 min-w-[48px]">
            {REFRESH_OPTIONS.map(({ value, label }) => (
              <button key={label} onClick={() => { setRefreshInterval(value); setRefreshOpen(false); }}
                className={`block w-full px-3 py-1 text-xs font-medium transition-colors ${value === refreshInterval ? 'text-accent' : 'text-muted hover:text-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={() => fetchDeliveries(false)} className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary transition-colors" title={t('refresh')}>
        <ArrowPathIcon className="h-4 w-4" />
      </button>
    </div>
  );

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
      <div className="flex items-center justify-between gap-4">
        <select
          value={selectedAgent}
          onChange={e => setSelectedAgent(e.target.value)}
          className="px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-foreground"
        >
          <option value="">{t('allAgents')}</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        {refreshControls}
      </div>

      {/* Content */}
      {error ? (
        <ErrorAlert>{error}</ErrorAlert>
      ) : loading ? (
        <div className="text-center py-12 text-muted">{t('loadingAgents')}</div>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-12 text-muted">{t('noDeliveries')}</div>
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
                      {d.errorMessage ? (
                        <span className="text-sm text-error truncate max-w-xs block" title={d.errorMessage}>{d.errorMessage}</span>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-border">
              <p className="text-sm text-muted">
                {t('page', { current: page + 1, total: totalPages })}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-surface-secondary text-foreground hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
                  <ChevronLeftIcon className="h-4 w-4" /> {t('previous')}
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-surface-secondary text-foreground hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
                  {t('next')} <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
