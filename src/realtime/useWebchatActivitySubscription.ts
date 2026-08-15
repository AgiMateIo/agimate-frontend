'use client';

import { useEffect, useRef } from 'react';
import { subscribePersonalChannel } from './personalChannel';
import type { WebchatActivityPayload } from '@/types';

/**
 * Delivered agent messages (`answer`/`error`) for every one of the user's
 * chats, over the shared personal channel — the stream that keeps unread
 * badges moving while the user is looking at a list rather than at a
 * conversation.
 *
 * The open conversation has its own `webchat:{sessionId}` subscription and
 * renders the message from there; this event is for counting only, so a
 * consumer must skip the session it is already showing. It is also
 * best-effort — a lost publish is repaired by the next listing.
 */
export function useWebchatActivitySubscription(
  onActivity: (p: WebchatActivityPayload) => void,
) {
  const handlerRef = useRef(onActivity);
  useEffect(() => {
    handlerRef.current = onActivity;
  }, [onActivity]);

  useEffect(
    () =>
      subscribePersonalChannel(({ type, payload }) => {
        if (type !== 'webchat_activity') return;
        handlerRef.current(payload as WebchatActivityPayload);
      }),
    [],
  );
}
