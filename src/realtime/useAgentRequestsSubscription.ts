'use client';

import { useEffect, useRef } from 'react';
import { subscribePersonalChannel } from './personalChannel';
import type { AgentRequestRow } from '@/types';

// What happened to a branch. `started` is a row nobody has seen yet; the other
// three carry a row that may already be on screen.
export type AgentRequestEventKind = 'started' | 'appended' | 'reported' | 'cancelled';

export interface AgentRequestSubscriptionHandlers {
  onRequest?: (kind: AgentRequestEventKind, row: AgentRequestRow) => void;
}

const KINDS: AgentRequestEventKind[] = ['started', 'appended', 'reported', 'cancelled'];

/**
 * The correspondence of one team, live.
 *
 * The events ride the shared personal channel (see personalChannel.ts), so the
 * team match happens here rather than as a server-side `tagsFilter` — and it
 * has to happen on the publication's **tags**: the payload is a list row, and a
 * list row says which agents are involved, never which team they are of.
 */
export function useAgentRequestsSubscription(
  teamId: string | null | undefined,
  handlers: AgentRequestSubscriptionHandlers,
) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!teamId) return;

    return subscribePersonalChannel(({ type, payload, tags }) => {
      if (!type.startsWith('agent.request.')) return;
      // An untagged event cannot be placed, and dropping it silently would look
      // exactly like a screen that never subscribed.
      if (!tags) {
        console.warn('[centrifugo] agent request event without tags:', type);
        return;
      }
      if (tags.teamId !== teamId) return;

      const kind = type.slice('agent.request.'.length) as AgentRequestEventKind;
      if (!KINDS.includes(kind)) {
        console.warn('[centrifugo] unknown agent request event:', type);
        return;
      }
      handlersRef.current.onRequest?.(kind, payload as AgentRequestRow);
    });
  }, [teamId]);
}
