'use client';

import { useState, Suspense, use } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { LlmProviderResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { usePromiseCache } from '@/hooks/usePromiseCache';
import LlmProvidersList from '@/components/llm-providers/LlmProvidersList';
import AddLlmProviderModal from '@/components/llm-providers/AddLlmProviderModal';

function LlmProvidersContent({
  dataPromise,
  onUpdate,
}: {
  dataPromise: Promise<LlmProviderResponse[]>;
  onUpdate: () => void;
}) {
  const t = useTranslations('LlmProviders');
  const initial = use(dataPromise);
  const [providers, setProviders] = useState(initial);
  const [lastInitial, setLastInitial] = useState(initial);
  const [showAddModal, setShowAddModal] = useState(false);

  if (initial !== lastInitial) {
    setLastInitial(initial);
    setProviders(initial);
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
          {t('addProvider')}
        </Button>
      </div>

      <LlmProvidersList
        providers={providers}
        onUpdate={setProviders}
      />

      {showAddModal && (
        <AddLlmProviderModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </>
  );
}

export default function LlmProvidersPage() {
  const t = useTranslations('LlmProviders');
  const { promise, invalidate } = usePromiseCache(
    () => apiService.getLlmProviders(),
    [],
    'llm-providers'
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
          <LlmProvidersContent dataPromise={promise} onUpdate={invalidate} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
