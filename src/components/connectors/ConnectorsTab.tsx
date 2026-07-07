'use client';

import { useState, Suspense } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { localeMap } from '@/i18n/routing';
import apiService from '@/services/api';
import { AppResponse } from '@/types';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Toggle } from '@/components/ui/Toggle';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useAppsQuery, useAppCacheActions } from '@/queries/apps';
import { formatDate } from '@/utils/date';
import AddConnectorModal from './AddConnectorModal';
import EditConnectorModal from './EditConnectorModal';
import DeleteConnectorModal from './DeleteConnectorModal';

function ConnectorsListView({
  page,
  onPageChange,
}: {
  page: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations('Connectors');
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];
  const { data: pageInfo } = useAppsQuery(page);
  const { patchAppInLists, removeAppFromLists, invalidateLists } = useAppCacheActions();
  const connectors = pageInfo.content;

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingConnector, setEditingConnector] = useState<AppResponse | null>(null);
  const [deletingConnector, setDeletingConnector] = useState<AppResponse | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const handleConnectorAdded = () => {
    invalidateLists();
    setShowAddModal(false);
  };

  const handleToggleEnabled = async (connector: AppResponse) => {
    setUpdatingIds(prev => new Set(prev).add(connector.id));
    patchAppInLists(connector.id, { enabled: !connector.enabled });

    try {
      await apiService.updateApp(connector.id, {
        enabled: !connector.enabled,
      });
    } catch (err) {
      console.error('Failed to update app:', err);
      patchAppInLists(connector.id, { enabled: connector.enabled });
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(connector.id);
        return next;
      });
    }
  };

  const handleDeleteSuccess = (connectorId: string) => {
    removeAppFromLists(connectorId);
    setDeletingConnector(null);
  };

  const handleEditSuccess = (updated: AppResponse) => {
    patchAppInLists(updated.id, updated);
    setEditingConnector(null);
  };

  return (
    <>
      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('apps')}</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            {t('createApp')}
          </button>
        </div>

        {connectors.length === 0 ? (
          <div className="text-center py-8 text-muted">
            {t('noApps')}
          </div>
        ) : (
          <div className="space-y-3">
            {connectors.map((connector) => (
              <Link
                key={connector.id}
                href={`/dashboard/apps/${connector.id}`}
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
                      <p>{t('created')}: {formatDate(connector.createdAt, bcp47Locale)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                    <Toggle
                      checked={connector.enabled}
                      onChange={() => handleToggleEnabled(connector)}
                      disabled={updatingIds.has(connector.id)}
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
                onClick={() => onPageChange(page - 1)}
                disabled={pageInfo.first}
                className="px-3 py-1 text-xs font-medium rounded-lg bg-surface-secondary text-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('previous')}
              </button>
              <button
                onClick={() => onPageChange(page + 1)}
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
  const [page, setPage] = useState(0);

  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="text-center py-12 text-muted">{t('loadingApps')}</div>}>
        <ConnectorsListView page={page} onPageChange={setPage} />
      </Suspense>
    </ErrorBoundary>
  );
}
