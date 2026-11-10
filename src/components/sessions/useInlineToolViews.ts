'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import apiService, { ApiError } from '@/services/api';
import { usePersonalEvent } from '@/realtime/usePersonalEvent';
import type {
  CallToolResult,
  SessionToolCallDescriptor,
  SessionToolCallPayload,
  SessionToolCallResponse,
} from '@/types';

export type InlineToolCall = SessionToolCallResponse & {
  viewUri: string;
  result: CallToolResult;
};

// A descriptor that has a view: the only kind a trigger can render.
export type InlineViewDescriptor = SessionToolCallDescriptor & { viewUri: string };

// The subset of a message this hook reads. Both the live thread and a read-only
// transcript satisfy it.
export interface InlineViewMessage {
  toolCallIds?: string[] | null;
  // Resolved descriptors. null/absent — not resolved here: a history line uses
  // the per-id endpoint, a live one waits for its signal. [] — resolved, no
  // journal entries to show.
  toolCalls?: SessionToolCallDescriptor[] | null;
  // Arrived as a live event rather than from history.
  live?: boolean;
}

export interface InlineToolViews {
  // Data + result of the views already opened (or discovered on an old backend).
  views: Record<string, InlineToolCall>;
  // Calls that have a view, whether or not it has been opened. This is what the
  // collapsed triggers render from.
  descriptors: Record<string, InlineViewDescriptor>;
  // Called when a trigger is opened: resolves the call's data. The page itself
  // is fetched by the entry, in parallel.
  resolve: (toolCallId: string) => void;
}

// `missing` — a 404 from the call endpoint, revivable by a later signal. `none`
// and `ready` are terminal.
type Status = 'unresolved' | 'ready' | 'none' | 'missing';

const removeFromSet = (set: Set<string>, id: string): Set<string> => {
  if (!set.has(id)) return set;
  const next = new Set(set);
  next.delete(id);
  return next;
};

// Resolves the tool calls named by session messages into the views they render.
// A view is not fetched until its trigger is opened: the descriptors alone are
// enough to draw the collapsed line.
export function useInlineToolViews(
  sessionId: string,
  messages: readonly InlineViewMessage[],
  liveSeq = 0,
): InlineToolViews {
  const [views, setViews] = useState<Record<string, InlineToolCall>>({});
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  // Descriptors from `session.tool_call` — state, because the trigger list and
  // the effect both read them; the ref beside it is for the in-flight request.
  const [signalDescriptors, setSignalDescriptors] = useState<
    Record<string, SessionToolCallDescriptor>
  >({});
  const statusRef = useRef(new Map<string, Status>());
  // Views the user has opened at least once: only these are resolved, and only
  // these keep retrying while their result is still on its way.
  const requestedRef = useRef(new Set<string>());
  // The old backend never delivered `session.tool_call`; its live views were
  // resolved on the next message. Only that fallback reads this.
  const firstSeenSeqRef = useRef(new Map<string, number>());
  const inflightRef = useRef(new Set<string>());
  // A signal that lands during a request may be answered by that request's
  // pre-result snapshot; the id is fetched once more when it settles.
  const rerunRef = useRef(new Set<string>());
  const aliveRef = useRef(true);
  const signalDescriptorsRef = useRef(new Map<string, SessionToolCallDescriptor>());
  // Any delivered `session.tool_call` means the backend ships descriptors.
  // The old backend published the event into the void.
  const descriptorBackendRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const hide = useCallback((id: string) => {
    setHidden((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);
  const unhide = useCallback((id: string) => {
    setHidden((prev) => removeFromSet(prev, id));
  }, []);

  // Callers key the component by session, so switching conversations is a
  // remount and every map above dies with it.

  const load = useCallback(
    function load(id: string, retryMissing = true) {
      const status = statusRef.current.get(id);
      if (status === 'ready' || status === 'none') return;
      if (status === 'missing' && !retryMissing) return;
      const inflight = inflightRef.current;
      const rerun = rerunRef.current;
      if (inflight.has(id)) {
        rerun.add(id);
        return;
      }
      inflight.add(id);
      apiService
        .getChatSessionToolCall(sessionId, id)
        .then((call) => {
          if (!aliveRef.current) return;
          // A newer signal may have withdrawn the view while this request ran.
          const latest = signalDescriptorsRef.current.get(id);
          if (latest && !latest.viewUri) {
            statusRef.current.set(id, 'none');
            hide(id);
            return;
          }
          const viewUri = call.viewUri;
          const result = call.result;
          if (!viewUri) {
            statusRef.current.set(id, 'none');
            hide(id);
            return;
          }
          if (!result) {
            statusRef.current.set(id, 'unresolved');
            return;
          }
          statusRef.current.set(id, 'ready');
          unhide(id);
          setViews((prev) => ({ ...prev, [id]: { ...call, viewUri, result } }));
        })
        .catch((err) => {
          if (!aliveRef.current) return;
          if (err instanceof ApiError && err.status === 403) {
            statusRef.current.set(id, 'none');
            hide(id);
          } else if (err instanceof ApiError && err.status === 404) {
            statusRef.current.set(id, 'missing');
          } else {
            statusRef.current.set(id, 'unresolved');
          }
        })
        .finally(() => {
          inflight.delete(id);
          if (aliveRef.current && rerun.delete(id)) load(id, retryMissing);
        });
    },
    [sessionId, hide, unhide],
  );

  const resolve = useCallback(
    (id: string) => {
      requestedRef.current.add(id);
      void load(id);
    },
    [load],
  );

  // The handler records the facts; the effect below decides against the current
  // `messages`, so no ref of the rendered list is needed.
  usePersonalEvent(!!sessionId, ['session.tool_call'], (_type, payload) => {
    const signal = payload as SessionToolCallPayload | undefined;
    if (!signal || signal.sessionId !== sessionId) return;
    descriptorBackendRef.current = true;
    if (signal.toolCalls != null) {
      const next = new Map(signalDescriptorsRef.current);
      let changed = false;
      for (const call of signal.toolCalls) {
        const prev = next.get(call.toolCallId);
        if (!prev || prev.viewUri !== call.viewUri) {
          next.set(call.toolCallId, call);
          changed = true;
          if (call.viewUri) {
            // A view may come back after a no-view resolution; let data reload.
            if (statusRef.current.get(call.toolCallId) === 'none') {
              statusRef.current.delete(call.toolCallId);
            }
            unhide(call.toolCallId);
            // An opened view is resolved without waiting for the effect.
            if (requestedRef.current.has(call.toolCallId)) void load(call.toolCallId);
          } else {
            statusRef.current.set(call.toolCallId, 'none');
            hide(call.toolCallId);
            setViews((current) => {
              if (!(call.toolCallId in current)) return current;
              const updated = { ...current };
              delete updated[call.toolCallId];
              return updated;
            });
          }
        } else if (call.viewUri && requestedRef.current.has(call.toolCallId)) {
          // A repeat is still a retry trigger for an opened, unfinished view.
          void load(call.toolCallId);
        }
      }
      if (changed) {
        signalDescriptorsRef.current = next;
        setSignalDescriptors(Object.fromEntries(next));
      }
    } else {
      // An old-backend signal has ids only: the endpoint is how a view is found.
      for (const id of signal.toolCallIds ?? []) void load(id);
    }
  });

  // What the collapsed triggers render. Signal descriptors win over the
  // history line's; an old backend has no descriptors, so a resolved view
  // stands in for one.
  const descriptors = useMemo(() => {
    const out: Record<string, InlineViewDescriptor> = {};
    for (const message of messages) {
      const ids = message.toolCallIds;
      if (!ids || ids.length === 0) continue;
      const byId = message.toolCalls
        ? new Map(message.toolCalls.map((call) => [call.toolCallId, call]))
        : null;
      for (const id of ids) {
        if (hidden.has(id)) continue;
        const descriptor = signalDescriptors[id] ?? byId?.get(id);
        if (descriptor) {
          if (descriptor.viewUri) out[id] = { ...descriptor, viewUri: descriptor.viewUri };
          continue;
        }
        const view = views[id];
        if (view) {
          out[id] = {
            toolCallId: id,
            name: view.name,
            connectionId: view.connectionId,
            viewUri: view.viewUri,
          };
        }
      }
    }
    return out;
  }, [messages, signalDescriptors, views, hidden]);

  useEffect(() => {
    if (!sessionId) return;
    // The field's presence (even null) is the backend saying it resolves
    // descriptors; an old backend omits it entirely. Checked before the loop:
    // the flag decides whether a live line may fall back to per-id requests.
    for (const message of messages) {
      if (message.toolCalls !== undefined) {
        descriptorBackendRef.current = true;
        break;
      }
    }
    for (const message of messages) {
      const ids = message.toolCallIds;
      if (!ids || ids.length === 0) continue;
      const descriptors = message.toolCalls ?? null;
      const byId = descriptors
        ? new Map(descriptors.map((call) => [call.toolCallId, call]))
        : null;
      for (const id of ids) {
        const fromSignal = signalDescriptors[id];
        const descriptor = fromSignal ?? byId?.get(id);
        if (descriptor) {
          if (!descriptor.viewUri) {
            statusRef.current.set(id, 'none');
            continue;
          }
          // Collapsed views cost nothing; only an opened trigger resolves data.
          if (requestedRef.current.has(id)) void load(id);
          continue;
        }
        // A descriptor-bearing line with the id missing means "not yet"; a
        // later signal may bring it.
        if (descriptors) continue;
        // No descriptors: the old path, where the data endpoint is also how a
        // view is discovered.
        if (message.live === true) {
          if (descriptorBackendRef.current) continue;
          const firstSeen = firstSeenSeqRef.current.get(id);
          if (firstSeen === undefined) {
            // A live line waits for its signal; this is the fallback for a
            // backend that never sends one.
            firstSeenSeqRef.current.set(id, liveSeq);
            if (!statusRef.current.has(id)) statusRef.current.set(id, 'unresolved');
            continue;
          }
          if (firstSeen < liveSeq) void load(id);
          continue;
        }
        void load(id);
      }
    }
  }, [sessionId, messages, liveSeq, signalDescriptors, load]);

  return { views, descriptors, resolve };
}
