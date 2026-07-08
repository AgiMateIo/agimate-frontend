'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ChatBubbleOvalLeftEllipsisIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import WebchatSessionsPane from '@/components/webchat/WebchatSessionsPane';
import WebchatConversation from '@/components/webchat/WebchatConversation';
import { allAgentsOptions } from '@/queries/agents';
import { useWebchatCacheActions, useWebchatSessionsQuery } from '@/queries/webchat';
import { getErrorMessage } from '@/utils/error';
import type { AgentResponse } from '@/types';

export default function ChatPage() {
  const t = useTranslations('Chat');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState('');

  const agentsQuery = useQuery(allAgentsOptions());
  const sessionsQuery = useWebchatSessionsQuery(selectedAgentId || undefined);
  const { addSession, patchSession, invalidateSessions } = useWebchatCacheActions();

  const agents = useMemo(() => agentsQuery.data?.content ?? [], [agentsQuery.data]);
  const agentsById = useMemo(() => {
    const map: Record<string, AgentResponse> = {};
    agents.forEach((a) => {
      map[a.id] = a;
    });
    return map;
  }, [agents]);

  const sessions = sessionsQuery.data ?? [];
  const activeSession = sessions.find((s) => s.sessionId === activeSessionId) ?? null;

  const queryError = agentsQuery.error ?? sessionsQuery.error;
  const error =
    actionError || (queryError ? getErrorMessage(queryError, 'Failed to load chat data') : '');

  const handleNewSession = async () => {
    if (!selectedAgentId || creating) return;
    setCreating(true);
    setActionError('');
    try {
      const session = await apiService.createWebchatSession(selectedAgentId);
      addSession(session);
      setActiveSessionId(session.sessionId);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to create session'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] min-h-0 gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-foreground">{t('pageTitle')}</h1>
        <p className="text-sm text-muted mt-1">{t('pageSubtitle')}</p>
      </div>

      {error && (
        <div className="shrink-0">
          <ErrorAlert>{error}</ErrorAlert>
        </div>
      )}

      <div className="flex-1 min-h-0 flex bg-surface rounded-xl border border-border overflow-hidden">
        <WebchatSessionsPane
          agents={agents}
          agentsById={agentsById}
          selectedAgentId={selectedAgentId}
          onAgentChange={setSelectedAgentId}
          sessions={sessions}
          sessionsLoading={sessionsQuery.isPending}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewSession={handleNewSession}
          creating={creating}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          {activeSession ? (
            <WebchatConversation
              key={activeSession.sessionId}
              session={activeSession}
              agentName={
                agentsById[activeSession.agentId]?.name ?? activeSession.agentId.slice(0, 8)
              }
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
