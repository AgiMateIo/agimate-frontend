'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { localeMap } from '@/i18n/routing';
import apiService from '@/services/api';
import { AppResponse } from '@/types';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Toggle } from '@/components/ui/Toggle';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import AddAppModal from './AddAppModal';
import EditAppModal from './EditAppModal';
import DeleteAppModal from './DeleteAppModal';

export default function AppsTab() {
  const t = useTranslations('Apps');
  const locale = useLocale();
  const bcp47Locale = localeMap[locale];
  const [showAddModal, setShowAddModal] = useState(false);
  const [apps, setApps] = useState<AppResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingApp, setEditingApp] = useState<AppResponse | null>(null);
  const [deletingApp, setDeletingApp] = useState<AppResponse | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const data = await apiService.getApps();
      setApps(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load apps');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAppAdded = () => {
    fetchData();
    setShowAddModal(false);
  };

  const handleToggleEnabled = async (app: AppResponse) => {
    setUpdatingIds(prev => new Set(prev).add(app.pubId));

    setApps(prev =>
      prev.map(a => a.pubId === app.pubId ? { ...a, enabled: !a.enabled } : a)
    );

    try {
      await apiService.updateApp(app.pubId, {
        enabled: !app.enabled,
      });
    } catch (err) {
      console.error('Failed to update app:', err);
      setApps(prev =>
        prev.map(a => a.pubId === app.pubId ? { ...a, enabled: app.enabled } : a)
      );
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(app.pubId);
        return next;
      });
    }
  };

  const handleDeleteSuccess = (appId: string) => {
    setApps(prev => prev.filter(a => a.pubId !== appId));
    setDeletingApp(null);
  };

  const handleEditSuccess = (updated: AppResponse) => {
    setApps(prev => prev.map(a => a.pubId === updated.pubId ? updated : a));
    setEditingApp(null);
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

  if (loading) {
    return <div className="text-center py-12 text-muted">{t('loadingApps')}</div>;
  }

  if (error) {
    return <ErrorAlert>{error}</ErrorAlert>;
  }

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

        {apps.length === 0 ? (
          <div className="text-center py-8 text-muted">
            {t('noApps')}
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map((app) => (
              <Link
                key={app.pubId}
                href={`/dashboard/apps/${app.pubId}`}
                className="block bg-surface-secondary rounded-lg p-4 border border-border hover:border-accent/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">{app.name}</h3>
                    {app.description && (
                      <p className="text-sm text-muted mt-1">{app.description}</p>
                    )}
                    <div className="text-xs text-muted mt-2 space-y-1">
                      <p>{t('key')}: <span className="font-mono">{app.maskedKeyId}</span></p>
                      <p>{t('created')}: {formatDate(app.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                    <Toggle
                      checked={app.enabled}
                      onChange={() => handleToggleEnabled(app)}
                      disabled={updatingIds.has(app.pubId)}
                    />

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setEditingApp(app);
                      }}
                      className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setDeletingApp(app);
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
      </div>

      {showAddModal && (
        <AddAppModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAppAdded}
        />
      )}

      {editingApp && (
        <EditAppModal
          app={editingApp}
          onClose={() => setEditingApp(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingApp && (
        <DeleteAppModal
          app={deletingApp}
          onClose={() => setDeletingApp(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}
