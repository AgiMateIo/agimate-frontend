'use client';

import { useState, Suspense, use } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { PlatformResponse, IntegrationResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { usePromiseCache } from '@/hooks/usePromiseCache';
import IntegrationsList from '@/components/integrations/IntegrationsList';
import AddIntegrationModal from '@/components/integrations/AddIntegrationModal';

function IntegrationsContent({
  dataPromise,
  onUpdate,
}: {
  dataPromise: Promise<[PlatformResponse[], IntegrationResponse[]]>;
  onUpdate: () => void;
}) {
  const t = useTranslations('Integrations');
  const [platforms, initialIntegrations] = use(dataPromise);
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [showAddModal, setShowAddModal] = useState(false);
  const [lastInitial, setLastInitial] = useState(initialIntegrations);

  // Sync local state when fresh data arrives after invalidation
  if (initialIntegrations !== lastInitial) {
    setLastInitial(initialIntegrations);
    setIntegrations(initialIntegrations);
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

      <IntegrationsList
        integrations={integrations}
        platforms={platforms}
        onUpdate={setIntegrations}
      />

      {showAddModal && (
        <AddIntegrationModal
          platforms={platforms}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </>
  );
}

export default function IntegrationsPage() {
  const t = useTranslations('Integrations');
  const { promise, invalidate } = usePromiseCache(
    () => Promise.all([
      apiService.getPlatforms(),
      apiService.getIntegrations(),
    ]),
    [],
    'integrations'
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
          <IntegrationsContent dataPromise={promise} onUpdate={invalidate} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
