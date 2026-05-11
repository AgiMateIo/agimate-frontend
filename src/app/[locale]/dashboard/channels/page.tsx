'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import { AgentResponse, ChannelResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { formatDate } from '@/utils/date';

export default function ChannelsPage() {
  const t = useTranslations('Channels');
  const locale = useLocale();
  const [channels, setChannels] = useState<ChannelResponse[]>([]);
  const [agents, setAgents] = useState<Record<string, AgentResponse>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiService.getChannels(),
      apiService.getAgentsList({ size: 200 }),
    ])
      .then(([ch, ag]) => {
        if (cancelled) return;
        setChannels(ch);
        const map: Record<string, AgentResponse> = {};
        ag.content.forEach((a) => { map[a.id] = a; });
        setAgents(map);
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load channels'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => channels, [channels]);

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
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wide">{t('colTrigger')}</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wide">{t('colReply')}</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted uppercase tracking-wide">{t('colUpdatedAt')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const agent = agents[c.agentPubId];
                  const href = `/dashboard/agents/${c.agentPubId}`;
                  return (
                    <tr key={c.pubId} className="border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors">
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
                          <span className="text-muted font-mono">{c.agentPubId.slice(0, 8)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-foreground">{c.triggerConnectorCode}</span>
                          <span className="text-muted truncate max-w-[220px]">
                            {(c.triggerIdentityName || c.triggerIdentity.slice(0, 8))} · <span className="font-mono">{c.triggerName}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-foreground">{c.replyConnectorCode}</span>
                          <span className="text-muted truncate max-w-[220px]">
                            {(c.replyIdentityName || c.replyIdentity.slice(0, 8))} · <span className="font-mono">{c.replyToolName}</span>
                          </span>
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
