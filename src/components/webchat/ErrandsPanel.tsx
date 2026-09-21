'use client';

import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ChevronDownIcon, QueueListIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';
import { Modal } from '@/components/ui/Modal';
import SessionTranscript from '@/components/sessions/SessionTranscript';
import { useErrandSessionsQuery } from '@/queries/chat-sessions';
import { agentDetailOptions } from '@/queries/agents';
import { formatDateTimeShort } from '@/utils/date';
import type { ChatSessionResponse } from '@/types';

// One errand, read-only: what the worker was sent to do and what it said back.
// Nothing here can be written to — a person talks to the agent, the agent talks
// to its copies and to its team.
function ErrandSessionModal({
  session,
  agentName,
  onClose,
}: {
  session: ChatSessionResponse;
  agentName?: string;
  onClose: () => void;
}) {
  const t = useTranslations('Errands');

  return (
    <Modal isOpen onClose={onClose} title={session.title || t('untitledErrand')} size="xl">
      <div className="flex items-center justify-between gap-3 text-xs text-muted">
        <span className="flex items-center gap-2">
          {formatDateTimeShort(session.lastActivityAt)}
          {/* Whose branch this is, where that is not the agent of the chat. */}
          {agentName && <span className="text-foreground">{agentName}</span>}
        </span>
        {/* Where the work itself is: the tool calls, the reasoning, the spend.
            The transcript is only what the worker said. */}
        <Link
          href={`/dashboard/agents/${session.agentId}/runs?sessionId=${session.id}`}
          className="flex items-center gap-1 text-accent transition-colors hover:text-accent/80"
        >
          <QueueListIcon className="h-3.5 w-3.5" />
          {t('viewRuns')}
        </Link>
      </div>
      {/* The transcript fills whatever height it is given; the modal's own
          scroll would otherwise fight the list's. */}
      <div className="flex h-[60vh] min-h-0 flex-col">
        <SessionTranscript sessionId={session.id} />
      </div>
    </Modal>
  );
}

/**
 * The errands one conversation handed out.
 *
 * An agent can hand parts of a task to copies of itself, and — with a team
 * around it — to another agent of that team. Either way the work gets a session
 * of its own that runs in the background, and the agent answers the chat once
 * they have all reported. Until then the conversation shows nothing at all
 * about them, which is what this panel is for.
 *
 * A branch of another agent belongs to *that* agent: its session carries the
 * addressee's `agentId`, and the row names it — without the name the reader has
 * no way to tell who is working. Copies of the agent itself carry its own id
 * and are named by their errand alone.
 *
 * Renders nothing when the conversation never delegated anything, which is most
 * of them. No badges and no stop button: these sessions carry no unread count
 * (only webchat does), and stopping the conversation stops them with it.
 */
export default function ErrandsPanel({
  sessionId,
  agentId,
}: {
  sessionId: string;
  agentId: string;
}) {
  const t = useTranslations('Errands');
  const [expanded, setExpanded] = useState(false);
  const [openSession, setOpenSession] = useState<ChatSessionResponse | null>(null);

  const { data: sessions } = useErrandSessionsQuery(sessionId);

  // One request per *other* agent in the list, and none at all for the common
  // case of an agent delegating only to itself. The rows come back with an
  // `agentId` and nothing else about the agent, and the detail cache is shared
  // with that agent's own pages.
  const foreignIds = [
    ...new Set((sessions ?? []).map((s) => s.agentId).filter((id) => id !== agentId)),
  ];
  const foreignAgents = useQueries({
    queries: foreignIds.map((id) => agentDetailOptions(id)),
    combine: (results) =>
      new Map(results.flatMap((r) => (r.data ? [[r.data.id, r.data.name] as const] : []))),
  });

  if (!sessions || sessions.length === 0) return null;

  const running = sessions.filter((s) => s.isRunning).length;
  // Undefined for the agent's own copies — their branch needs no attribution.
  const nameOf = (session: ChatSessionResponse) =>
    session.agentId === agentId ? undefined : foreignAgents.get(session.agentId);

  return (
    <div className="shrink-0 border-b border-border bg-surface-secondary/40">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-secondary sm:px-4"
      >
        <UserGroupIcon className="h-4 w-4 shrink-0 text-muted" />
        <span className="text-xs font-medium text-foreground">
          {t('count', { count: sessions.length })}
        </span>
        {/* The one live fact: the chat stays silent until the last of them is
            done, so "still working" is the answer to "why no reply yet". */}
        {running > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-accent">
            <span className="flex shrink-0 gap-0.5">
              <span className="h-1 w-1 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1 w-1 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1 w-1 rounded-full bg-accent animate-bounce" />
            </span>
            {t('runningCount', { count: running })}
          </span>
        )}
        <ChevronDownIcon
          className={`ml-auto h-4 w-4 shrink-0 text-muted transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="max-h-48 overflow-y-auto px-2 pb-2 space-y-1">
          {sessions.map((s) => {
            const worker = nameOf(s);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setOpenSession(s)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-secondary"
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    s.isRunning ? 'bg-accent animate-pulse' : 'bg-muted'
                  }`}
                />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                  {s.title || t('untitledErrand')}
                </span>
                {/* Who is doing it, on a branch that belongs to another agent.
                    Missing while that agent's row is still loading — the errand
                    itself is the point of the line, the name is context. */}
                {worker && (
                  <span className="max-w-[40%] shrink-0 truncate text-[11px] text-muted">
                    {worker}
                  </span>
                )}
                <span className="shrink-0 text-[11px] tabular-nums text-muted">
                  {s.isRunning ? t('working') : formatDateTimeShort(s.lastActivityAt)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {openSession && (
        <ErrandSessionModal
          session={openSession}
          agentName={nameOf(openSession)}
          onClose={() => setOpenSession(null)}
        />
      )}
    </div>
  );
}
