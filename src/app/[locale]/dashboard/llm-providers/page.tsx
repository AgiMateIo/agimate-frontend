'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useLlmProvidersQuery, useLlmProviderCacheActions } from '@/queries/llm-providers';
import LlmProvidersList from '@/components/llm-providers/LlmProvidersList';
import AddLlmProviderModal, { type LlmProviderPrefill } from '@/components/llm-providers/AddLlmProviderModal';
import AddPlatformProviderModal from '@/components/llm-providers/AddPlatformProviderModal';
import { parseProviderType } from '@/components/llm-providers/providerTypes';
import { Placeholder } from '@/components/ui/Placeholder';

function LlmProvidersContent() {
  const t = useTranslations('LlmProviders');
  const tu = useTranslations('LlmUsage');
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: providers } = useLlmProvidersQuery();
  const { setProviders, invalidate } = useLlmProviderCacheActions();

  // Target of the `/llm-providers/new` deep link. The query is read once, at
  // mount, and stripped straight after: the create form lives in a modal, and a
  // link left in the address bar would reopen it on every reload and on the way
  // back from a provider page.
  const [deepLink] = useState<{ open: boolean; prefill: LlmProviderPrefill | null }>(() => {
    const providerType = parseProviderType(searchParams.get('providerType'));
    const name = searchParams.get('name');
    const open = ['providerType', 'name', 'baseUrl'].some((key) => searchParams.has(key));
    // A link the tool built wrong still opens the form — the person asked to
    // create a provider, and a plain list would read as a dead link. It just
    // opens at the catalog step, with nothing filled in.
    const prefill = providerType && name
      ? { providerType, name, baseUrl: searchParams.get('baseUrl') ?? '' }
      : null;
    return { open, prefill };
  });
  const [showAddModal, setShowAddModal] = useState(deepLink.open);
  const [showPlatformModal, setShowPlatformModal] = useState(false);

  useEffect(() => {
    if (deepLink.open) router.replace('/dashboard/llm-providers');
  }, [deepLink.open, router]);

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
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          prefill={deepLink.prefill ?? undefined}
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
            <Placeholder>{t('loading')}</Placeholder>
          </>
        }>
          <LlmProvidersContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
