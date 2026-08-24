'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { ComposerAttachment } from './useComposerAttachments';

// What the user has written but not sent, for one conversation. Switching
// sessions remounts the conversation (`key={sessionId}` — the thread depends on
// that, see useWebchatThread), so the composer cannot keep its own state: the
// text and the attachment tray live here instead, above the remount, one entry
// per session. The store dies with the chat screen, which is also what releases
// the blob: previews — there is nothing to prune while it lives.
export interface ComposerEntry {
  text: string;
  attachments: ComposerAttachment[];
  // Held here too: a send outlives the conversation it started in — switching
  // sessions mid-flight must not leave the button ready to fire again.
  sending: boolean;
}

const EMPTY_ENTRY: ComposerEntry = { text: '', attachments: [], sending: false };

// Only local previews are ours to release; a signed server URL is not.
export const revokePreview = (url: string) => {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url);
};

export interface ComposerStore {
  getEntry: (sessionId: string) => ComposerEntry;
  subscribe: (sessionId: string, callback: () => void) => () => void;
  setText: (sessionId: string, text: string) => void;
  setAttachments: (sessionId: string, attachments: ComposerAttachment[]) => void;
  setSending: (sessionId: string, sending: boolean) => void;
  // In-flight uploads for one session, keyed by attachment id. Lives beside the
  // entry rather than in the hook: an upload started before a session switch
  // keeps running, and the send barrier has to be able to wait for it after the
  // composer has been remounted.
  uploads: (sessionId: string) => Map<string, Promise<void>>;
  // Drops the draft and releases its previews — the session was closed, or its
  // content has moved on to somewhere that owns it now.
  dispose: (sessionId: string) => void;
}

const WebchatComposerContext = createContext<ComposerStore | null>(null);

export function WebchatComposerProvider({ children }: { children: ReactNode }) {
  const entriesRef = useRef(new Map<string, ComposerEntry>());
  const uploadsRef = useRef(new Map<string, Map<string, Promise<void>>>());
  const listenersRef = useRef(new Map<string, Set<() => void>>());

  const store = useMemo<ComposerStore>(() => {
    const notify = (sessionId: string) => {
      listenersRef.current.get(sessionId)?.forEach((callback) => callback());
    };
    // Entries are replaced, never mutated: `getEntry` is read during render by
    // useSyncExternalStore, which compares the snapshot by identity.
    const patchEntry = (sessionId: string, changes: Partial<ComposerEntry>) => {
      const prev = entriesRef.current.get(sessionId) ?? EMPTY_ENTRY;
      entriesRef.current.set(sessionId, { ...prev, ...changes });
      notify(sessionId);
    };

    return {
      getEntry: (sessionId) => entriesRef.current.get(sessionId) ?? EMPTY_ENTRY,
      subscribe: (sessionId, callback) => {
        const listeners = listenersRef.current.get(sessionId) ?? new Set<() => void>();
        listeners.add(callback);
        listenersRef.current.set(sessionId, listeners);
        return () => {
          listeners.delete(callback);
          if (listeners.size === 0) listenersRef.current.delete(sessionId);
        };
      },
      setText: (sessionId, text) => patchEntry(sessionId, { text }),
      setAttachments: (sessionId, attachments) => patchEntry(sessionId, { attachments }),
      setSending: (sessionId, sending) => patchEntry(sessionId, { sending }),
      uploads: (sessionId) => {
        const existing = uploadsRef.current.get(sessionId);
        if (existing) return existing;
        const fresh = new Map<string, Promise<void>>();
        uploadsRef.current.set(sessionId, fresh);
        return fresh;
      },
      dispose: (sessionId) => {
        entriesRef.current
          .get(sessionId)
          ?.attachments.forEach((a) => revokePreview(a.previewUrl));
        entriesRef.current.delete(sessionId);
        uploadsRef.current.delete(sessionId);
        notify(sessionId);
      },
    };
  }, []);

  // Leaving the chat screen is what ends every draft on it: previews parked in a
  // tray have no owner left to revoke them.
  useEffect(() => {
    const entries = entriesRef.current;
    return () => {
      entries.forEach((entry) => entry.attachments.forEach((a) => revokePreview(a.previewUrl)));
      entries.clear();
    };
  }, []);

  return (
    <WebchatComposerContext.Provider value={store}>{children}</WebchatComposerContext.Provider>
  );
}

export function useComposerStore(): ComposerStore {
  const store = useContext(WebchatComposerContext);
  if (!store) throw new Error('useComposerStore must be used within WebchatComposerProvider');
  return store;
}

// Module-level so the snapshot getter stays stable across renders; each returns
// a value that only changes when that slice does, so typing a character doesn't
// re-render the attachment tray.
const selectText = (entry: ComposerEntry) => entry.text;
const selectAttachments = (entry: ComposerEntry) => entry.attachments;
const selectSending = (entry: ComposerEntry) => entry.sending;

function useEntrySlice<T>(sessionId: string, select: (entry: ComposerEntry) => T): T {
  const store = useComposerStore();
  const subscribe = useCallback(
    (callback: () => void) => store.subscribe(sessionId, callback),
    [store, sessionId]
  );
  const getSnapshot = useCallback(
    () => select(store.getEntry(sessionId)),
    [store, sessionId, select]
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const useComposerText = (sessionId: string) => useEntrySlice(sessionId, selectText);
export const useComposerSending = (sessionId: string) => useEntrySlice(sessionId, selectSending);
export const useComposerTray = (sessionId: string) => useEntrySlice(sessionId, selectAttachments);
