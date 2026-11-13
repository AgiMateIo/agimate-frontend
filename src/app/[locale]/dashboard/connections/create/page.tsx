'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import type { ConnectionResponse } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { integrationPlatformsOptions } from '@/queries/connectors';
import { connectorPresetOptions } from '@/queries/connectorPresets';
import { findConnector } from '@/utils/connector';
import { useConnectionCacheActions } from '@/queries/connections';
import { takePendingPreset } from '@/utils/pending-preset';
import ConnectionSetupForm from '@/components/connections/ConnectionSetupForm';
import { PRESET_AVAILABILITY_LABEL } from '@/components/connections/presetLabels';
import { Placeholder } from '@/components/ui/Placeholder';

// Target of the `/connections/create` deep link. A preset, when present, is the
// whole form: its connector, its fields, its server URL. The plain `connector`
// path stays for everything the catalogue does not carry.
function CreateConnectionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const presetCode = searchParams.get('preset') ?? '';

  // A connection preset chosen before sign-up waits in storage; consume it here
  // so it cannot redirect a later dashboard visit. An agent preset is left for
  // the wizard.
  useEffect(() => {
    const pending = takePendingPreset('connection');
    if (pending && !presetCode) {
      const query = new URLSearchParams(searchParams);
      query.set('preset', pending.name);
      router.replace(`/dashboard/connections/create?${query}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opening
  }, []);

  return presetCode ? <PresetConnectionContent code={presetCode} /> : <ManualConnectionContent />;
}

function ManualConnectionContent() {
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
  const connector = findConnector(platforms, connectorCode);

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

function PresetConnectionContent({ code }: { code: string }) {
  const t = useTranslations('Connections');
  const tPresets = useTranslations('ConnectorPresets');
  const tCommon = useTranslations('Common');
  const router = useRouter();
  const [{ data: platforms }, { data: preset }] = useSuspenseQueries({
    queries: [integrationPlatformsOptions(), connectorPresetOptions(code)],
  });
  const { invalidateLists } = useConnectionCacheActions();

  const handleSuccess = (connection: ConnectionResponse) => {
    invalidateLists();
    router.replace(`/dashboard/connections/${connection.id}`);
  };

  const back = (
    <Link href="/dashboard/connections" className="text-sm text-accent underline hover:no-underline">
      {t('backToConnections')}
    </Link>
  );

  if (!preset) {
    return (
      <div className="max-w-2xl space-y-4">
        <Alert variant="warning">{t('presetNotFound', { code })}</Alert>
        {back}
      </div>
    );
  }

  const connector = findConnector(platforms, preset.connectorCode);
  if (!connector) {
    return (
      <div className="max-w-2xl space-y-4">
        <Alert variant="warning">
          {t('presetConnectorMissing', { code: preset.connectorCode })}
        </Alert>
        {back}
      </div>
    );
  }

  // Availability is a hint, not a creation gate, but a preset whose form has no
  // working auth method cannot produce a connection. The manual MCP form stays
  // one click away — that is where a working token can still be entered.
  if (preset.connection.availability !== 'AVAILABLE' || preset.form.authMethods.length === 0) {
    const reason =
      preset.connection.availability === 'AVAILABLE'
        ? tPresets('availabilityAuthUnsupported')
        : tPresets(PRESET_AVAILABILITY_LABEL[preset.connection.availability]);
    return (
      <div className="max-w-2xl space-y-4">
        <Alert variant="warning">{t('presetUnavailable', { reason })}</Alert>
        <Link
          href={`/dashboard/connections/create?connector=${encodeURIComponent(preset.connectorCode)}`}
          className="block text-sm text-accent underline hover:no-underline"
        >
          {t('createManually')}
        </Link>
        {back}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <ConnectionSetupForm
        connector={connector}
        preset={preset}
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
