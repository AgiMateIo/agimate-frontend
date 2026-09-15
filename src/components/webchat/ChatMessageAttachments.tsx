'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  EyeIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { resolveControlFileUrl } from '@/utils/api-url';
import { fileFormatLabel, formatBytes, mediaType } from '@/utils/files';
import type { ChatPart } from '@/types';
import { HTML_PREVIEW_MAX_BYTES, HtmlAttachmentPreview } from './HtmlAttachmentPreview';

// Re-reads history and answers with this attachment's freshly signed link, or
// null when the re-read failed or the message no longer carries the file.
export type RefreshParts = () => Promise<Map<string, ChatPart[]> | null>;

// Every image occupies the same tile regardless of its own dimensions, so a
// thread mixing screenshots, portrait photos and tiny icons keeps one rhythm
// instead of a ragged column. `object-contain` inside the tile letterboxes
// rather than crops, and the img's own max-* stop a small image from being
// upscaled into a blur — it just sits centered in the tile.
const IMAGE_TILE = 'h-52 w-72 max-w-full shrink-0 rounded-lg border border-border bg-surface-secondary';

// Signed image link that expires (~15 min). On the first load error we ask the
// thread to re-read history (fresh URLs) once; a second failure — 404 (gone) or
// a still-broken link — falls back to a placeholder.
function AttachmentImage({
  part,
  onExpired,
}: {
  part: ChatPart;
  onExpired: RefreshParts;
}) {
  const t = useTranslations('Chat');
  const [failed, setFailed] = useState(false);
  const retriedRef = useRef(false);

  if (failed) {
    // Same tile as a loaded image — a broken link must not reflow the thread.
    return (
      <div className={`${IMAGE_TILE} flex flex-col items-center justify-center gap-2 text-xs text-muted`}>
        <PhotoIcon className="h-6 w-6" />
        <span>{t('imageUnavailable')}</span>
      </div>
    );
  }

  const src = resolveControlFileUrl(part.url);
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      title={t('openFullSize')}
      className={`${IMAGE_TILE} grid place-items-center overflow-hidden transition-colors hover:border-accent`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- signed cross-origin URL, not a local asset */}
      <img
        src={src}
        alt={t('imageAttachmentAlt')}
        loading="lazy"
        className="max-h-full max-w-full object-contain"
        onError={() => {
          if (retriedRef.current) {
            setFailed(true);
            return;
          }
          retriedRef.current = true;
          onExpired().catch(() => setFailed(true));
        }}
      />
    </a>
  );
}

// Non-image attachment: a download card. The server serves these as
// Content-Disposition: attachment, so a plain anchor downloads on click.
function AttachmentFile({ part }: { part: ChatPart }) {
  const t = useTranslations('Chat');
  const href = resolveControlFileUrl(part.url);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={part.name ?? part.fileId}
      // What this link does goes in `aria-label` rather than a hidden span —
      // `sr-only` is absolutely positioned, escapes the dashboard shell's
      // clipping and gives a long page a second scrollbar.
      aria-label={t('download')}
      className="flex items-center gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-xs text-foreground transition-colors hover:border-accent"
    >
      <ArrowDownTrayIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
      <span className="font-medium">{fileFormatLabel(part)}</span>
      <span className="text-muted">· {formatBytes(part.size)}</span>
    </a>
  );
}

// A page the agent wrote. It is a `file` like any other on the wire, and the
// download is the same anchor — what it adds is reading the thing without
// leaving the chat, in a document of its own (see HtmlAttachmentPreview: the
// markup is model-written, so it never touches our origin, and opening `url`
// straight is a download by design).
function AttachmentPage({
  part,
  messageId,
  onExpired,
}: {
  part: ChatPart;
  messageId: string | null;
  onExpired: RefreshParts;
}) {
  const t = useTranslations('Chat');
  const [open, setOpen] = useState(false);
  // The file answered 404: it was deleted or its retention ran out. Both
  // actions go — a download would fail exactly the same way.
  const [gone, setGone] = useState(false);
  // Only the preview is out of reach (a storage link JS may not read
  // cross-origin). The download is an <a href> and needs no CORS, so it stays.
  const [noPreview, setNoPreview] = useState(false);

  // A file an agent writes always has a name; the format badge stands in for
  // the rare one that doesn't, with the size alongside either way.
  const label = part.name?.trim() || fileFormatLabel(part);
  const version = part.version ?? 1;
  // Too large to inline: a couple of megabytes of markup in a `srcdoc`
  // attribute freezes the tab, and the file is still perfectly downloadable.
  const previewable = !noPreview && part.size <= HTML_PREVIEW_MAX_BYTES;

  // An expired signature is re-read out of history, and the fresh one is
  // handed back rather than awaited as a prop: reading the refreshed prop right
  // after the await is a race against React's render. An optimistic part has no
  // messageId, but it also carries a blob: URL that never expires.
  const refreshedUrl = useCallback(async () => {
    const fresh = await onExpired();
    if (!fresh || !messageId) return null;
    return fresh.get(messageId)?.find((p) => p.fileId === part.fileId)?.url ?? null;
  }, [onExpired, messageId, part.fileId]);

  return (
    <div className="flex max-w-full flex-col gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <DocumentTextIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
        <span className="truncate font-medium" title={label}>
          {label}
        </span>
        <span className="shrink-0 text-muted">· {formatBytes(part.size)}</span>
        {/* Version 1 is every file's normal state — saying so would be noise. */}
        {version > 1 && <span className="shrink-0 text-muted">· {t('fileVersion', { version })}</span>}
      </div>
      {gone ? (
        <span className="text-muted">{t('fileGone')}</span>
      ) : (
        <div className="flex items-center gap-3">
          {previewable && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex cursor-pointer items-center gap-1 text-accent transition-colors hover:text-accent/80"
            >
              <EyeIcon aria-hidden="true" className="h-4 w-4" />
              {t('viewPage')}
            </button>
          )}
          <a
            href={resolveControlFileUrl(part.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-muted transition-colors hover:text-foreground"
          >
            <ArrowDownTrayIcon aria-hidden="true" className="h-4 w-4" />
            {t('download')}
          </a>
        </div>
      )}
      {open && (
        <HtmlAttachmentPreview
          url={part.url}
          title={label}
          onClose={() => setOpen(false)}
          onGone={() => setGone(true)}
          onNoPreview={() => setNoPreview(true)}
          refreshedUrl={refreshedUrl}
        />
      )}
    </div>
  );
}

// Renders a message's attachments. `onExpired` re-reads history for fresh links
// and hands the result back for anything that fetches a body by hand.
export function ChatMessageAttachments({
  parts,
  messageId,
  onExpired,
}: {
  parts: ChatPart[];
  messageId: string | null;
  onExpired: RefreshParts;
}) {
  if (parts.length === 0) return null;
  return (
    // Uniform tiles pack into rows; `items-start` keeps the short file chips
    // from stretching to a tile's height.
    <div className="flex flex-wrap items-start gap-2">
      {parts.map((part) => {
        if (part.type === 'image') {
          return <AttachmentImage key={part.fileId} part={part} onExpired={onExpired} />;
        }
        // `type` is `file` for a page as much as for a PDF — the format is the
        // media type's to say, and it arrives with parameters often enough
        // (`text/html; charset=utf-8`) that a string comparison would miss it.
        if (mediaType(part.mime) === 'text/html') {
          return (
            <AttachmentPage
              key={part.fileId}
              part={part}
              messageId={messageId}
              onExpired={onExpired}
            />
          );
        }
        return <AttachmentFile key={part.fileId} part={part} />;
      })}
    </div>
  );
}
