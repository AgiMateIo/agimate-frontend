'use client';

import { useState, Suspense, use, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import {
  ConnectorCatalogEntry,
  ConnectorType,
  PagedResponse,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { usePromiseCache } from '@/hooks/usePromiseCache';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

type TypeFilter = 'ALL' | ConnectorType;

const TYPE_FILTERS: TypeFilter[] = ['ALL', 'APP', 'INTEGRATION', 'INTERNAL_SERVICE', 'LOOPBACK'];

const TYPE_BADGE: Record<ConnectorType, string> = {
  APP: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  INTEGRATION: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  INTERNAL_SERVICE: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  LOOPBACK: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
};

function ConnectorsContent({
  dataPromise,
  page,
  onPageChange,
}: {
  dataPromise: Promise<PagedResponse<ConnectorCatalogEntry>>;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations('ConnectorCatalog');
  const data = use(dataPromise);

  if (data.empty) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center text-muted">
        {t('empty')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.content.map((connector) => (
          <ConnectorCard key={connector.code} connector={connector} />
        ))}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted">
            {t('page', { current: page + 1, total: data.totalPages })}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page === 0}>
              {t('previous')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= data.totalPages - 1}
            >
              {t('next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectorCard({ connector }: { connector: ConnectorCatalogEntry }) {
  const t = useTranslations('ConnectorCatalog');

  return (
    <div className="bg-surface rounded-xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground truncate">{connector.name}</h3>
          <code className="text-xs text-muted font-mono">{connector.code}</code>
        </div>
        <span
          className={`shrink-0 inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${TYPE_BADGE[connector.type]}`}
        >
          {t(`type.${connector.type}`)}
        </span>
      </div>
      <p className="text-sm text-muted leading-relaxed line-clamp-3">
        {connector.description ?? t('noDescription')}
      </p>
    </div>
  );
}

export default function ConnectorsPage() {
  const t = useTranslations('ConnectorCatalog');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebouncedValue(search, 300);

  const fetchFn = useCallback(
    () =>
      apiService.getConnectors({
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        search: debouncedSearch || undefined,
        page,
        size: 20,
      }),
    [typeFilter, debouncedSearch, page]
  );

  const { promise } = usePromiseCache(
    fetchFn,
    [typeFilter, debouncedSearch, page],
    'connectors-list'
  );

  const handleTypeChange = (type: TypeFilter) => {
    setTypeFilter(type);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted mt-1">{t('subtitle')}</p>
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((type) => {
          const isActive = typeFilter === type;
          return (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                isActive
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-surface border-border text-muted hover:text-foreground hover:bg-surface-secondary'
              }`}
            >
              {type === 'ALL' ? t('typeAll') : t(`type.${type}`)}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground placeholder:text-muted text-sm"
        />
      </div>

      {/* List */}
      <ErrorBoundary>
        <Suspense fallback={<div className="text-center py-12 text-muted">{t('loading')}</div>}>
          <ConnectorsContent dataPromise={promise} page={page} onPageChange={setPage} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
