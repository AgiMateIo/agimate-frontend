'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import type { ConnectionResponse } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { integrationPlatformsOptions } from '@/queries/connectors';
import { useConnectionCacheActions } from '@/queries/connections';
import ConnectionSetupForm from '@/components/connections/ConnectionSetupForm';
import { Placeholder } from '@/components/ui/Placeholder';

// Target of the `/connections/new` deep link: the connector is preselected from
// the query, so the platform-picker step is skipped entirely.
function CreateConnectionContent() {
  const t = useTranslations('Connections');
  const tCommon = useTranslations('Common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const connectorCode = searchParams.get('connector') ?? '';
  const initialName = searchParams.get('name') ?? '';

  const { data: platforms } = useSuspenseQuery(integrationPlatformsOptions());
  const { invalidateLists } = useConnectionCacheActions();

  // Only integration connectors are in `platforms` — anything else has no
  // credentials to collect, so there is no form to show.
  const connector = platforms.find((p) => p.code === connectorCode);

  const handleSuccess = (connection: ConnectionResponse) => {
    invalidateLists();
    router.replace(`/dashboard/connections/${connection.id}`);
  };

  if (!connector) {
    return (
      <div className="max-w-2xl space-y-4">
        <Alert variant="warning">
          {connectorCode
            ? t('unknownConnector', { code: connectorCode })
            : t('missingConnectorParam')}
        </Alert>
        <Link href="/dashboard/connections" className="text-sm text-accent underline hover:no-underline">
          {t('backToConnections')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <ConnectionSetupForm
        connector={connector}
        initialName={initialName}
        onSuccess={handleSuccess}
        onCancel={() => router.push('/dashboard/connections')}
        cancelLabel={tCommon('cancel')}
      />
    </div>
  );
}

export default function CreateConnectionPage() {
  const t = useTranslations('Connections');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('newConnection')}</h1>
        <p className="text-muted mt-1">{t('newConnectionSubtitle')}</p>
      </div>

      <ErrorBoundary>
        <Suspense fallback={<Placeholder>{t('loading')}</Placeholder>}>
          <CreateConnectionContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
