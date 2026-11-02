'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/Alert';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Placeholder } from '@/components/ui/Placeholder';
import ProviderDetail from '@/components/llm-providers/ProviderDetail';
import { useUser } from '@/contexts/UserContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';

export default function AdminPlatformProviderDetailPage() {
  const t = useTranslations('LlmProviders');
  const tAdmin = useTranslations('Admin');
  const tCommon = useTranslations('Common');
  const { user, loading } = useUser();
  const isAdmin = useIsAdmin();
  const params = useParams();
  const id = params.id as string;

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        {loading || !user ? (
          <Placeholder>{tCommon('loading')}</Placeholder>
        ) : (
          <Alert variant="error">{tAdmin('noAccess')}</Alert>
        )}
      </div>
    );
  }

  return (
    <ErrorBoundary resetKeys={[id]}>
      <Suspense fallback={<Placeholder>{t('loading')}</Placeholder>}>
        <ProviderDetail id={id} scope="platform" />
      </Suspense>
    </ErrorBoundary>
  );
}
