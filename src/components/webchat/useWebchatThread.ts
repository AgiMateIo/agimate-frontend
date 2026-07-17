'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import apiService from '@/services/api';
import { getErrorMessage } from '@/utils/error';
import type {
  WebchatDirection,
  WebchatMessagePayload,
  WebchatMessageResponse,
  WebchatPart,
  WebchatStream,
} from '@/types';

const PAGE_SIZE = 50;

export interface ThreadMessage {
  key: string; // stable render key: messageId, or a local key for optimistic sends
  messageId: string | null; // null until the send POST resolves
  direction: WebchatDirection;
  stream: WebchatStream | null;
  text: string;
  parts: WebchatPart[]; // attachments (normalized to [] when the wire field is null)
  createdAt: string;
  pending: boolean; // optimistic send not yet acknowledged by the backend
}

const fromHistory = (m: WebchatMessageResponse): ThreadMessage => ({
  key: m.messageId,
  messageId: m.messageId,
  direction: m.direction,
  stream: m.stream,
  text: m.text,
  parts: m.parts ?? [],
  createdAt: m.createdAt,
  pending: false,
});

const fromEvent = (p: WebchatMessagePayload): ThreadMessage => ({
  key: p.messageId,
  messageId: p.messageId,
  direction: p.direction,
  stream: p.stream,
  text: p.text,
  parts: p.parts ?? [],
  createdAt: p.createdAt,
  pending: false,
});

// Message thread of one webchat session: seeds from history (page 0 = newest),
// merges live Centrifugo events on top, dedupes by messageId (delivery is
// at-least-once) and reconciles optimistic sends with their USER echo.
// Deliberately local state, not React Query: live events + optimistic writes
// dominate, and the thread dies with the session selection.
export function useWebchatThread(sessionId: string | null) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [awaitingReply, setAwaitingReply] = useState(false);

  // messageIds already merged from history pages — events dedupe against the
  // messages state itself, so updaters stay pure (StrictMode-safe).
  const seenHistoryIdsRef = useRef<Set<string>>(new Set());
  // messageIds of already-handled live events: delivery is at-least-once, and a
  // redelivered progress event must not resurrect the "agent working" indicator.
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const pagesLoadedRef = useRef(0);
  const localSeqRef = useRef(0);

  useEffect(() => {
    seenHistoryIdsRef.current = new Set();
    processedEventIdsRef.current = new Set();
    pagesLoadedRef.current = 0;
    setMessages([]);
    setHasOlder(false);
    setError('');
    setSendError('');
    setAwaitingReply(false);
    if (!sessionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    apiService
      .getWebchatMessages(sessionId, { page: 0, size: PAGE_SIZE })
      .then((page) => {
        if (cancelled) return;
        const fresh = page.content.filter((m) => !seenHistoryIdsRef.current.has(m.messageId));
        fresh.forEach((m) => seenHistoryIdsRef.current.add(m.messageId));
        pagesLoadedRef.current = 1;
        setHasOlder(page.totalPages > 1);
        // Live events may have raced the fetch — keep them at the tail, drop overlaps.
        setMessages((prev) => [
          ...fresh.slice().reverse().map(fromHistory),
          ...prev.filter((m) => m.messageId === null || !seenHistoryIdsRef.current.has(m.messageId)),
        ]);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Failed to load messages'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const loadOlder = useCallback(async () => {
    if (!sessionId || loadingOlder || !hasOlder) return;
    setLoadingOlder(true);
    try {
      const page = await apiService.getWebchatMessages(sessionId, {
        page: pagesLoadedRef.current,
        size: PAGE_SIZE,
      });
      const fresh = page.content.filter((m) => !seenHistoryIdsRef.current.has(m.messageId));
      fresh.forEach((m) => seenHistoryIdsRef.current.add(m.messageId));
      pagesLoadedRef.current += 1;
      setHasOlder(pagesLoadedRef.current < page.totalPages);
      setMessages((prev) => [...fresh.slice().reverse().map(fromHistory), ...prev]);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load messages'));
    } finally {
      setLoadingOlder(false);
    }
  }, [sessionId, loadingOlder, hasOlder]);

  // Re-fetches the newest history page and refreshes attachment links on any
  // already-rendered message (matched by messageId). Signed `part.url`s expire
  // after ~15 min; an <img> that 403s on an expired link calls this to swap in
  // freshly-signed URLs. Best-effort — failures leave the stale link in place.
  const refreshParts = useCallback(async () => {
    if (!sessionId) return;
    try {
      const page = await apiService.getWebchatMessages(sessionId, { page: 0, size: PAGE_SIZE });
      const freshById = new Map(page.content.map((m) => [m.messageId, m.parts ?? []]));
      setMessages((prev) =>
        prev.map((m) =>
          m.messageId && freshById.has(m.messageId)
            ? { ...m, parts: freshById.get(m.messageId)! }
            : m
        )
      );
    } catch {
      // Swallow — the attachment falls back to a placeholder on repeated failure.
    }
  }, [sessionId]);

  const handleEvent = useCallback(
    (p: WebchatMessagePayload) => {
      if (!sessionId || p.sessionId !== sessionId) return;
      if (processedEventIdsRef.current.has(p.messageId)) return;
      processedEventIdsRef.current.add(p.messageId);
      if (p.direction === 'AGENT') {
        // progress = the agent is working; answer/error ends the wait.
        setAwaitingReply(p.stream === 'progress');
      }
      setMessages((prev) => {
        if (prev.some((m) => m.messageId === p.messageId)) return prev;
        if (p.direction === 'USER') {
          // Echo may beat the send POST response: reconcile into the latest
          // optimistic message with the same text instead of duplicating it.
          for (let i = prev.length - 1; i >= 0; i--) {
            const m = prev[i];
            if (m.direction === 'USER' && m.messageId === null && m.text === p.text) {
              const next = prev.slice();
              next[i] = { ...m, messageId: p.messageId, pending: false };
              return next;
            }
          }
        }
        return [...prev, fromEvent(p)];
      });
    },
    [sessionId]
  );

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!sessionId || !trimmed) return false;
      const key = `local-${++localSeqRef.current}`;
      setMessages((prev) => [
        ...prev,
        {
          key,
          messageId: null,
          direction: 'USER',
          stream: null,
          text: trimmed,
          parts: [],
          createdAt: new Date().toISOString(),
          pending: true,
        },
      ]);
      setSendError('');
      setAwaitingReply(true);
      try {
        const res = await apiService.sendWebchatMessage(sessionId, trimmed);
        setMessages((prev) => {
          // Echo already arrived and got rendered on its own — drop the optimistic copy.
          if (prev.some((m) => m.key !== key && m.messageId === res.messageId)) {
            return prev.filter((m) => m.key !== key);
          }
          return prev.map((m) =>
            m.key === key ? { ...m, messageId: res.messageId, pending: false } : m
          );
        });
        return true;
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.key !== key));
        setAwaitingReply(false);
        setSendError(getErrorMessage(err, 'Failed to send message'));
        return false;
      }
    },
    [sessionId]
  );

  return {
    messages,
    loading,
    loadingOlder,
    hasOlder,
    loadOlder,
    error,
    sendError,
    awaitingReply,
    send,
    handleEvent,
    refreshParts,
  };
}
