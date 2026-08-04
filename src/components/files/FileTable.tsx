'use client';

import { useTranslations } from 'next-intl';
import { formatDateTimeFull, formatDateTimeShort } from '@/utils/date';
import { fileFormatLabel, formatBytes, getFileExpiry } from '@/utils/files';
import type { UserFileResponse } from '@/types';
import { FileActions } from './FileActions';
import { FileThumbnail } from './FileThumbnail';
import { useFileLabels } from './fileLabels';

function FileRow({
  file,
  agentName,
  onLinkExpired,
  onDelete,
}: {
  file: UserFileResponse;
  agentName: string | null | undefined;
  onLinkExpired?: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations('Files');
  const { displayName, expiryLabel, expiryShortLabel } = useFileLabels();

  const name = displayName(file);
  const expiry = getFileExpiry(file.expiresAt);

  return (
    <tr className="border-b border-border transition-colors last:border-b-0 hover:bg-surface-secondary">
      <td className="py-2 pl-4 pr-2">
        <FileThumbnail
          file={file}
          onLinkExpired={onLinkExpired}
          className="h-10 w-10 shrink-0 rounded-md bg-surface-secondary"
          iconClassName="h-4 w-4"
          showFormat={false}
        />
      </td>
      <td className="max-w-0 py-2 px-2">
        {/* `origin` has no stable format — tooltip only, never parsed. */}
        <div className="truncate text-sm font-medium text-foreground" title={`${name}\n${file.origin}`}>
          {name}
        </div>
        <div className="truncate text-xs text-muted lg:hidden">
          {fileFormatLabel(file)} · {formatBytes(file.size)}
        </div>
      </td>
      <td className="hidden py-2 px-2 lg:table-cell">
        <span className="block truncate text-xs font-semibold tracking-wide text-muted">
          {fileFormatLabel(file)}
        </span>
      </td>
      <td className="hidden py-2 px-2 lg:table-cell">
        <span className="block truncate text-sm text-muted">{formatBytes(file.size)}</span>
      </td>
      <td className="hidden py-2 px-2 md:table-cell">
        <span className="block truncate text-sm text-muted">
          {agentName ?? (file.agentId ? t('unknownAgent') : t('uploadedByYou'))}
        </span>
      </td>
      {/* Compact date and bare remaining time: the full "04 августа 2026 г.,
          11:20" is twice a sane column, and the exact moment is in the tooltip. */}
      <td className="hidden py-2 px-2 md:table-cell">
        <span className="block truncate text-sm text-muted" title={formatDateTimeFull(file.createdAt)}>
          {formatDateTimeShort(file.createdAt)}
        </span>
      </td>
      <td className="py-2 px-2">
        <span
          title={expiryLabel(file.expiresAt)}
          className={`block truncate text-sm ${expiry.urgent ? 'text-warning' : 'text-muted'}`}
        >
          {expiryShortLabel(file.expiresAt)}
        </span>
      </td>
      <td className="py-2 pl-2 pr-4">
        <div className="flex justify-end">
          <FileActions file={file} onDelete={onDelete} variant="inline" />
        </div>
      </td>
    </tr>
  );
}

// Dense view: one row per file with the fields worth comparing across files —
// format, size, who made it, when it arrived and when it goes.
export function FileTable({
  files,
  agentNames,
  onLinkExpired,
  onDelete,
}: {
  files: UserFileResponse[];
  agentNames: Map<string, string>;
  onLinkExpired?: () => void;
  onDelete: (file: UserFileResponse) => void;
}) {
  const t = useTranslations('Files');

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      {/* table-fixed keeps the columns from being re-sized by one long file
          name; the min width is what makes the wrapper scroll instead of
          squeezing every column into overlap. */}
      <table className="w-full min-w-[44rem] table-fixed">
        <thead>
          <tr className="border-b border-border">
            <th className="w-14" />
            <th className="py-3 px-2 text-left text-sm font-medium text-muted">
              {t('columnName')}
            </th>
            <th className="hidden w-20 py-3 px-2 text-left text-sm font-medium text-muted lg:table-cell">
              {t('columnFormat')}
            </th>
            <th className="hidden w-24 py-3 px-2 text-left text-sm font-medium text-muted lg:table-cell">
              {t('columnSize')}
            </th>
            <th className="hidden w-40 py-3 px-2 text-left text-sm font-medium text-muted md:table-cell">
              {t('columnAgent')}
            </th>
            <th className="hidden w-28 py-3 px-2 text-left text-sm font-medium text-muted md:table-cell">
              {t('columnCreated')}
            </th>
            <th className="w-28 py-3 px-2 text-left text-sm font-medium text-muted">
              {t('columnExpiry')}
            </th>
            <th className="w-20" />
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              agentName={file.agentId ? agentNames.get(file.agentId) : null}
              onLinkExpired={onLinkExpired}
              onDelete={() => onDelete(file)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
