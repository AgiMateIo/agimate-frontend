'use client';

import { useState, Suspense, use } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { localeMap } from '@/i18n/routing';
import apiService from '@/services/api';
import { AppResponse, PagedResponse } from '@/types';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Toggle } from '@/components/ui/Toggle';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { usePromiseCache } from '@/hooks/usePromiseCache';
import AddConnectorModal from './AddConnectorModal';
import EditConnectorModal from './EditConnectorModal';
import DeleteConnectorModal from './DeleteConnectorModal';

function ConnectorsListView({
  connectorsPromise,
  onUpdate,
}: {
  connectorsPromise: Promise<PagedResponse<AppResponse>>;
  onUpdate: () => void;
}) {
  const t = useTranslations('Connectors');
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];
  const initialData = use(connectorsPromise);
  const [connectors, setConnectors] = useState(initialData.content);
  const [pageInfo, setPageInfo] = useState(initialData);
  const [lastInitial, setLastInitial] = useState(initialData);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingConnector, setEditingConnector] = useState<AppResponse | null>(null);
  const [deletingConnector, setDeletingConnector] = useState<AppResponse | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  // Sync local state when fresh data arrives after invalidation
  if (initialData !== lastInitial) {
    setLastInitial(initialData);
    setConnectors(initialData.content);
    setPageInfo(initialData);
  }

  const handleConnectorAdded = () => {
    onUpdate();
    setShowAddModal(false);
  };

  const handleToggleEnabled = async (connector: AppResponse) => {
    setUpdatingIds(prev => new Set(prev).add(connector.pubId));

    setConnectors(prev =>
      prev.map(a => a.pubId === connector.pubId ? { ...a, enabled: !a.enabled } : a)
    );

    try {
      await apiService.updateApp(connector.pubId, {
        enabled: !connector.enabled,
      });
    } catch (err) {
      console.error('Failed to update app:', err);
      setConnectors(prev =>
        prev.map(a => a.pubId === connector.pubId ? { ...a, enabled: connector.enabled } : a)
      );
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(connector.pubId);
        return next;
      });
    }
  };

  const handleDeleteSuccess = (connectorId: string) => {
    setConnectors(prev => prev.filter(a => a.pubId !== connectorId));
    setDeletingConnector(null);
  };

  const handleEditSuccess = (updated: AppResponse) => {
    setConnectors(prev => prev.map(a => a.pubId === updated.pubId ? updated : a));
    setEditingConnector(null);
  };

  const handlePageChange = async (newPage: number) => {
    try {
      const data = await apiService.getApps({ page: newPage });
      setConnectors(data.content);
      setPageInfo(data);
      setPage(newPage);
    } catch (err) {
      console.error('Failed to load page:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString.replace(' ', 'T'));
    return new Intl.DateTimeFormat(bcp47Locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <>
      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('connectors')}</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            {t('createConnector')}
          </button>
        </div>

        {connectors.length === 0 ? (
          <div className="text-center py-8 text-muted">
            {t('noConnectors')}
          </div>
        ) : (
          <div className="space-y-3">
            {connectors.map((connector) => (
              <Link
                key={connector.pubId}
                href={`/dashboard/connectors/${connector.pubId}`}
                className="block bg-surface-secondary rounded-lg p-4 border border-border hover:border-accent/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">{connector.name}</h3>
                    {connector.description && (
                      <p className="text-sm text-muted mt-1">{connector.description}</p>
                    )}
                    <div className="text-xs text-muted mt-2 space-y-1">
                      <p>{t('key')}: <span className="font-mono">{connector.maskedKeyId}</span></p>
                      <p>{t('created')}: {formatDate(connector.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                    <Toggle
                      checked={connector.enabled}
                      onChange={() => handleToggleEnabled(connector)}
                      disabled={updatingIds.has(connector.pubId)}
                    />

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setEditingConnector(connector);
                      }}
                      className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setDeletingConnector(connector);
                      }}
                      className="p-2 text-muted hover:text-error transition-colors rounded-lg"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {pageInfo.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted">
              {t('page')} {page + 1} / {pageInfo.totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={pageInfo.first}
                className="px-3 py-1 text-xs font-medium rounded-lg bg-surface-secondary text-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('previous')}
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={pageInfo.last}
                className="px-3 py-1 text-xs font-medium rounded-lg bg-surface-secondary text-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddConnectorModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleConnectorAdded}
        />
      )}

      {editingConnector && (
        <EditConnectorModal
          connector={editingConnector}
          onClose={() => setEditingConnector(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingConnector && (
        <DeleteConnectorModal
          connector={deletingConnector}
          onClose={() => setDeletingConnector(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}

export default function ConnectorsTab() {
  const t = useTranslations('Connectors');
  const { promise, invalidate } = usePromiseCache(
    () => apiService.getApps(),
    [],
    'connectors-tab'
  );

  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="text-center py-12 text-muted">{t('loadingConnectors')}</div>}>
        <ConnectorsListView connectorsPromise={promise} onUpdate={invalidate} />
      </Suspense>
    </ErrorBoundary>
  );
}
