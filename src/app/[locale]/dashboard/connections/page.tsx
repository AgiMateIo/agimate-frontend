'use client';

import { useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useConnectionsQuery, useConnectionCacheActions } from '@/queries/connections';
import { useIntegrationPlatformsQuery } from '@/queries/connectors';
import ConnectionsList from '@/components/connections/ConnectionsList';
import AddConnectionModal from '@/components/connections/AddConnectionModal';

function ConnectionsContent() {
  const t = useTranslations('Connections');
  const { data: platforms } = useIntegrationPlatformsQuery();
  const { data: connections } = useConnectionsQuery();
  const { invalidateLists } = useConnectionCacheActions();
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddSuccess = () => {
    invalidateLists();
    setShowAddModal(false);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          {t('addConnection')}
        </Button>
      </div>

      <ConnectionsList
        connections={connections}
        platforms={platforms}
      />

      {showAddModal && (
        <AddConnectionModal
          platforms={platforms}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </>
  );
}

export default function ConnectionsPage() {
  const t = useTranslations('Connections');

  return (
    <div className="space-y-6">
      <ErrorBoundary>
        <Suspense fallback={
          <>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
              <p className="text-muted mt-1">{t('subtitle')}</p>
            </div>
            <div className="text-center py-12 text-muted">{t('loading')}</div>
          </>
        }>
          <ConnectionsContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
