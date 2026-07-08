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
}: WebchatSessionsPaneProps) {
  const t = useTranslations('Chat');

  return (
    <div className="w-72 shrink-0 border-r border-border flex flex-col min-h-0">
      <div className="p-4 border-b border-border space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">
            {t('agentFilterLabel')}
          </label>
          <select
            value={selectedAgentId}
            onChange={(e) => onAgentChange(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">{t('allAgents')}</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
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
        {!selectedAgentId && (
          <p className="text-xs text-muted">{t('selectAgentHint')}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">
        {sessionsLoading ? (
          <div className="text-center py-8 text-muted text-sm">{t('loadingSessions')}</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 px-3 text-muted text-sm">{t('noSessions')}</div>
        ) : (
          sessions.map((s) => {
            const isActive = s.sessionId === activeSessionId;
            const agentName = agentsById[s.agentId]?.name ?? s.agentId.slice(0, 8);
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
                  <span className="text-sm font-medium text-foreground truncate">
                    {s.title || t('untitledSession')}
                  </span>
                  {s.closedAt && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-surface-secondary text-muted">
                      {t('closedBadge')}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted">
                  <span className="truncate">{agentName}</span>
                  <span className="shrink-0">{formatDateTimeShort(s.lastMessageAt)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
