'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { allAgentsOptions } from '@/queries/agents';
import { useWebchatCacheActions, webchatSessionsOptions } from '@/queries/webchat';
import { useWebchatActivitySubscription } from '@/realtime/useWebchatActivitySubscription';
import { formatDateTimeFull, formatDateTimeShort } from '@/utils/date';

const RECENT_SIZE = 5;

export default function RecentChats() {
  const t = useTranslations('DashboardHome');
  const tChat = useTranslations('Chat');
  // Same key as the dashboard counters — no second request.
  const { data: sessions, isPending } = useQuery(webchatSessionsOptions());
  const { data: agents } = useQuery(allAgentsOptions());
  const { applyActivity } = useWebchatCacheActions();

  // No conversation is open here, so every delivered agent message counts —
  // this card is exactly the case the personal-channel event exists for.
  useWebchatActivitySubscription(applyActivity);

  const agentNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of agents?.content ?? []) map.set(a.id, a.name);
    return map;
  }, [agents]);

  // Closed sessions are the user's own deletions, so they stay out. The newest
  // page is enough for a five-row card — the list is sorted by activity.
  const recent = useMemo(
    () =>
      (sessions?.content ?? [])
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
                  <span
                    className={`block truncate text-sm text-foreground ${
                      session.unreadCount > 0 ? 'font-semibold' : ''
                    }`}
                  >
                    {session.title || t('chatUntitled')}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {agentNames.get(session.agentId) ?? session.agentId}
                    {/* Whether the agent is still working is the one thing worth
                        knowing before opening a chat from here. */}
                    {session.isRunning && (
                      <span className="text-accent"> · {tChat('working')}</span>
                    )}
                  </span>
                </span>
                {session.unreadCount > 0 && (
                  <span
                    aria-label={tChat('unreadCount', { count: session.unreadCount })}
                    className="min-w-[1.25rem] shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none tabular-nums text-accent-foreground"
                  >
                    {session.unreadCount > 99 ? '99+' : session.unreadCount}
                  </span>
                )}
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
