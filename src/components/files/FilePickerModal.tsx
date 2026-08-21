'use client';

import { Suspense, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { allAgentsOptions } from '@/queries/agents';
import { useUserFilesQuery } from '@/queries/files';
import type { UserFileResponse } from '@/types';
import { FileCard } from './FileCard';
import { Placeholder } from '@/components/ui/Placeholder';

const PAGE_SIZE = 12;

function PickerGrid({
  name,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  agentNames,
  selected,
  onToggle,
  full,
}: {
  name: string;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  agentNames: Map<string, string>;
  selected: UserFileResponse[];
  onToggle: (file: UserFileResponse) => void;
  // No slots left: everything not already picked is disabled.
  full: boolean;
}) {
  const t = useTranslations('Files');
  const { data, refetch } = useUserFilesQuery('', name, page, pageSize);
  const selectedIds = new Set(selected.map((f) => f.id));

  if (data.content.length === 0) {
    return (
      <Placeholder size="sm">
        {name ? t('noFilesFiltered') : t('noFiles')}
      </Placeholder>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {data.content.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            agentName={file.agentId ? agentNames.get(file.agentId) : null}
            onLinkExpired={() => void refetch()}
            selectable
            selected={selectedIds.has(file.id)}
            disabled={full}
            onToggleSelect={() => onToggle(file)}
          />
        ))}
      </div>

      <Pagination
        page={page}
        pageSize={data.size}
        totalElements={data.totalElements}
        totalPages={data.totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        rowsPerPageLabel={t('rowsPerPage')}
      />
    </div>
  );
}

// Attaching a file the user already has: no re-upload, no second copy — the
// composer references the same fileId the list hands out.
export default function FilePickerModal({
  remainingSlots,
  onClose,
  onPick,
}: {
  remainingSlots: number;
  onClose: () => void;
  onPick: (files: UserFileResponse[]) => void;
}) {
  const t = useTranslations('Files');
  const tCommon = useTranslations('Common');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<UserFileResponse[]>([]);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const agentsQuery = useQuery(allAgentsOptions());
  const agentNames = useMemo(
    () => new Map((agentsQuery.data?.content ?? []).map((a) => [a.id, a.name])),
    [agentsQuery.data],
  );

  const toggle = (file: UserFileResponse) => {
    setSelected((prev) => {
      if (prev.some((f) => f.id === file.id)) return prev.filter((f) => f.id !== file.id);
      if (prev.length >= remainingSlots) return prev;
      return [...prev, file];
    });
  };

  return (
    <Modal isOpen onClose={onClose} title={t('pickerTitle')} size="xl" showCloseButton>
      <div className="space-y-4">
        <p className="text-sm text-muted">{t('pickerHint', { max: remainingSlots })}</p>

        <SearchToolbar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(0);
          }}
          placeholder={t('searchPlaceholder')}
          size="sm"
        />

        {/* Scrolls inside the modal so the footer buttons stay reachable. */}
        <div className="max-h-[55vh] overflow-y-auto pr-1">
          <ErrorBoundary resetKeys={[debouncedSearch, page, pageSize]}>
            <Suspense
              fallback={<Placeholder size="sm">{t('loadingFiles')}</Placeholder>}
            >
              <PickerGrid
                name={debouncedSearch}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(0);
                }}
                agentNames={agentNames}
                selected={selected}
                onToggle={toggle}
                full={selected.length >= remainingSlots}
              />
            </Suspense>
          </ErrorBoundary>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => onPick(selected)}
            disabled={selected.length === 0}
          >
            {t('attachSelected', { count: selected.length })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
