'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import apiService, { ApiError } from '@/services/api';
import { getErrorMessage } from '@/utils/error';
import type { WebchatFileUploadResponse, WebchatPart } from '@/types';

// Backend caps parts per message at 5.
export const MAX_ATTACHMENTS = 5;
const RATE_LIMIT_RETRIES = 2;
const RATE_LIMIT_BASE_DELAY_MS = 1500;

export type ComposerAttachmentError = 'tooLarge' | 'rateLimited' | 'generic';

export interface ComposerAttachment {
  id: string; // local render key
  file: File;
  previewUrl: string; // blob: URL (image thumb / local download link)
  status: 'uploading' | 'ready' | 'error';
  // Set while an automatic 429 backoff retry is in flight (status stays 'uploading').
  rateLimited: boolean;
  uploaded: WebchatFileUploadResponse | null;
  error: ComposerAttachmentError | null;
  errorMessage: string; // backend message for the 'generic' case
}

const classifyError = (err: unknown): ComposerAttachmentError => {
  if (err instanceof ApiError && (err.status === 413 || err.status === 400)) return 'tooLarge';
  if (err instanceof ApiError && err.status === 429) return 'rateLimited';
  return 'generic';
};

const isRateLimited = (err: unknown): boolean =>
  err instanceof ApiError && err.status === 429;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Composer attachment queue: files start uploading the moment they are picked
// (parallel, with 429 backoff), so the fileIds are usually ready before the
// user hits send. `waitForUploads` is the send-side barrier.
export function useComposerAttachments() {
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
            const uploaded = await apiService.uploadWebchatFile(file);
            patch(id, { status: 'ready', rateLimited: false, uploaded });
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
    [patch]
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const room = MAX_ATTACHMENTS - attachmentsRef.current.length;
      if (room <= 0) return;
      const accepted = files.slice(0, room);
      const fresh = accepted.map<ComposerAttachment>((file) => ({
        id: `att-${++seqRef.current}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'uploading',
        rateLimited: false,
        uploaded: null,
        error: null,
        errorMessage: '',
      }));
      update([...attachmentsRef.current, ...fresh]);
      fresh.forEach((a) => startUpload(a.id, a.file));
    },
    [update, startUpload]
  );

  const remove = useCallback(
    (id: string) => {
      const target = attachmentsRef.current.find((a) => a.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      update(attachmentsRef.current.filter((a) => a.id !== id));
    },
    [update]
  );

  const retry = useCallback(
    (id: string) => {
      const target = attachmentsRef.current.find((a) => a.id === id);
      if (!target || target.status !== 'error') return;
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
      attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.previewUrl));
      attachmentsRef.current = [];
    };
  }, []);

  const toOptimisticParts = useCallback(
    (settled: ComposerAttachment[]): WebchatPart[] =>
      settled
        .filter((a) => a.status === 'ready' && a.uploaded)
        .map((a) => ({
          type: a.uploaded!.mime.startsWith('image/') ? 'image' : 'file',
          fileId: a.uploaded!.fileId,
          mime: a.uploaded!.mime,
          size: a.uploaded!.size,
          url: a.previewUrl,
        })),
    []
  );

  return {
    attachments,
    canAddMore: attachments.length < MAX_ATTACHMENTS,
    addFiles,
    remove,
    retry,
    clearAfterSend,
    waitForUploads,
    toOptimisticParts,
  };
}
