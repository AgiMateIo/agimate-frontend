'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import apiService, { ApiError } from '@/services/api';
import { useFileCacheActions } from '@/queries/files';
import { useFileLabels } from '@/components/files/fileLabels';
import { resolveControlFileUrl } from '@/utils/api-url';
import { getErrorMessage } from '@/utils/error';
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

// Only local previews are ours to release; a signed server URL is not.
const revokePreview = (url: string) => {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url);
};

// Composer attachment queue: files start uploading the moment they are picked
// (parallel, with 429 backoff), so the fileIds are usually ready before the
// user hits send. `waitForUploads` is the send-side barrier. Files picked from
// the user's storage join the same tray already 'ready'.
export function useComposerAttachments() {
  const { displayName } = useFileLabels();
  // An upload lands in the user's file storage straight away, whether or not
  // the message is ever sent — so the Files screen and the picker are stale
  // from that moment.
  const { invalidateLists } = useFileCacheActions();
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  // Mirror for reads after an await (waitForUploads resolves before React
  // re-renders the closed-over state).
  const attachmentsRef = useRef<ComposerAttachment[]>([]);
  // In-flight upload promises, keyed by attachment id (settled = removed).
  const uploadsRef = useRef<Map<string, Promise<void>>>(new Map());
  const seqRef = useRef(0);

  const update = useCallback((next: ComposerAttachment[]) => {
    attachmentsRef.current = next;
    setAttachments(next);
  }, []);

  const patch = useCallback(
    (id: string, changes: Partial<ComposerAttachment>) => {
      update(
        attachmentsRef.current.map((a) => (a.id === id ? { ...a, ...changes } : a))
      );
    },
    [update]
  );

  const startUpload = useCallback(
    (id: string, file: File) => {
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
        uploadsRef.current.delete(id);
      });
      uploadsRef.current.set(id, run);
    },
    [patch, invalidateLists]
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const room = MAX_ATTACHMENTS - attachmentsRef.current.length;
      if (room <= 0) return;
      const accepted = files.slice(0, room);
      const fresh = accepted.map<ComposerAttachment>((file) => ({
        id: `att-${++seqRef.current}`,
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
      update([...attachmentsRef.current, ...fresh]);
      fresh.forEach((a) => startUpload(a.id, a.file!));
    },
    [update, startUpload]
  );

  // Files picked from the user's storage: nothing to upload, the fileId is the
  // one the list handed out. Already-attached files are skipped rather than
  // duplicated — the same file twice in one message helps nobody.
  const addExisting = useCallback(
    (files: UserFileResponse[]) => {
      const room = MAX_ATTACHMENTS - attachmentsRef.current.length;
      if (room <= 0) return;
      const taken = new Set(
        attachmentsRef.current.map((a) => a.uploaded?.id).filter(Boolean)
      );
      const fresh = files
        .filter((f) => !taken.has(f.id))
        .slice(0, room)
        .map<ComposerAttachment>((f) => ({
          id: `att-${++seqRef.current}`,
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
      update([...attachmentsRef.current, ...fresh]);
    },
    [update, displayName]
  );

  const remove = useCallback(
    (id: string) => {
      const target = attachmentsRef.current.find((a) => a.id === id);
      if (target) revokePreview(target.previewUrl);
      update(attachmentsRef.current.filter((a) => a.id !== id));
    },
    [update]
  );

  const retry = useCallback(
    (id: string) => {
      const target = attachmentsRef.current.find((a) => a.id === id);
      // Only an upload can be retried; an existing file never failed.
      if (!target || target.status !== 'error' || !target.file) return;
      patch(id, { status: 'uploading', error: null, errorMessage: '' });
      startUpload(id, target.file);
    },
    [patch, startUpload]
  );

  // Clears the tray after a successful send. The previews are NOT revoked —
  // ownership moved to the thread's optimistic message (the thread revokes
  // them when the session resets).
  const clearAfterSend = useCallback(() => {
    update([]);
  }, [update]);

  // Send barrier: resolves once no upload is in flight (retries included) and
  // returns the settled attachments for a status check.
  const waitForUploads = useCallback(async (): Promise<ComposerAttachment[]> => {
    while (uploadsRef.current.size > 0) {
      await Promise.all([...uploadsRef.current.values()]);
    }
    return attachmentsRef.current;
  }, []);

  // Revoke previews still sitting in the tray when the composer unmounts.
  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((a) => revokePreview(a.previewUrl));
      attachmentsRef.current = [];
    };
  }, []);

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
    waitForUploads,
    toOptimisticParts,
  };
}
