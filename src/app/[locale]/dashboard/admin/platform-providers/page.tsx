'use client';

import { Suspense, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Placeholder } from '@/components/ui/Placeholder';
import AdminPlatformProvidersList from '@/components/admin/AdminPlatformProvidersList';
import AddPlatformProviderModal from '@/components/llm-providers/AddPlatformProviderModal';
import { useUser } from '@/contexts/UserContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useLlmProviderCacheActions } from '@/queries/llm-providers';

export default function AdminPlatformProvidersPage() {
  const t = useTranslations('LlmProviders');
  const tu = useTranslations('LlmUsage');
  const tAdmin = useTranslations('Admin');
  const tCommon = useTranslations('Common');
  const { user, loading } = useUser();
  const isAdmin = useIsAdmin();
  const { invalidate } = useLlmProviderCacheActions();

  const [showAdd, setShowAdd] = useState(false);

  const header = (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('platformProvidersTitle')}</h1>
        <p className="text-muted mt-1">{t('platformProvidersSubtitle')}</p>
      </div>
      {isAdmin && (
        <Button onClick={() => setShowAdd(true)} className="shrink-0">
          {tu('createPlatformProvider')}
        </Button>
      )}
    </div>
  );

  // The backend already refuses a non-admin; this keeps the screen from making
  // a request it knows will 403.
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        {header}
        {loading || !user ? (
          <Placeholder>{tCommon('loading')}</Placeholder>
        ) : (
          <Alert variant="error">{tAdmin('noAccess')}</Alert>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <ErrorBoundary>
        <Suspense fallback={<Placeholder>{t('loading')}</Placeholder>}>
          <AdminPlatformProvidersList />
        </Suspense>
      </ErrorBoundary>

      {showAdd && (
        <AddPlatformProviderModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            invalidate();
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
