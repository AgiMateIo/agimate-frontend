'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { allAgentsOptions } from '@/queries/agents';
import { webchatSessionsOptions } from '@/queries/webchat';
import { formatDateTimeFull, formatDateTimeShort } from '@/utils/date';

const RECENT_SIZE = 5;

export default function RecentChats() {
  const t = useTranslations('DashboardHome');
  // Same key as the dashboard counters — no second request.
  const { data: sessions, isPending } = useQuery(webchatSessionsOptions());
  const { data: agents } = useQuery(allAgentsOptions());

  const agentNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of agents?.content ?? []) map.set(a.id, a.name);
    return map;
  }, [agents]);

  // Closed sessions are the user's own deletions, so they stay out.
  const recent = useMemo(
    () =>
      (sessions ?? [])
        .filter((s) => s.closedAt === null)
        .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
        .slice(0, RECENT_SIZE),
    [sessions],
  );

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-2 px-1 font-semibold text-foreground">{t('chatsTitle')}</h2>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-surface-secondary" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted">{t('chatsEmpty')}</p>
      ) : (
        <ul className="divide-y divide-border">
          {recent.map((session) => (
            <li key={session.sessionId}>
              <Link
                href={`/dashboard/agents/${session.agentId}/chat`}
                className="flex items-center gap-3 px-1 py-2 transition-colors hover:bg-surface-secondary"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">
                    {session.title || t('chatUntitled')}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {agentNames.get(session.agentId) ?? session.agentId}
                  </span>
                </span>
                <span
                  className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted"
                  title={formatDateTimeFull(session.lastMessageAt)}
                >
                  {formatDateTimeShort(session.lastMessageAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
