'use client';

import { useEffect, useRef } from 'react';
import { subscribePersonalChannel } from './personalChannel';
import type { WebchatMessagePayload } from '@/types';

export interface WebchatSubscriptionHandlers {
  onMessage?: (p: WebchatMessagePayload) => void;
}

// Messages of one webchat session — `webchat.message` on the shared personal
// channel, narrowed to `sessionId` here. Every other chat ignores them: their
// badges and previews arrive as `session.updated` rows. The per-session
// `webchat:{sessionId}` channel and its token are gone; subscribing to both
// would deliver every message twice. Delivery is at-least-once either way, so
// the thread dedupes by `messageId`.
export function useWebchatSubscription(
  sessionId: string | null | undefined,
  handlers: WebchatSubscriptionHandlers
) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!sessionId) return;
    return subscribePersonalChannel(({ type, payload }) => {
      if (type !== 'webchat.message') return;
      const message = payload as WebchatMessagePayload | undefined;
      if (message?.sessionId !== sessionId) return;
      handlersRef.current.onMessage?.(message);
    });
  }, [sessionId]);
}
