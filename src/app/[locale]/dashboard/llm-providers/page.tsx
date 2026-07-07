'use client';

import { useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useLlmProvidersQuery, useLlmProviderCacheActions } from '@/queries/llm-providers';
import LlmProvidersList from '@/components/llm-providers/LlmProvidersList';
import AddLlmProviderModal from '@/components/llm-providers/AddLlmProviderModal';

function LlmProvidersContent() {
  const t = useTranslations('LlmProviders');
  const { data: providers } = useLlmProvidersQuery();
  const { setProviders, invalidate } = useLlmProviderCacheActions();
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddSuccess = () => {
    invalidate();
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
          <LlmProvidersContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
