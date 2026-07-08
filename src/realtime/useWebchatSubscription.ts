'use client';

import { useEffect, useRef } from 'react';
import type { Centrifuge, Subscription } from 'centrifuge';
import { initCentrifuge } from './centrifugoClient';
import apiService from '@/services/api';
import type { WebchatMessagePayload } from '@/types';

export interface WebchatSubscriptionHandlers {
  onMessage?: (p: WebchatMessagePayload) => void;
}

// Subscribes to the per-session webchat:{sessionId} channel over the shared
// Centrifugo connection. Subscription tokens are per-session (TTL ~1h);
// getToken re-fetches them on expiry. The namespace has history+recovery
// enabled, so the SDK re-delivers publications missed during reconnects.
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

    let sub: Subscription | null = null;
    let centrifuge: Centrifuge | null = null;
    let cancelled = false;

    const setup = async () => {
      try {
        centrifuge = await initCentrifuge();
        const token = await apiService.getWebchatSessionToken(sessionId);
        if (cancelled) return;

        const existing = centrifuge.getSubscription(token.channel);
        if (existing) {
          existing.unsubscribe();
          centrifuge.removeSubscription(existing);
        }

        sub = centrifuge.newSubscription(token.channel, {
          token: token.subscriptionToken,
          getToken: async () => {
            const fresh = await apiService.getWebchatSessionToken(sessionId);
            return fresh.subscriptionToken;
          },
        });

        sub.on('error', (ctx) => {
          console.error('[centrifugo] webchat subscription error', {
            type: ctx?.type,
            channel: ctx?.channel,
            code: ctx?.error?.code,
            message: ctx?.error?.message,
          });
        });

        sub.on('publication', (ctx: { data: unknown }) => {
          const data = ctx.data as { type?: string; payload?: unknown } | undefined;
          if (!data || data.type !== 'webchat_message') return;
          handlersRef.current.onMessage?.(data.payload as WebchatMessagePayload);
        });

        sub.subscribe();
      } catch (err) {
        console.error('[centrifugo] webchat subscription failed:', err);
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (sub && centrifuge) {
        sub.unsubscribe();
        centrifuge.removeSubscription(sub);
      }
    };
  }, [sessionId]);
}
