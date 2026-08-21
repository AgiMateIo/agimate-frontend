'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pagination } from '@/components/ui/Pagination';
import { useUserFilesQuery } from '@/queries/files';
import type { UserFileResponse } from '@/types';
import { FileCard } from './FileCard';
import { FileTable } from './FileTable';
import { FileTile } from './FileTile';
import DeleteFileModal from './DeleteFileModal';
import type { FilesViewMode } from './filesViewMode';
import { Placeholder } from '@/components/ui/Placeholder';

export default function UserFilesList({
  agentId,
  name,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  agentNames,
  mode,
}: {
  agentId: string;
  name: string;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  // id → name of the agent that created a file; empty while the agents list loads.
  agentNames: Map<string, string>;
  mode: FilesViewMode;
}) {
  const t = useTranslations('Files');
  const { data, refetch } = useUserFilesQuery(agentId, name, page, pageSize);
  const [pendingDelete, setPendingDelete] = useState<UserFileResponse | null>(null);

  if (data.content.length === 0) {
    return (
      <Placeholder>
        {agentId || name ? t('noFilesFiltered') : t('noFiles')}
      </Placeholder>
    );
  }

  // A dead signature is not an error to show — re-reading the page signs every
  // link anew. Concurrent failures collapse into one refetch (same query key).
  const onLinkExpired = () => void refetch();
  const agentNameOf = (file: UserFileResponse) =>
    file.agentId ? agentNames.get(file.agentId) : null;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted">{t('filesTotal', { count: data.totalElements })}</div>

      {mode === 'table' ? (
        <FileTable
          files={data.content}
          agentNames={agentNames}
          onLinkExpired={onLinkExpired}
          onDelete={setPendingDelete}
        />
      ) : mode === 'compact' ? (
        // Eight per row on a wide screen, fewer as it narrows — a tile under
        // ~90px stops being a recognisable preview.
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
          {data.content.map((file) => (
            <FileTile
              key={file.id}
              file={file}
              agentName={agentNameOf(file)}
              onLinkExpired={onLinkExpired}
              onDelete={() => setPendingDelete(file)}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.content.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              agentName={agentNameOf(file)}
              onLinkExpired={onLinkExpired}
              onDelete={() => setPendingDelete(file)}
            />
          ))}
        </div>
      )}

      {/* Newest-first is fixed on the backend — there is no sort to offer. */}
      <Pagination
        page={page}
        pageSize={data.size}
        totalElements={data.totalElements}
        totalPages={data.totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        rowsPerPageLabel={t('rowsPerPage')}
      />

      {pendingDelete && (
        <DeleteFileModal file={pendingDelete} onClose={() => setPendingDelete(null)} />
      )}
    </div>
  );
}
