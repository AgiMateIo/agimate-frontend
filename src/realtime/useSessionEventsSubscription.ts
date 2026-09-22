'use client';

import { useEffect, useRef } from 'react';
import { subscribePersonalChannel } from './personalChannel';
import type { ChatSessionResponse, SessionEvent } from '@/types';

/**
 * Session rows as they change — a new title, a read on another device, the
 * agent's answer, `isRunning` flipping — over the shared personal channel,
 * whatever connector carries the conversation. Each event is the listing's
 * row in full, so a consumer replaces, never counts: the badge is the
 * server's `unreadCount`, not a local `+1`.
 *
 * `webchat.agent.updated` (the per-agent contact row) goes out on the same
 * channel and is left alone here: the dashboard has no contacts screen, and a
 * per-agent total is never summed from session rows either.
 */
export function useSessionEventsSubscription(
  enabled: boolean,
  onEvent: (event: SessionEvent) => void,
) {
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;
    return subscribePersonalChannel(({ type, payload }) => {
      if (type !== 'session.created' && type !== 'session.updated') return;
      const session = payload as ChatSessionResponse | undefined;
      if (!session?.id) return;
      handlerRef.current({ type, session });
    });
  }, [enabled]);
}
