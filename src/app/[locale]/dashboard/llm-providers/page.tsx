'use client';

import { useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useLlmProvidersQuery, useLlmProviderCacheActions } from '@/queries/llm-providers';
import LlmProvidersList from '@/components/llm-providers/LlmProvidersList';
import AddLlmProviderModal from '@/components/llm-providers/AddLlmProviderModal';
import AddPlatformProviderModal from '@/components/llm-providers/AddPlatformProviderModal';

function LlmProvidersContent() {
  const t = useTranslations('LlmProviders');
  const tu = useTranslations('LlmUsage');
  const isAdmin = useIsAdmin();
  const { data: providers } = useLlmProvidersQuery();
  const { setProviders, invalidate } = useLlmProviderCacheActions();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPlatformModal, setShowPlatformModal] = useState(false);

  // The platform provider is a singleton — only offer to create it to an admin who
  // doesn't already have one (the backend only returns the platform row to admins).
  const hasPlatform = providers.some((p) => p.platform);
  const canCreatePlatform = isAdmin && !hasPlatform;

  const handleAddSuccess = () => {
    invalidate();
    setShowAddModal(false);
  };

  const handlePlatformSuccess = () => {
    invalidate();
    setShowPlatformModal(false);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canCreatePlatform && (
            <Button variant="secondary" onClick={() => setShowPlatformModal(true)}>
              {tu('createPlatformProvider')}
            </Button>
          )}
          <Button onClick={() => setShowAddModal(true)}>
            {t('addProvider')}
          </Button>
        </div>
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

      {showPlatformModal && (
        <AddPlatformProviderModal
          onClose={() => setShowPlatformModal(false)}
          onSuccess={handlePlatformSuccess}
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
