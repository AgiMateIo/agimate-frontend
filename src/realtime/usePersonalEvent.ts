'use client';

import { useEffect, useRef } from 'react';
import { subscribePersonalChannel } from './personalChannel';

// Events of the given types from the personal channel, while `enabled`.
export function usePersonalEvent(
  enabled: boolean,
  types: readonly string[],
  onEvent: (type: string, payload: unknown) => void,
) {
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  // Joined: an inline array must not resubscribe on every render.
  const typeKey = types.join('\n');
  useEffect(() => {
    if (!enabled) return;
    const wanted = new Set(typeKey.split('\n'));
    return subscribePersonalChannel(({ type, payload }) => {
      if (wanted.has(type)) handlerRef.current(type, payload);
    });
  }, [enabled, typeKey]);
}
