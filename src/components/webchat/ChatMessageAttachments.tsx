'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDownTrayIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { resolveControlFileUrl } from '@/utils/api-url';
import type { WebchatPart } from '@/types';

// Human-readable byte size for the download card (e.g. "384 KB", "1.2 MB").
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
}

// Signed image link that expires (~15 min). On the first load error we ask the
// thread to re-read history (fresh URLs) once; a second failure — 404 (gone) or
// a still-broken link — falls back to a placeholder.
function AttachmentImage({
  part,
  onExpired,
}: {
  part: WebchatPart;
  onExpired: () => Promise<void>;
}) {
  const t = useTranslations('Chat');
  const [failed, setFailed] = useState(false);
  const retriedRef = useRef(false);

  if (failed) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-xs text-muted">
        <PhotoIcon className="h-4 w-4 shrink-0" />
        <span>{t('imageUnavailable')}</span>
      </div>
    );
  }

  const src = resolveControlFileUrl(part.url);
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="block w-fit">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed cross-origin URL, not a local asset */}
      <img
        src={src}
        alt={t('imageAttachmentAlt')}
        loading="lazy"
        className="max-h-80 max-w-full rounded-lg border border-border object-contain"
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
function AttachmentFile({ part }: { part: WebchatPart }) {
  const t = useTranslations('Chat');
  const href = resolveControlFileUrl(part.url);
  const kind = part.mime.split('/')[1]?.toUpperCase() || part.type.toUpperCase();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={part.fileId}
      className="flex items-center gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-xs text-foreground transition-colors hover:border-accent"
    >
      <ArrowDownTrayIcon className="h-4 w-4 shrink-0 text-muted" />
      <span className="font-medium">{kind}</span>
      <span className="text-muted">· {formatBytes(part.size)}</span>
      <span className="sr-only">{t('download')}</span>
    </a>
  );
}

// Renders a message's attachments. `onExpired` re-reads history for fresh links.
export function ChatMessageAttachments({
  parts,
  onExpired,
}: {
  parts: WebchatPart[];
  onExpired: () => Promise<void>;
}) {
  if (parts.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
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
