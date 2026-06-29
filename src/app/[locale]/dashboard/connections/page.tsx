'use client';

import { useState, Suspense, use } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { ConnectorCatalogEntry, ConnectionResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { usePromiseCache } from '@/hooks/usePromiseCache';
import ConnectionsList from '@/components/connections/ConnectionsList';
import AddConnectionModal from '@/components/connections/AddConnectionModal';

function ConnectionsContent({
  dataPromise,
  onUpdate,
}: {
  dataPromise: Promise<[ConnectorCatalogEntry[], ConnectionResponse[]]>;
  onUpdate: () => void;
}) {
  const t = useTranslations('Connections');
  const [platforms, initialConnections] = use(dataPromise);
  const [connections, setConnections] = useState(initialConnections);
  const [showAddModal, setShowAddModal] = useState(false);
  const [lastInitial, setLastInitial] = useState(initialConnections);

  // Sync local state when fresh data arrives after invalidation
  if (initialConnections !== lastInitial) {
    setLastInitial(initialConnections);
    setConnections(initialConnections);
  }

  const handleAddSuccess = () => {
    onUpdate();
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
          {t('addIntegration')}
        </Button>
      </div>

      <ConnectionsList
        connections={connections}
        platforms={platforms}
        onUpdate={setConnections}
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
  const { promise, invalidate } = usePromiseCache(
    () => Promise.all([
      apiService.getConnectors({ size: 200 }).then(r => r.content.filter(c => c.integrationMeta)),
      apiService.getConnections(),
    ]),
    [],
    'connections'
  );

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
          <ConnectionsContent dataPromise={promise} onUpdate={invalidate} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
