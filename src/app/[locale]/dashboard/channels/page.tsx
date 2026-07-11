'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { AgentResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { formatDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import { channelsListOptions } from '@/queries/channels';
import { allAgentsOptions } from '@/queries/agents';

export default function ChannelsPage() {
  const t = useTranslations('Channels');
  const locale = useLocale();
  const channelsQuery = useQuery(channelsListOptions());
  const agentsQuery = useQuery(allAgentsOptions());

  const loading = channelsQuery.isPending || agentsQuery.isPending;
  const queryError = channelsQuery.error ?? agentsQuery.error;
  const error = queryError ? getErrorMessage(queryError, 'Failed to load channels') : '';

  const agents = useMemo(() => {
    const map: Record<string, AgentResponse> = {};
    agentsQuery.data?.content.forEach((a) => { map[a.id] = a; });
    return map;
  }, [agentsQuery.data]);

  const rows = channelsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('pageTitle')}</h1>
        <p className="text-sm text-muted mt-1">{t('pageSubtitle')}</p>
      </div>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="bg-surface rounded-xl border border-border p-6">
        {loading ? (
          <div className="text-center py-12 text-muted text-sm">{t('loading')}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-muted text-sm">{t('noChannels')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wide">{t('colName')}</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wide">{t('colAgent')}</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wide">{t('colHandler')}</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wide">{t('colSource')}</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wide">{t('colUpdatedAt')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const agent = agents[c.agentId];
                  const href = `/dashboard/agents/${c.agentId}`;
                  return (
                    <tr key={c.id} className="border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors">
                      <td className="py-3 px-4 text-sm">
                        <Link href={href} className="text-accent hover:text-accent/80 transition-colors">
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {agent ? (
                          <Link href={href} className="hover:text-accent transition-colors">
                            {agent.name}
                          </Link>
                        ) : (
                          <span className="text-muted font-mono">{c.agentId.slice(0, 8)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className="font-mono text-foreground">{c.channelHandler}</span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="flex flex-col gap-0.5 max-w-[260px]">
                          <span className="font-mono text-foreground truncate">{c.connectorCode}</span>
                          <span className="text-muted truncate">{c.connectionName || c.connectionId?.slice(0, 8) || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted">
                        {formatDate(c.updatedAt, locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
