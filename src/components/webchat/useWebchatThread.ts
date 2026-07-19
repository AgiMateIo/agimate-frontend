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
  text: string; // normalized to '' for attachment-only messages (wire sends null)
  parts: WebchatPart[]; // attachments (normalized to [] when the wire field is null)
  createdAt: string;
  pending: boolean; // optimistic send not yet acknowledged by the backend
}

const fromHistory = (m: WebchatMessageResponse): ThreadMessage => ({
  key: m.messageId,
  messageId: m.messageId,
  direction: m.direction,
  stream: m.stream,
  text: m.text ?? '',
  parts: m.parts ?? [],
  createdAt: m.createdAt,
  pending: false,
});

const fromEvent = (p: WebchatMessagePayload): ThreadMessage => ({
  key: p.messageId,
  messageId: p.messageId,
  direction: p.direction,
  stream: p.stream,
  text: p.text ?? '',
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
  // blob: preview URLs handed to optimistic sends. Kept alive for the whole
  // session selection (the echo swap to signed URLs happens inside a state
  // updater, which must stay pure) and revoked when the thread resets.
  const localPreviewUrlsRef = useRef<string[]>([]);

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
      // The thread is resetting (session switch) or unmounting — the messages
      // referencing these previews are gone either way.
      localPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      localPreviewUrlsRef.current = [];
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
        const known = prev.findIndex((m) => m.messageId === p.messageId);
        if (known >= 0) {
          // Already rendered (the POST ack stamped the optimistic copy). USER
          // echoes still carry the signed attachment URLs — swap out the local
          // blob: previews.
          const m = prev[known];
          if (p.direction !== 'USER' || m.parts.every((part) => !part.url.startsWith('blob:'))) {
            return prev;
          }
          const next = prev.slice();
          next[known] = { ...m, parts: p.parts ?? m.parts, pending: false };
          return next;
        }
        if (p.direction === 'USER') {
          // Echo may beat the send POST response: reconcile into the OLDEST
          // optimistic message with the same text instead of duplicating it —
          // sends POST (and echo) in order, so FIFO matching keeps two
          // consecutive identical/attachment-only sends straight.
          for (let i = 0; i < prev.length; i++) {
            const m = prev[i];
            if (m.direction === 'USER' && m.messageId === null && m.text === (p.text ?? '')) {
              const next = prev.slice();
              next[i] = { ...m, messageId: p.messageId, parts: p.parts ?? m.parts, pending: false };
              return next;
            }
          }
        }
        return [...prev, fromEvent(p)];
      });
    },
    [sessionId]
  );

  // `parts` are optimistic attachment parts: already-uploaded files (real
  // fileId) with a local blob: preview in `url`. The USER echo swaps the
  // previews for signed server URLs.
  const send = useCallback(
    async (text: string, parts: WebchatPart[] = []): Promise<boolean> => {
      const trimmed = text.trim();
      if (!sessionId || (!trimmed && parts.length === 0)) return false;
      const key = `local-${++localSeqRef.current}`;
      localPreviewUrlsRef.current.push(
        ...parts.map((p) => p.url).filter((url) => url.startsWith('blob:'))
      );
      setMessages((prev) => [
        ...prev,
        {
          key,
          messageId: null,
          direction: 'USER',
          stream: null,
          text: trimmed,
          parts,
          createdAt: new Date().toISOString(),
          pending: true,
        },
      ]);
      setSendError('');
      setAwaitingReply(true);
      try {
        const res = await apiService.sendWebchatMessage(sessionId, {
          text: trimmed || undefined,
          parts: parts.length > 0 ? parts.map((p) => ({ fileId: p.fileId })) : undefined,
        });
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
