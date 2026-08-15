'use client';

import { useEffect, useRef } from 'react';
import { subscribePersonalChannel } from './personalChannel';
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

// Board events ride the shared personal channel (see personalChannel.ts), so
// the boardId match happens here rather than as a server-side `tagsFilter` —
// the channel has other listeners whose events must not be filtered away.
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

    return subscribePersonalChannel(({ type, payload }) => {
      if (!type.startsWith('board.')) return;
      // Every board payload carries its boardId — a user with two boards open
      // in two tabs still gets both streams here.
      if ((payload as { boardId?: string } | undefined)?.boardId !== boardId) return;
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
  }, [boardId]);
}
