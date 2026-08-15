'use client';

import { useTranslations } from 'next-intl';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { formatDateTimeShort } from '@/utils/date';
import type { AgentResponse, WebchatSessionResponse } from '@/types';

interface WebchatSessionsPaneProps {
  agents: AgentResponse[];
  agentsById: Record<string, AgentResponse>;
  selectedAgentId: string; // '' = all agents
  onAgentChange: (agentId: string) => void;
  sessions: WebchatSessionResponse[];
  sessionsLoading: boolean;
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  creating: boolean;
  // Sessions arrive one page at a time; older ones load on demand.
  hasMoreSessions?: boolean;
  loadingMoreSessions?: boolean;
  onLoadMoreSessions?: () => void;
  // Agent-scoped chat (an agent's Chat section): the agent is fixed by the route,
  // so hide the agent picker and always allow starting a session.
  hideAgentFilter?: boolean;
  // Display utility only (`flex`/`hidden`): below `md` the page shows one pane at
  // a time. The width stays here so the pane always has a definite one.
  className?: string;
}

// One line of "what was last said". Who said it matters as much as the text, so
// an own message is prefixed; a message that was only attachments says so rather
// than rendering as a blank line (`text` is legitimately null there, and it is
// cut to 160 characters server-side).
function SessionPreview({ session }: { session: WebchatSessionResponse }) {
  const t = useTranslations('Chat');
  const last = session.lastMessage;
  const body = last ? (last.text ?? (last.hasAttachments ? t('previewAttachment') : '')) : '';
  if (!last || !body) return t('previewEmpty');
  return last.direction === 'USER' ? t('previewYou', { text: body }) : body;
}

export default function WebchatSessionsPane({
  agents,
  agentsById,
  selectedAgentId,
  onAgentChange,
  sessions,
  sessionsLoading,
  activeSessionId,
  onSelectSession,
  onNewSession,
  creating,
  hasMoreSessions = false,
  loadingMoreSessions = false,
  onLoadMoreSessions,
  hideAgentFilter = false,
  className = 'flex',
}: WebchatSessionsPaneProps) {
  const t = useTranslations('Chat');
  const tCommon = useTranslations('Common');

  return (
    // A definite width in both modes — full screen on a phone, a fixed column
    // from `md` up. Never `flex-1`: a flex item's `min-width: auto` is its
    // min-content, so a grow-based pane refuses to go narrower than its rows and
    // spills over the conversation. The divider only exists next to one.
    <div
      className={`${className} w-full shrink-0 flex-col min-h-0 overflow-hidden border-border md:flex md:w-72 md:border-r`}
    >
      {/* One 4rem row, the same height as the conversation's header next to it
          (and as the dashboard's top bar): the two dividers sit on one line, and
          a step between them reads as a misaligned pane. Only the filterless
          variant can promise that height — with the agent selector above the
          button the header is as tall as its contents. */}
      <div
        className={`border-b border-border ${
          hideAgentFilter ? 'flex h-16 shrink-0 items-center px-3 sm:px-4' : 'p-4 space-y-3'
        }`}
      >
        {!hideAgentFilter && (
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              {t('agentFilterLabel')}
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => onAgentChange(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-base text-foreground focus:outline-none sm:text-sm focus:ring-2 focus:ring-accent"
            >
              <option value="">{t('allAgents')}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <Button
          onClick={onNewSession}
          loading={creating}
          disabled={!selectedAgentId}
          className="w-full"
          title={!selectedAgentId ? t('selectAgentHint') : undefined}
        >
          <PlusIcon className="h-4 w-4" />
          {t('newSession')}
        </Button>
        {!hideAgentFilter && !selectedAgentId && (
          <p className="text-xs text-muted">{t('selectAgentHint')}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">
        {sessionsLoading ? (
          <div className="text-center py-8 text-muted text-sm">{t('loadingSessions')}</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 px-3 text-muted text-sm">{t('noSessions')}</div>
        ) : (
          <>
            {sessions.map((s) => {
              const isActive = s.sessionId === activeSessionId;
              const agentName = agentsById[s.agentId]?.name ?? s.agentId.slice(0, 8);
              // The open conversation is being read right now: it is marked read
              // on open and on every arriving reply, so a count that survives a
              // refetch racing that call is stale by definition.
              const unread = s.unreadCount > 0 && !isActive;
              return (
                <button
                  key={s.sessionId}
                  onClick={() => onSelectSession(s.sessionId)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors
                    ${isActive
                      ? 'bg-accent/10 border border-accent/40'
                      : 'border border-transparent hover:bg-surface-secondary'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`truncate text-sm text-foreground ${unread ? 'font-semibold' : 'font-medium'}`}
                    >
                      {s.title || t('untitledSession')}
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted">
                      {formatDateTimeShort(s.lastMessageAt)}
                    </span>
                  </div>
                  {/* The line the eye lands on second: what was last said, or
                      that the agent is still working on it. The badge sits at its
                      right end rather than by the title — the count belongs to
                      the message, and the timestamp already owns that corner. */}
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    {s.isRunning ? (
                      <span className="flex min-w-0 items-center gap-1.5 text-xs text-accent">
                        <span className="flex shrink-0 gap-0.5">
                          <span className="h-1 w-1 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
                          <span className="h-1 w-1 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
                          <span className="h-1 w-1 rounded-full bg-accent animate-bounce" />
                        </span>
                        <span className="truncate">{t('working')}</span>
                      </span>
                    ) : (
                      <span
                        className={`min-w-0 flex-1 truncate text-xs ${unread ? 'text-foreground' : 'text-muted'}`}
                      >
                        <SessionPreview session={s} />
                      </span>
                    )}
                    <span className="ml-auto flex shrink-0 items-center gap-1.5">
                      {s.closedAt && (
                        <span className="rounded bg-surface-secondary px-1.5 py-0.5 text-[10px] text-muted">
                          {t('closedBadge')}
                        </span>
                      )}
                      {unread && (
                        <span
                          aria-label={t('unreadCount', { count: s.unreadCount })}
                          className="min-w-[1.25rem] rounded-full bg-accent px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none tabular-nums text-accent-foreground"
                        >
                          {s.unreadCount > 99 ? '99+' : s.unreadCount}
                        </span>
                      )}
                    </span>
                  </div>
                  {!hideAgentFilter && (
                    <div className="mt-0.5 truncate text-[11px] text-muted">{agentName}</div>
                  )}
                </button>
              );
            })}
            {hasMoreSessions && (
              <button
                type="button"
                onClick={onLoadMoreSessions}
                disabled={loadingMoreSessions}
                className="w-full px-3 py-2 text-xs text-accent transition-colors hover:text-accent/80 disabled:opacity-50"
              >
                {loadingMoreSessions ? t('loadingSessions') : tCommon('loadMore')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
