'use client';

import { useState, Suspense } from 'react';
import { useSuspenseQueries } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { connectionsListOptions } from '@/queries/connections';
import { connectorCatalogOptions, integrationPlatformsOptions } from '@/queries/connectors';
import ConnectionsList from '@/components/connections/ConnectionsList';
import AddConnectionModal from '@/components/connections/AddConnectionModal';
import { Placeholder } from '@/components/ui/Placeholder';

function ConnectionsContent() {
  const t = useTranslations('Connections');
  const [{ data: catalog }, { data: platforms }, { data: connections }] = useSuspenseQueries({
    queries: [
      connectorCatalogOptions(),
      integrationPlatformsOptions(),
      connectionsListOptions(),
    ],
  });
  const [showAddModal, setShowAddModal] = useState(false);

  // The form invalidates the list itself, right after creation.
  const handleAddSuccess = () => setShowAddModal(false);

  return (
    <>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        platforms={catalog}
      />

      {showAddModal && (
        <AddConnectionModal
          platforms={platforms}
          connections={connections}
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
            <Placeholder>{t('loading')}</Placeholder>
          </>
        }>
          <ConnectionsContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
