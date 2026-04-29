'use client';

import { useEffect, useRef } from 'react';
import type { Centrifuge, Subscription } from 'centrifuge';
import { initCentrifuge, getChannelToken } from './centrifugoClient';
import type {
  BoardTaskCreatedPayload,
  BoardTaskStatusChangedPayload,
  BoardTaskCommentCreatedPayload,
} from '@/types';

export interface BoardSubscriptionHandlers {
  onTaskCreated?: (p: BoardTaskCreatedPayload) => void;
  onTaskStatusChanged?: (p: BoardTaskStatusChangedPayload) => void;
  onCommentAdded?: (p: BoardTaskCommentCreatedPayload) => void;
}

export function useBoardSubscription(
  boardId: string | null | undefined,
  handlers: BoardSubscriptionHandlers
) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!boardId) return;

    let sub: Subscription | null = null;
    let centrifuge: Centrifuge | null = null;
    let cancelled = false;

    const setup = async () => {
      try {
        centrifuge = await initCentrifuge();
        const token = await getChannelToken();
        if (cancelled) return;

        const existing = centrifuge.getSubscription(token.channel);
        if (existing) {
          existing.unsubscribe();
          centrifuge.removeSubscription(existing);
        }

        sub = centrifuge.newSubscription(token.channel, {
          token: token.subscriptionToken,
          getToken: async () => {
            const fresh = await getChannelToken();
            return fresh.subscriptionToken;
          },
          tagsFilter: { key: 'boardId', cmp: 'eq', val: boardId },
        });

        sub.on('error', (ctx) => {
          console.error('[centrifugo] subscription error', {
            type: ctx?.type,
            channel: ctx?.channel,
            code: ctx?.error?.code,
            message: ctx?.error?.message,
          });
        });

        sub.on('publication', (ctx: { data: unknown }) => {
          const data = ctx.data as { type?: string; payload?: unknown } | undefined;
          if (!data || typeof data.type !== 'string') return;
          const { type, payload } = data;
          const h = handlersRef.current;
          switch (type) {
            case 'board.task.created':
              h.onTaskCreated?.(payload as BoardTaskCreatedPayload);
              break;
            case 'board.task.statusChanged':
              h.onTaskStatusChanged?.(payload as BoardTaskStatusChangedPayload);
              break;
            case 'board.task.commentAdded':
              h.onCommentAdded?.(payload as BoardTaskCommentCreatedPayload);
              break;
            default:
              console.warn('[centrifugo] unknown board event:', type);
          }
        });

        sub.subscribe();
      } catch (err) {
        console.error('[centrifugo] board subscription failed:', err);
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
  }, [boardId]);
}
