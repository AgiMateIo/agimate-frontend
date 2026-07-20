'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChatBubbleOvalLeftEllipsisIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import WebchatSessionsPane from '@/components/webchat/WebchatSessionsPane';
import WebchatConversation from '@/components/webchat/WebchatConversation';
import { useAgentDetailSuspenseQuery } from '@/queries/agents';
import { useWebchatCacheActions, useWebchatSessionsQuery } from '@/queries/webchat';
import { getErrorMessage } from '@/utils/error';

export default function AgentChatPage() {
  const t = useTranslations('Chat');
  const agentId = useParams().id as string;
  const { data: agent } = useAgentDetailSuspenseQuery(agentId);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState('');

  const sessionsQuery = useWebchatSessionsQuery(agentId);
  const { addSession, patchSession, invalidateSessions } = useWebchatCacheActions();

  const agentsById = useMemo(() => ({ [agent.id]: agent }), [agent]);
  const sessions = sessionsQuery.data ?? [];
  const activeSession = sessions.find((s) => s.sessionId === activeSessionId) ?? null;

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
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to create session'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="flex h-[calc(100vh-14rem)] min-h-[420px] bg-surface rounded-xl border border-border overflow-hidden">
        <WebchatSessionsPane
          agents={[agent]}
          agentsById={agentsById}
          selectedAgentId={agentId}
          onAgentChange={() => {}}
          sessions={sessions}
          sessionsLoading={sessionsQuery.isPending}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewSession={handleNewSession}
          creating={creating}
          hideAgentFilter
        />

        <div className="flex-1 min-w-0 flex flex-col">
          {activeSession ? (
            <WebchatConversation
              key={activeSession.sessionId}
              session={activeSession}
              agentName={agent.name}
              onSessionClosed={patchSession}
              onActivity={invalidateSessions}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <ChatBubbleOvalLeftEllipsisIcon className="h-12 w-12 text-muted/50" />
              <div className="text-sm font-medium text-foreground">{t('selectSessionTitle')}</div>
              <div className="text-sm text-muted max-w-sm">{t('selectSessionHint')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
