'use client';

import { useTranslations } from 'next-intl';
import { formatBytes, getFileExpiry } from '@/utils/files';
import type { UserFileResponse } from '@/types';
import { FileActions } from './FileActions';
import { FileThumbnail } from './FileThumbnail';
import { useFileLabels } from './fileLabels';

// Compact tile for the thumbnail wall: the picture does the identifying, the
// rest of the metadata moves into the tooltip so eight of these fit in a row.
export function FileTile({
  file,
  agentName,
  onLinkExpired,
  onDelete,
}: {
  file: UserFileResponse;
  agentName: string | null | undefined;
  onLinkExpired?: () => void;
  onDelete?: () => void;
}) {
  const t = useTranslations('Files');
  const { displayName, expiryLabel } = useFileLabels();

  const name = displayName(file);
  const expiry = getFileExpiry(file.expiresAt);
  const author = agentName ?? (file.agentId ? t('unknownAgent') : t('uploadedByYou'));
  const tooltip = `${name}\n${formatBytes(file.size)} · ${author}\n${expiryLabel(file.expiresAt)}`;

  return (
    <div className="group min-w-0">
      <div className="relative aspect-square w-full rounded-lg border border-border bg-surface-secondary transition-colors group-hover:border-accent/50">
        <FileThumbnail
          file={file}
          onLinkExpired={onLinkExpired}
          className="h-full w-full rounded-lg"
          iconClassName="h-6 w-6"
        />

        {/* The tile has no room for the retention chip; a dot marks the files
            that are about to go, and the tooltip spells it out. */}
        {expiry.urgent && (
          <span
            title={expiryLabel(file.expiresAt)}
            className="absolute bottom-1.5 left-1.5 h-2 w-2 rounded-full bg-warning ring-2 ring-background"
          />
        )}

        <div className="absolute right-1 top-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          <FileActions file={file} onDelete={onDelete} size="sm" />
        </div>
      </div>

      <div className="mt-1 truncate text-xs text-foreground" title={tooltip}>
        {name}
      </div>
      <div className="truncate text-[11px] text-muted">{formatBytes(file.size)}</div>
    </div>
  );
}
