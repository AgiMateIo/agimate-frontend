'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/Alert';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Placeholder } from '@/components/ui/Placeholder';
import AdminPlatformLlms from '@/components/admin/AdminPlatformLlms';
import { useUser } from '@/contexts/UserContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';

export default function AdminPlatformLlmsPage() {
  const t = useTranslations('LlmProviders');
  const tCommon = useTranslations('Common');
  const { user, loading } = useUser();
  const isAdmin = useIsAdmin();

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-foreground">{t('platformPurposesTitle')}</h1>
      <p className="text-muted mt-1">{t('platformPurposesSubtitle')}</p>
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
          <Alert variant="error">{t('platformPurposesNoAccess')}</Alert>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <ErrorBoundary>
        <Suspense fallback={<Placeholder>{t('platformPurposesLoading')}</Placeholder>}>
          <AdminPlatformLlms />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
