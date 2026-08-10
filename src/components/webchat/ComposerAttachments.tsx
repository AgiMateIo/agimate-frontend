'use client';

import { useTranslations } from 'next-intl';
import {
  CheckIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { formatBytes } from '@/utils/files';
import { MAX_ATTACHMENTS, ComposerAttachment } from './useComposerAttachments';

function AttachmentChip({
  attachment,
  onRemove,
  onRetry,
}: {
  attachment: ComposerAttachment;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const t = useTranslations('Chat');
  const isImage = attachment.mime.startsWith('image/');
  const isError = attachment.status === 'error';

  // A 400 is the size cap *or* the exhausted daily quota, and the backend
  // writes that message for the user to read — prefer it over our own guess.
  // The chip is narrow, so the full text also goes into the tooltip.
  const errorText = isError
    ? attachment.error === 'rateLimited'
      ? t('tooManyUploads')
      : attachment.errorMessage ||
        (attachment.error === 'tooLarge' ? t('fileTooLarge') : t('uploadFailed'))
    : '';

  const statusLine = isError ? (
    <span className="text-[11px] text-error truncate" title={errorText}>
      {errorText}
    </span>
  ) : attachment.status === 'uploading' ? (
    <span className="text-[11px] text-muted truncate">
      {attachment.rateLimited ? t('uploadRateLimited') : t('uploading')}
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[11px] text-muted">
      <CheckIcon className="h-3 w-3 shrink-0 text-success" />
      {formatBytes(attachment.size)}
    </span>
  );

  return (
    <div
      className={`relative flex items-center gap-2 rounded-lg border bg-surface-secondary py-1.5 pl-1.5 pr-2 ${
        isError ? 'border-error/60' : 'border-border'
      }`}
    >
      {isImage ? (
        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          <img
            src={attachment.previewUrl}
            alt={attachment.name}
            className="h-full w-full object-cover"
          />
          {attachment.status === 'uploading' && (
            <span className="absolute inset-0 grid place-items-center bg-background/60">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted/40 border-t-accent" />
            </span>
          )}
        </span>
      ) : (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border bg-background text-muted">
          {isError ? (
            <ExclamationTriangleIcon className="h-5 w-5 text-error" />
          ) : attachment.status === 'uploading' ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted/40 border-t-accent" />
          ) : (
            <DocumentIcon className="h-5 w-5" />
          )}
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <span className="max-w-[9rem] truncate text-xs font-medium text-foreground">
          {attachment.name}
        </span>
        {statusLine}
        {isError && attachment.file && (
          <button
            type="button"
            onClick={onRetry}
            className="self-start text-[11px] text-accent hover:text-accent/80 transition-colors"
          >
            {t('retryUpload')}
          </button>
        )}
      </span>
      <button
        type="button"
        onClick={onRemove}
        title={t('removeAttachment')}
        className="absolute -right-1.5 -top-1.5 grid h-4.5 w-4.5 place-items-center rounded-full bg-foreground text-background hover:bg-error hover:text-accent-foreground transition-colors"
      >
        <XMarkIcon className="h-3 w-3" />
        <span className="sr-only">{t('removeAttachment')}</span>
      </button>
    </div>
  );
}

// The tray of pending attachments, rendered along the composer's bottom edge
// between the attach button and the send/stop actions.
export function ComposerAttachments({
  attachments,
  onRemove,
  onRetry,
}: {
  attachments: ComposerAttachment[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  if (attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {attachments.map((a) => (
        <AttachmentChip
          key={a.id}
          attachment={a}
          onRemove={() => onRemove(a.id)}
          onRetry={() => onRetry(a.id)}
        />
      ))}
      <span className="text-[11px] text-muted">
        <span className="font-semibold text-foreground">{attachments.length}</span>/{MAX_ATTACHMENTS}
      </span>
    </div>
  );
}
