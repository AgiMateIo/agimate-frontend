'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Select } from './FormField';

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface PaginationProps {
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  // Both together, or neither: without them the control is just the range and
  // the two arrows — what a picker inside a modal needs, where a rows-per-page
  // choice is more decision than the situation deserves.
  onPageSizeChange?: (s: number) => void;
  rowsPerPageLabel?: string;
  pageSizeOptions?: number[];
}

export function Pagination({
  page,
  pageSize,
  totalElements,
  totalPages,
  onPageChange,
  onPageSizeChange,
  rowsPerPageLabel,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: PaginationProps) {
  const t = useTranslations('Common');
  const withSizePicker = onPageSizeChange !== undefined && rowsPerPageLabel !== undefined;

  // With a size picker a single page is still worth showing while a smaller page
  // size could split it — so the threshold is the smallest size on offer, not a
  // number of its own. Without one, a single page has nothing to say.
  const tooSmallToPage = withSizePicker
    ? totalElements <= (pageSizeOptions[0] ?? 10)
    : totalPages <= 1;
  if (tooSmallToPage) return null;

  return (
    <div className={`flex items-center pt-2 ${withSizePicker ? 'justify-between' : 'justify-end'}`}>
      {withSizePicker && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{rowsPerPageLabel}:</span>
          <Select
            size="xs"
            fullWidth={false}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
      )}
      <div className="flex items-center gap-3 text-xs text-muted">
        <span>
          {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} / {totalElements}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            aria-label={t('previous')}
            className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            aria-label={t('next')}
            className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
