'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChatBubbleOvalLeftEllipsisIcon, PlusIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import WebchatSessionsPane from '@/components/webchat/WebchatSessionsPane';
import WebchatConversation from '@/components/webchat/WebchatConversation';
import { WebchatComposerProvider } from '@/components/webchat/composerStore';
import AgentMcpUnavailable from '@/components/agents/AgentMcpUnavailable';
import { useAgentDetailSuspenseQuery } from '@/queries/agents';
import { useWebchatCacheActions, useWebchatSessionsQuery } from '@/queries/webchat';
import { useLiveSessionRows } from '@/queries/chat-sessions';
import { useResyncEpoch } from '@/realtime/usePersonalChannel';
import { getErrorMessage } from '@/utils/error';
import { isMcpAgent } from '@/utils/agent';
import type { AgentResponse } from '@/types';

export default function AgentChatPage() {
  const agentId = useParams().id as string;
  const { data: agent } = useAgentDetailSuspenseQuery(agentId);

  // A webchat session would implicitly create a channel, and the backend answers
  // 400 for an MCP agent — so the split happens before any session request.
  if (isMcpAgent(agent.type)) {
    return <AgentMcpUnavailable agentId={agentId} section="chat" />;
  }

  return <AgentChatView agent={agent} />;
}

function AgentChatView({ agent }: { agent: AgentResponse }) {
  const t = useTranslations('Chat');
  const agentId = agent.id;

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState('');
  // Below `md` the two panes don't fit side by side, so one is shown at a time.
  // The conversation wins by default — same reasoning as auto-selecting the
  // newest session: land where the user left off, not on a picker.
  const [mobilePane, setMobilePane] = useState<'list' | 'conversation'>('conversation');

  const sessionsQuery = useWebchatSessionsQuery(agentId);
  const { addSession, patchSession, invalidateSessions } = useWebchatCacheActions();

  const agentsById = useMemo(() => ({ [agent.id]: agent }), [agent]);
  const sessions = sessionsQuery.sessions;
  // Land straight in the newest conversation rather than an empty frame — the
  // backend sorts by lastActivityAt desc, so sessions[0] is where the user left off.
  // The choice is then pinned (a state update during render, not an effect):
  // live rows reorder the list, and a chat started on another device arrives
  // on top — neither may swap the open conversation. One that disappears from
  // the list still falls back to the newest.
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? null;
  if (activeSession && activeSession.id !== activeSessionId) setActiveSessionId(activeSession.id);

  // Titles, badges, previews and "working…" of every row, live. The server
  // counts the unread itself, and the open conversation marks its messages
  // read on arrival, so the row on screen needs no special case here.
  useLiveSessionRows();
  const resyncEpoch = useResyncEpoch();

  const error =
    actionError ||
    (sessionsQuery.error ? getErrorMessage(sessionsQuery.error, 'Failed to load chat data') : '');

  const handleNewSession = async () => {
    if (creating) return;
    setCreating(true);
    setActionError('');
    try {
      const session = await apiService.createWebchatSession(agentId);
      addSession(session);
      setActiveSessionId(session.id);
      setMobilePane('conversation');
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to create session'));
    } finally {
      setCreating(false);
    }
  };

  return (
    // Above the conversation's `key={sessionId}` remount on purpose: the draft
    // text and the attachment tray of every session opened on this screen live
    // in here, and switching between them must not clear either.
    <WebchatComposerProvider>
      <div className="flex h-full min-h-[420px] flex-col gap-4">
        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex flex-1 min-h-0 bg-surface rounded-xl border border-border overflow-hidden">
          {/* Both panes stay mounted; below `md` only one is displayed at a time. */}
          <WebchatSessionsPane
            className={mobilePane === 'list' ? 'flex' : 'hidden'}
            agents={[agent]}
            agentsById={agentsById}
            selectedAgentId={agentId}
            onAgentChange={() => {}}
            sessions={sessions}
            sessionsLoading={sessionsQuery.isPending}
            activeSessionId={activeSession?.id ?? null}
            onSelectSession={(sessionId) => {
              setActiveSessionId(sessionId);
              setMobilePane('conversation');
            }}
            onNewSession={handleNewSession}
            creating={creating}
            hasMoreSessions={sessionsQuery.hasNextPage}
            loadingMoreSessions={sessionsQuery.isFetchingNextPage}
            onLoadMoreSessions={() => sessionsQuery.fetchNextPage()}
            hideAgentFilter
          />

          <div
            className={`${mobilePane === 'conversation' ? 'flex' : 'hidden'} flex-1 min-w-0 flex-col md:flex`}
          >
            {activeSession ? (
              <WebchatConversation
                // The epoch rebuilds the thread from history after a reconnect
                // that could not recover the messages it missed.
                key={`${activeSession.id}:${resyncEpoch}`}
                session={activeSession}
                agentName={agent.name}
                onSessionUpdated={patchSession}
                onActivity={invalidateSessions}
                onBack={() => setMobilePane('list')}
              />
            ) : sessionsQuery.isPending ? (
              <div className="flex-1 grid place-items-center text-sm text-muted">
                {t('loadingSessions')}
              </div>
            ) : (
              // Only reachable with zero sessions now that the newest one is
              // auto-selected — so it opens the first chat instead of asking the
              // user to pick from an empty list.
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                <ChatBubbleOvalLeftEllipsisIcon className="h-12 w-12 text-muted/50" />
                <div className="text-sm font-medium text-foreground">{t('noSessionsTitle')}</div>
                <div className="text-sm text-muted max-w-sm">{t('noSessionsHint')}</div>
                <Button onClick={handleNewSession} loading={creating}>
                  <PlusIcon className="h-4 w-4" />
                  {t('newSession')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </WebchatComposerProvider>
  );
}
