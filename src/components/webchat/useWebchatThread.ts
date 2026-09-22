'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import apiService from '@/services/api';
import { getErrorMessage } from '@/utils/error';
import type {
  ChatDirection,
  WebchatMessagePayload,
  ChatSessionMessageResponse,
  ChatPart,
  ChatStream,
} from '@/types';

const PAGE_SIZE = 50;

export interface ThreadMessage {
  key: string; // stable render key: messageId, or a local key for optimistic sends
  messageId: string | null; // null until the send POST resolves
  direction: ChatDirection;
  stream: ChatStream | null;
  text: string; // trimmed; normalized to '' for attachment-only messages (wire sends null)
  parts: ChatPart[]; // attachments (normalized to [] when the wire field is null)
  createdAt: string;
  pending: boolean; // optimistic send not yet acknowledged by the backend
}

// Agent/model output regularly carries leading or trailing blank lines, which
// render as empty space inside the bubble — normalize text at the wire boundary
// so everything downstream (rendering, echo matching) sees the trimmed form.
const normalizeText = (text: string | null): string => text?.trim() ?? '';

// History is one shape for every channel now, so `messageId` — the key live
// events dedupe against — is nullable there: outside webchat no such id exists.
// A webchat row always has one; the row's own `id` is the fallback that keeps
// every history key non-null, and null keeps meaning "optimistic send" alone.
const historyMessageId = (m: ChatSessionMessageResponse): string => m.messageId ?? m.id;

const fromHistory = (m: ChatSessionMessageResponse): ThreadMessage => ({
  key: historyMessageId(m),
  messageId: historyMessageId(m),
  direction: m.direction,
  stream: m.stream,
  text: normalizeText(m.text),
  parts: m.parts ?? [],
  createdAt: m.createdAt,
  pending: false,
});

const fromEvent = (p: WebchatMessagePayload): ThreadMessage => ({
  key: p.messageId,
  messageId: p.messageId,
  direction: p.direction,
  stream: p.stream,
  text: normalizeText(p.text),
  parts: p.parts ?? [],
  createdAt: p.createdAt,
  pending: false,
});

// Message thread of one webchat session: seeds from history (page 0 = newest),
// merges live Centrifugo events on top, dedupes by messageId (delivery is
// at-least-once) and reconciles optimistic sends with their USER echo.
// Deliberately local state, not React Query: live events + optimistic writes
// dominate, and the thread dies with the session selection.
//
// `running` is the session row's `isRunning`: it seeds the indicator when the
// conversation opens (an agent already working has no event left to send, so
// without it a reply in flight looks like a conversation gone quiet), and its
// live flips from `session.updated` move it afterwards.
//
// Switching sessions is a remount, not a reset: WebchatConversation is rendered
// with `key={session.id}`, so `sessionId` is fixed for the life of this
// hook and every "start over" below is plain initial state. Rendering the
// consumer without that key would leave a new session showing the old thread.
export function useWebchatThread(sessionId: string | null, running = false) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(!!sessionId);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [awaitingReply, setAwaitingReply] = useState(running);
  // A stop was asked for and the run hasn't reached its next seam yet. The
  // backend only records the request, so this is "stopping", never "stopped".
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState('');

  // messageIds already merged from history pages — events dedupe against the
  // messages state itself, so updaters stay pure (StrictMode-safe).
  const seenHistoryIdsRef = useRef<Set<string>>(new Set());
  // messageIds of already-handled live events: delivery is at-least-once, and a
  // redelivered progress event must not resurrect the "agent working" indicator.
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const pagesLoadedRef = useRef(0);
  // In-flight guard for `loadOlder`. The state flag alone is not enough now
  // that scrolling triggers it: two scroll events fire before React re-renders,
  // both read the stale `false`, and the transport hands both the same deduped
  // GET — so the page counter would advance twice for one page.
  const loadingOlderRef = useRef(false);
  const localSeqRef = useRef(0);
  // blob: preview URLs handed to optimistic sends. Kept alive for the whole
  // session selection (the echo swap to signed URLs happens inside a state
  // updater, which must stay pure) and revoked when the thread resets.
  const localPreviewUrlsRef = useRef<string[]>([]);
  // The previous `running`, to tell a rise (a run started elsewhere) from the
  // value simply being true.
  const runningRef = useRef(running);
  // Whether the indicator currently showing came from that seed and not from
  // anything this thread saw itself.
  const seededRunningRef = useRef(running);
  useEffect(() => {
    const rose = running && !runningRef.current;
    runningRef.current = running;
    // The row is live now (`session.updated`), so it switches the indicator on
    // too — a message sent from another device starts a run this thread never
    // saw a send for. Only then does it count as seeded (so the row going idle
    // switches it back off): after a send from here the local evidence already
    // lit it, and a stale idle row from a refetch must not put it out.
    if (rose) {
      setAwaitingReply((prev) => {
        if (!prev) seededRunningRef.current = true;
        return true;
      });
      return;
    }
    // A row cached a minute ago can seed the indicator for a run that has since
    // finished — and a finished run has no event left to switch it off. The
    // first listing that reports the session idle does it instead. Local
    // evidence (a send, a progress line) drops the seed and wins over this.
    if (!running && seededRunningRef.current) {
      seededRunningRef.current = false;
      setAwaitingReply(false);
    }
  }, [running]);

  // Seed the thread from history, once per mount.
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    apiService
      .getChatSessionMessages(sessionId, { page: 0, size: PAGE_SIZE })
      .then((page) => {
        if (cancelled) return;
        const fresh = page.content.filter((m) => !seenHistoryIdsRef.current.has(historyMessageId(m)));
        fresh.forEach((m) => seenHistoryIdsRef.current.add(historyMessageId(m)));
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
      // The thread is unmounting — the messages referencing these previews are
      // gone with it.
      localPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      localPreviewUrlsRef.current = [];
    };
  }, [sessionId]);

  const loadOlder = useCallback(async () => {
    if (!sessionId || loadingOlderRef.current || !hasOlder) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const page = await apiService.getChatSessionMessages(sessionId, {
        page: pagesLoadedRef.current,
        size: PAGE_SIZE,
      });
      const fresh = page.content.filter((m) => !seenHistoryIdsRef.current.has(historyMessageId(m)));
      fresh.forEach((m) => seenHistoryIdsRef.current.add(historyMessageId(m)));
      pagesLoadedRef.current += 1;
      setHasOlder(pagesLoadedRef.current < page.totalPages);
      setMessages((prev) => [...fresh.slice().reverse().map(fromHistory), ...prev]);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load messages'));
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [sessionId, hasOlder]);

  // Re-fetches the newest history page and refreshes attachment links on any
  // already-rendered message (matched by messageId). Signed `part.url`s expire
  // after ~15 min; an <img> that 403s on an expired link calls this to swap in
  // freshly-signed URLs. Best-effort — failures leave the stale link in place.
  //
  // Images need nothing back: the new `url` reaches them as a prop and the
  // browser reloads the <img> itself. A preview fetched by hand has no such
  // reload, and reading the refreshed prop straight after `await` is a race
  // against React's render — so the fresh parts are also *returned*, by
  // messageId, and the caller retries with the URL it was handed. `null` says
  // the re-read itself failed.
  const refreshParts = useCallback(async (): Promise<Map<string, ChatPart[]> | null> => {
    if (!sessionId) return null;
    try {
      const page = await apiService.getChatSessionMessages(sessionId, { page: 0, size: PAGE_SIZE });
      const freshById = new Map(page.content.map((m) => [historyMessageId(m), m.parts ?? []]));
      setMessages((prev) =>
        prev.map((m) =>
          m.messageId && freshById.has(m.messageId)
            ? { ...m, parts: freshById.get(m.messageId)! }
            : m
        )
      );
      return freshById;
    } catch {
      // Swallow — the attachment falls back to a placeholder on repeated failure.
      return null;
    }
  }, [sessionId]);

  const handleEvent = useCallback(
    (p: WebchatMessagePayload) => {
      if (!sessionId || p.sessionId !== sessionId) return;
      if (processedEventIdsRef.current.has(p.messageId)) return;
      processedEventIdsRef.current.add(p.messageId);
      if (p.direction === 'AGENT') {
        // progress = the agent is working; answer/error ends the wait.
        const working = p.stream === 'progress';
        setAwaitingReply(working);
        seededRunningRef.current = false;
        // A stopped run signs off with an ordinary answer (its text lists what
        // it managed to do) — so the turn ending is also the stop landing, and
        // no special-casing of that message is needed anywhere.
        if (!working) setStopping(false);
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
            if (m.direction === 'USER' && m.messageId === null && m.text === normalizeText(p.text)) {
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
    async (text: string, parts: ChatPart[] = []): Promise<boolean> => {
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
      setStopError('');
      setStopping(false);
      setAwaitingReply(true);
      seededRunningRef.current = false;
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

  // Stops the conversation, not a single run: the backend cancels by session,
  // so the run in flight and anything queued behind it go together. Idempotent
  // server-side, so a double press is harmless — the button still locks itself
  // into "stopping" until the turn ends.
  const stop = useCallback(async () => {
    if (!sessionId || stopping) return;
    setStopping(true);
    setStopError('');
    try {
      // `cancelled: 0` needs no branch: it means there was nothing left to
      // stop, which is exactly the state the disabled button already shows.
      await apiService.cancelSessionRuns(sessionId);
    } catch (err) {
      setStopping(false);
      setStopError(getErrorMessage(err, 'Failed to stop the agent'));
    }
  }, [sessionId, stopping]);

  return {
    messages,
    loading,
    loadingOlder,
    hasOlder,
    loadOlder,
    error,
    sendError,
    awaitingReply,
    stopping,
    stopError,
    stop,
    send,
    handleEvent,
    refreshParts,
  };
}
