'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { STATUS_BADGE, getRowStatus } from '@/components/connectors/toolCallStatus';
import { Link } from '@/i18n/navigation';
import { allAgentsOptions } from '@/queries/agents';
import { useActivityFeed } from '@/queries/dashboard';
import { formatDateTimeFull, formatDateTimeShort } from '@/utils/date';

export default function ActivityFeed({
  refreshSeconds,
}: {
  refreshSeconds: number | null;
}) {
  const t = useTranslations('DashboardHome');
  // Status labels belong to the log tab's namespace — same words, same source.
  const tLogs = useTranslations('Connectors');
  const { logs, loading, error } = useActivityFeed(refreshSeconds);

  const { data: agents } = useQuery(allAgentsOptions());
  const agentNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of agents?.content ?? []) map.set(a.id, a.name);
    return map;
  }, [agents]);

  return (
    <section className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-baseline justify-between gap-4 px-1">
        <h2 className="font-semibold text-foreground">{t('activityTitle')}</h2>
        <Link
          href="/dashboard/tool-use-logs"
          className="text-sm font-medium text-accent transition-colors hover:text-accent/80"
        >
          {t('viewAll')} →
        </Link>
      </div>

      {error !== null ? (
        <ErrorAlert>{error || t('loadFailed')}</ErrorAlert>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-surface-secondary" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted">{t('activityEmpty')}</p>
      ) : (
        <ul className="divide-y divide-border">
          {logs.map((log) => {
            const status = getRowStatus(log);
            const agentName = agentNames.get(log.agentId);

            return (
              <li key={log.id} className="flex items-center gap-3 px-1 py-2">
                <span
                  className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted"
                  title={formatDateTimeFull(log.createdAt)}
                >
                  {formatDateTimeShort(log.createdAt)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-sm text-foreground">
                    {log.name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {[agentName, log.connectorCode].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status].className}`}
                >
                  {tLogs(STATUS_BADGE[status].labelKey)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
