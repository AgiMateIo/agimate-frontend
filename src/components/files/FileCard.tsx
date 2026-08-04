'use client';

import { useLocale, useTranslations } from 'next-intl';
import { CheckIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { localeMap } from '@/i18n/routing';
import { Chip } from '@/components/ui/Chip';
import { formatDate } from '@/utils/date';
import { formatBytes, getFileExpiry } from '@/utils/files';
import type { UserFileResponse } from '@/types';
import { FileActions } from './FileActions';
import { FileThumbnail } from './FileThumbnail';
import { useFileLabels } from './fileLabels';

// Every card gets the same media band regardless of the image's own dimensions,
// so a grid mixing screenshots, photos and documents keeps one rhythm.
const MEDIA_BAND = 'relative h-32 w-full rounded-lg bg-surface-secondary';

interface FileCardProps {
  file: UserFileResponse;
  // Name of the agent that created the file; null for a file no agent created.
  agentName: string | null | undefined;
  onLinkExpired?: () => void;
  // Selection mode (attachment picker): the whole card toggles instead of
  // exposing download/delete.
  selectable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onToggleSelect?: () => void;
  onDelete?: () => void;
}

export function FileCard({
  file,
  agentName,
  onLinkExpired,
  selectable = false,
  selected = false,
  disabled = false,
  onToggleSelect,
  onDelete,
}: FileCardProps) {
  const t = useTranslations('Files');
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];
  const { displayName, expiryLabel } = useFileLabels();

  const expiry = getFileExpiry(file.expiresAt);
  const name = displayName(file);

  const body = (
    <>
      <FileThumbnail file={file} onLinkExpired={onLinkExpired} className={MEDIA_BAND} />

      <div className="mt-2 min-w-0">
        <div className="truncate text-sm font-medium text-foreground" title={name}>
          {name}
        </div>
        {/* `origin` is a technical string with no stable format — a tooltip is
            as far as it may go. */}
        <div className="mt-0.5 truncate text-xs text-muted" title={file.origin}>
          {formatBytes(file.size)} · {formatDate(file.createdAt, bcp47Locale)}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Chip icon={UserCircleIcon}>
          {agentName ?? (file.agentId ? t('unknownAgent') : t('uploadedByYou'))}
        </Chip>
        <Chip tone={expiry.urgent ? 'warning' : 'default'}>{expiryLabel(file.expiresAt)}</Chip>
      </div>
    </>
  );

  if (selectable) {
    return (
      <button
        type="button"
        onClick={onToggleSelect}
        disabled={disabled && !selected}
        aria-pressed={selected}
        className={`relative rounded-xl border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          selected ? 'border-accent bg-accent/5' : 'border-border bg-surface hover:border-accent/50'
        }`}
      >
        <span
          className={`absolute right-4 top-4 z-10 grid h-5 w-5 place-items-center rounded-full border ${
            selected
              ? 'border-accent bg-accent text-accent-foreground'
              : 'border-border bg-background/80 text-transparent'
          }`}
        >
          <CheckIcon className="h-3.5 w-3.5" />
        </span>
        {body}
      </button>
    );
  }

  return (
    <div className="group relative rounded-xl border border-border bg-surface p-2.5 transition-colors hover:border-accent/50">
      {/* Actions sit over the media band: always visible on touch, where there
          is no hover to reveal them. */}
      <div className="absolute right-4 top-4 z-10 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
        <FileActions file={file} onDelete={onDelete} />
      </div>
      {body}
    </div>
  );
}
