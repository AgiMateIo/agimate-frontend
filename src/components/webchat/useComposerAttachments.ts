'use client';

import { useCallback } from 'react';
import apiService, { ApiError } from '@/services/api';
import { useFileCacheActions } from '@/queries/files';
import { useFileLabels } from '@/components/files/fileLabels';
import { resolveControlFileUrl } from '@/utils/api-url';
import { getErrorMessage } from '@/utils/error';
import { revokePreview, useComposerStore, useComposerTray } from './composerStore';
import type { UserFileResponse, WebchatPart } from '@/types';

// Backend caps parts per message at 5.
export const MAX_ATTACHMENTS = 5;
// `origin` label of a composer upload — stored server-side as `user:chat` and
// shown back in the listing. Must match [a-z0-9][a-z0-9_-]{0,31}.
const UPLOAD_ORIGIN = 'chat';
const RATE_LIMIT_RETRIES = 2;
const RATE_LIMIT_BASE_DELAY_MS = 1500;

export type ComposerAttachmentError = 'tooLarge' | 'rateLimited' | 'generic';

export interface ComposerAttachment {
  id: string; // local render key
  // 'upload' — a picked local File on its way to the server; 'existing' — a
  // file already in the user's storage, referenced by id without a re-upload.
  source: 'upload' | 'existing';
  file: File | null; // null for 'existing'
  name: string;
  mime: string;
  size: number;
  // blob: URL for an upload, absolute signed URL for an existing file.
  previewUrl: string;
  status: 'uploading' | 'ready' | 'error';
  // Set while an automatic 429 backoff retry is in flight (status stays 'uploading').
  rateLimited: boolean;
  // The stored file row once the upload lands — the same shape the listing
  // returns, which is why a file picked from storage needs no upload at all.
  uploaded: UserFileResponse | null;
  error: ComposerAttachmentError | null;
  errorMessage: string; // backend message for the 'generic' case
}

// A 400 is the refusal with a reason the backend wrote for the user (over 50 MB,
// or the 500 MB daily quota spent); 429 is the 30-uploads-a-minute limit.
const classifyError = (err: unknown): ComposerAttachmentError => {
  if (err instanceof ApiError && (err.status === 413 || err.status === 400)) return 'tooLarge';
  if (err instanceof ApiError && err.status === 429) return 'rateLimited';
  return 'generic';
};

const isRateLimited = (err: unknown): boolean =>
  err instanceof ApiError && err.status === 429;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Render keys, module-wide: a session switch remounts this hook, and a counter
// starting over would hand a fresh attachment the key of a parked one.
let attachmentSeq = 0;

// Composer attachment queue: files start uploading the moment they are picked
// (parallel, with 429 backoff), so the fileIds are usually ready before the
// user hits send. `waitForUploads` is the send-side barrier. Files picked from
// the user's storage join the same tray already 'ready'.
//
// The tray itself lives in the composer store, keyed by session — the hook is
// remounted by every session switch, an upload is not. Everything below reads
// and writes through the store rather than through local state, so an upload
// that lands while the user is in another conversation still reaches the tray
// it belongs to.
export function useComposerAttachments(sessionId: string) {
  const { displayName } = useFileLabels();
  // An upload lands in the user's file storage straight away, whether or not
  // the message is ever sent — so the Files screen and the picker are stale
  // from that moment.
  const { invalidateLists } = useFileCacheActions();
  const store = useComposerStore();
  const attachments = useComposerTray(sessionId);

  // Reads go to the store, not to the rendered array: an upload settling after
  // a session switch has no render of its own to read from.
  const read = useCallback(
    () => store.getEntry(sessionId).attachments,
    [store, sessionId]
  );

  const update = useCallback(
    (next: ComposerAttachment[]) => store.setAttachments(sessionId, next),
    [store, sessionId]
  );

  const patch = useCallback(
    (id: string, changes: Partial<ComposerAttachment>) => {
      update(read().map((a) => (a.id === id ? { ...a, ...changes } : a)));
    },
    [read, update]
  );

  const startUpload = useCallback(
    (id: string, file: File) => {
      const uploads = store.uploads(sessionId);
      const run = (async () => {
        for (let attempt = 0; ; attempt++) {
          try {
            const uploaded = await apiService.uploadUserFile(file, UPLOAD_ORIGIN);
            patch(id, { status: 'ready', rateLimited: false, uploaded });
            invalidateLists();
            return;
          } catch (err) {
            if (isRateLimited(err) && attempt < RATE_LIMIT_RETRIES) {
              patch(id, { rateLimited: true });
              await sleep(RATE_LIMIT_BASE_DELAY_MS * (attempt + 1));
              continue;
            }
            patch(id, {
              status: 'error',
              rateLimited: false,
              error: classifyError(err),
              errorMessage: getErrorMessage(err, ''),
            });
            return;
          }
        }
      })().finally(() => {
        uploads.delete(id);
      });
      uploads.set(id, run);
    },
    [patch, invalidateLists, store, sessionId]
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const current = read();
      const room = MAX_ATTACHMENTS - current.length;
      if (room <= 0) return;
      const accepted = files.slice(0, room);
      const fresh = accepted.map<ComposerAttachment>((file) => ({
        id: `att-${++attachmentSeq}`,
        source: 'upload',
        file,
        name: file.name,
        mime: file.type,
        size: file.size,
        previewUrl: URL.createObjectURL(file),
        status: 'uploading',
        rateLimited: false,
        uploaded: null,
        error: null,
        errorMessage: '',
      }));
      update([...current, ...fresh]);
      fresh.forEach((a) => startUpload(a.id, a.file!));
    },
    [read, update, startUpload]
  );

  // Files picked from the user's storage: nothing to upload, the fileId is the
  // one the list handed out. Already-attached files are skipped rather than
  // duplicated — the same file twice in one message helps nobody.
  const addExisting = useCallback(
    (files: UserFileResponse[]) => {
      const current = read();
      const room = MAX_ATTACHMENTS - current.length;
      if (room <= 0) return;
      const taken = new Set(current.map((a) => a.uploaded?.id).filter(Boolean));
      const fresh = files
        .filter((f) => !taken.has(f.id))
        .slice(0, room)
        .map<ComposerAttachment>((f) => ({
          id: `att-${++attachmentSeq}`,
          source: 'existing',
          file: null,
          name: displayName(f),
          mime: f.mime,
          size: f.size,
          previewUrl: resolveControlFileUrl(f.url),
          status: 'ready',
          rateLimited: false,
          uploaded: f,
          error: null,
          errorMessage: '',
        }));
      if (fresh.length === 0) return;
      update([...current, ...fresh]);
    },
    [read, update, displayName]
  );

  const remove = useCallback(
    (id: string) => {
      const current = read();
      const target = current.find((a) => a.id === id);
      if (target) revokePreview(target.previewUrl);
      update(current.filter((a) => a.id !== id));
    },
    [read, update]
  );

  const retry = useCallback(
    (id: string) => {
      const target = read().find((a) => a.id === id);
      // Only an upload can be retried; an existing file never failed.
      if (!target || target.status !== 'error' || !target.file) return;
      patch(id, { status: 'uploading', error: null, errorMessage: '' });
      startUpload(id, target.file);
    },
    [read, patch, startUpload]
  );

  // Clears the tray after a successful send. The previews are NOT revoked —
  // ownership moved to the thread's optimistic message (the thread revokes
  // them when the session resets).
  const clearAfterSend = useCallback(() => {
    update([]);
  }, [update]);

  // Drops the draft outright, previews included — the session was closed, so
  // there is no composer left to send it from.
  const discard = useCallback(() => {
    store.dispose(sessionId);
  }, [store, sessionId]);

  // Send barrier: resolves once no upload is in flight (retries included) and
  // returns the settled attachments for a status check.
  const waitForUploads = useCallback(async (): Promise<ComposerAttachment[]> => {
    const uploads = store.uploads(sessionId);
    while (uploads.size > 0) {
      await Promise.all([...uploads.values()]);
    }
    return read();
  }, [store, sessionId, read]);

  const toOptimisticParts = useCallback(
    (settled: ComposerAttachment[]): WebchatPart[] =>
      settled
        .filter((a) => a.status === 'ready' && a.uploaded)
        .map((a) => ({
          type: a.uploaded!.type,
          fileId: a.uploaded!.id,
          mime: a.uploaded!.mime,
          size: a.uploaded!.size,
          url: a.previewUrl,
        })),
    []
  );

  return {
    attachments,
    canAddMore: attachments.length < MAX_ATTACHMENTS,
    remainingSlots: MAX_ATTACHMENTS - attachments.length,
    addFiles,
    addExisting,
    remove,
    retry,
    clearAfterSend,
    discard,
    waitForUploads,
    toOptimisticParts,
  };
}
