'use client';

import { useTranslations } from 'next-intl';
import { ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { resolveControlFileUrl } from '@/utils/api-url';
import type { UserFileResponse } from '@/types';

// 'overlay' — floating over a preview (card, tile): needs a surface of its own.
// 'inline'  — inside a table cell, on the row's own background.
type Variant = 'overlay' | 'inline';

const BUTTON = 'grid place-items-center rounded-lg border transition-colors';

export function FileActions({
  file,
  onDelete,
  variant = 'overlay',
  size = 'md',
}: {
  file: UserFileResponse;
  onDelete?: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
}) {
  const t = useTranslations('Files');
  const box = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const surface =
    variant === 'overlay' ? 'border-border bg-background/90' : 'border-transparent bg-transparent';

  return (
    <div className="flex gap-1">
      {/* Images open in the browser, everything else downloads — the backend
          sets the disposition, so a plain anchor is the whole mechanism. */}
      <a
        href={resolveControlFileUrl(file.url)}
        target="_blank"
        rel="noopener noreferrer"
        title={t('download')}
        aria-label={t('download')}
        className={`${BUTTON} ${box} ${surface} text-muted hover:border-accent hover:text-accent`}
      >
        <ArrowDownTrayIcon className={icon} />
      </a>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title={t('deleteFile')}
          aria-label={t('deleteFile')}
          className={`${BUTTON} ${box} ${surface} text-muted hover:border-error hover:text-error`}
        >
          <TrashIcon className={icon} />
        </button>
      )}
    </div>
  );
}
