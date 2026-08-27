'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDownTrayIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { resolveControlFileUrl } from '@/utils/api-url';
import { formatBytes } from '@/utils/files';
import type { ChatPart } from '@/types';

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
  onExpired: () => Promise<void>;
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

// Short extension labels for MIME types whose subtype isn't already a clean
// label (e.g. the xlsx subtype is a long `vnd.openxmlformats-...` string).
const MIME_LABELS: Record<string, string> = {
  'text/csv': 'CSV',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/pdf': 'PDF',
};

// Non-image attachment: a download card. The server serves these as
// Content-Disposition: attachment, so a plain anchor downloads on click.
function AttachmentFile({ part }: { part: ChatPart }) {
  const t = useTranslations('Chat');
  const href = resolveControlFileUrl(part.url);
  const kind = MIME_LABELS[part.mime] ?? part.mime.split('/')[1]?.toUpperCase() ?? part.type.toUpperCase();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={part.fileId}
      // What this link does goes in `aria-label` rather than a hidden span —
      // `sr-only` is absolutely positioned, escapes the dashboard shell's
      // clipping and gives a long page a second scrollbar.
      aria-label={t('download')}
      className="flex items-center gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-xs text-foreground transition-colors hover:border-accent"
    >
      <ArrowDownTrayIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
      <span className="font-medium">{kind}</span>
      <span className="text-muted">· {formatBytes(part.size)}</span>
    </a>
  );
}

// Renders a message's attachments. `onExpired` re-reads history for fresh links.
export function ChatMessageAttachments({
  parts,
  onExpired,
}: {
  parts: ChatPart[];
  onExpired: () => Promise<void>;
}) {
  if (parts.length === 0) return null;
  return (
    // Uniform tiles pack into rows; `items-start` keeps the short file chips
    // from stretching to a tile's height.
    <div className="flex flex-wrap items-start gap-2">
      {parts.map((part) =>
        part.type === 'image' ? (
          <AttachmentImage key={part.fileId} part={part} onExpired={onExpired} />
        ) : (
          <AttachmentFile key={part.fileId} part={part} />
        )
      )}
    </div>
  );
}
