'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Placeholder } from '@/components/ui/Placeholder';
import ProviderDetail from '@/components/llm-providers/ProviderDetail';

export default function LlmProviderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const t = useTranslations('LlmProviders');

  return (
    <ErrorBoundary resetKeys={[id]}>
      <Suspense fallback={<Placeholder>{t('loading')}</Placeholder>}>
        <ProviderDetail id={id} scope="personal" />
      </Suspense>
    </ErrorBoundary>
  );
}
