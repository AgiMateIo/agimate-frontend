'use client';

import { useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { ConnectorCatalogEntry, DefinitionBinding, ExecutionKind } from '@/types';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ConnectionAvatar } from '@/components/connections/ConnectionAvatar';
import { useConnectorSearchQuery } from '@/queries/connectors';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getConnectorKind, ConnectorKind } from '@/utils/connector';
import { Placeholder } from '@/components/ui/Placeholder';
import { Pagination } from '@/components/ui/Pagination';

type CapabilityKey =
  | `capabilities.executionKind.${ExecutionKind}`
  | `capabilities.definitionBinding.${DefinitionBinding}`;

const KIND_BADGE: Record<ConnectorKind, string> = {
  INTEGRATION: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  APP: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  SERVICE: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
};

function ConnectorsContent({
  search,
  page,
  onPageChange,
}: {
  search: string;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations('ConnectorCatalog');
  const { data } = useConnectorSearchQuery(search, page);

  if (data.content.length === 0) {
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
      <Pagination
        page={page}
        pageSize={data.size}
        totalElements={data.totalElements}
        totalPages={data.totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}

function ConnectorCard({ connector }: { connector: ConnectorCatalogEntry }) {
  const t = useTranslations('ConnectorCatalog');
  const caps = connector.capabilities;
  const kind = getConnectorKind(connector);

  // The backend owns the capability enums and grows them (executionKind gained APP),
  // so an unlabelled value shows raw rather than throwing MISSING_MESSAGE.
  const capabilityLabel = (group: 'executionKind' | 'definitionBinding', value: string) => {
    const key = `capabilities.${group}.${value}` as CapabilityKey;
    return t.has(key) ? t(key) : value;
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <ConnectionAvatar connectorCode={connector.code} connectorName={connector.name} />
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground truncate">{connector.name}</h3>
            <code className="text-xs text-muted font-mono">{connector.code}</code>
          </div>
        </div>
        <span
          className={`shrink-0 inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${KIND_BADGE[kind]}`}
        >
          {t(`kind.${kind}`)}
        </span>
      </div>
      <p className="text-sm text-muted leading-relaxed line-clamp-3">
        {connector.description ?? t('noDescription')}
      </p>
      {caps && (
        <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
          <CapabilityBadge label={capabilityLabel('executionKind', caps.executionKind)} />
          <CapabilityBadge label={capabilityLabel('definitionBinding', caps.definitionBinding)} />
        </div>
      )}
    </div>
  );
}

function CapabilityBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-secondary border border-border text-muted">
      {label}
    </span>
  );
}

export default function ConnectorsPage() {
  const t = useTranslations('ConnectorCatalog');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebouncedValue(search);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted mt-1">{t('subtitle')}</p>
      </div>

      {/* Search */}
      <SearchToolbar
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        placeholder={t('searchPlaceholder')}
      />

      {/* List */}
      <ErrorBoundary>
        <Suspense fallback={<Placeholder>{t('loading')}</Placeholder>}>
          <ConnectorsContent search={debouncedSearch} page={page} onPageChange={setPage} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
