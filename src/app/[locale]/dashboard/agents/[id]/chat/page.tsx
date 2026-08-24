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
import { useWebchatActivitySubscription } from '@/realtime/useWebchatActivitySubscription';
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
  const { addSession, patchSession, invalidateSessions, applyActivity } = useWebchatCacheActions();

  const agentsById = useMemo(() => ({ [agent.id]: agent }), [agent]);
  const sessions = sessionsQuery.sessions;
  // Land straight in the newest conversation rather than an empty frame — the
  // backend sorts by lastMessageAt desc, so sessions[0] is where the user left off.
  // Derived instead of an effect: nothing to sync, and a session that disappears
  // from the list falls back to the newest on its own.
  const activeSession =
    sessions.find((s) => s.sessionId === activeSessionId) ?? sessions[0] ?? null;

  // Badges for the conversations the user is *not* in. The open one has its own
  // per-session subscription, renders the message itself and marks it read on
  // arrival — counting it here would raise a badge for a message on screen.
  useWebchatActivitySubscription((p) => {
    if (p.sessionId === activeSession?.sessionId) return;
    applyActivity(p);
  });

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
      setActiveSessionId(session.sessionId);
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
            activeSessionId={activeSession?.sessionId ?? null}
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
                key={activeSession.sessionId}
                session={activeSession}
                agentName={agent.name}
                onSessionClosed={patchSession}
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
