'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import {
  ChannelHandlerResponse,
  ConnectorCatalogEntry,
  ConnectionResponse,
  ToolJsonSchema,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Alert } from '@/components/ui/Alert';
import { Toggle } from '@/components/ui/Toggle';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { WizardStepProps } from './AgentWizard';

const TELEGRAM_HINT = 'telegram';

export default function Step3Channel({ data, setData, goNext, goBack }: WizardStepProps) {
  const t = useTranslations('AgentWizard');

  const [connector, setConnector] = useState<ConnectorCatalogEntry | null>(null);
  const [handler, setHandler] = useState<ChannelHandlerResponse | null>(null);
  const [discovered, setDiscovered] = useState(false);

  const [existing, setExisting] = useState<ConnectionResponse[]>([]);
  // '' = create new; otherwise an existing connection id.
  const [identity, setIdentity] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [channelName, setChannelName] = useState('');
  const [config, setConfig] = useState<Record<string, unknown>>({});

  const { loading, error, handleSubmit } = useAsyncForm({ defaultError: t('step3Error') });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catalog, handlers] = await Promise.all([
          apiService.getConnectorCatalog(),
          apiService.getChannelHandlers(),
        ]);
        if (cancelled) return;
        const conn =
          catalog.find(
            (c) =>
              c.integrationMeta != null &&
              (c.code.toLowerCase().includes(TELEGRAM_HINT) ||
                c.name.toLowerCase().includes(TELEGRAM_HINT)),
          ) ?? null;
        const hnd =
          handlers.find((h) => h.name.toLowerCase().includes(TELEGRAM_HINT)) ??
          handlers[0] ??
          null;
        setConnector(conn);
        setHandler(hnd);
        if (conn) {
          const creds = await apiService.getConnections(conn.code);
          if (!cancelled) setExisting(creds);
        }
      } finally {
        if (!cancelled) setDiscovered(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (data.agent && !channelName) setChannelName(`${data.agent.name} · Telegram`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.agent]);

  const credentialFields = connector?.integrationMeta?.credentialFields ?? {};
  const configSchema = handler?.configFields;
  const configProps = useMemo(
    () => Object.entries(configSchema?.properties ?? {}),
    [configSchema],
  );

  const credsFilled =
    identity !== '' || Object.keys(credentialFields).every((f) => credentials[f]?.trim());

  const setConfigValue = (key: string, value: unknown) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      if (!data.agent || !connector || !handler) return;

      let connectionId = identity;
      if (!connectionId) {
        const connection = await apiService.createConnection({
          connectorCode: connector.code,
          credentials,
          name: channelName.trim() || undefined,
        });
        connectionId = connection.id;
        setExisting((prev) => [connection, ...prev]);
      }

      const channel = await apiService.createChannel({
        agentId: data.agent.id,
        name: channelName.trim(),
        channelHandler: handler.name,
        connectorCode: connector.code,
        identity: connectionId,
        config,
      });
      setData({ channel });
      goNext();
    });

  // Created on a previous visit.
  if (data.channel) {
    return (
      <div className="space-y-5">
        <Header t={t} />
        <div className="flex items-start gap-3 p-4 rounded-lg border border-success/30 bg-success/5">
          <CheckCircleIcon className="h-6 w-6 text-success shrink-0" />
          <div>
            <div className="font-medium text-foreground">{t('channelCreated')}</div>
            <div className="text-sm text-muted mt-0.5">{data.channel.name}</div>
          </div>
        </div>
        <NavRow t={t} goBack={goBack} goNext={goNext} />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Header t={t} />

      {!discovered ? (
        <p className="text-sm text-muted">{t('loading')}</p>
      ) : !connector ? (
        <Alert variant="warning">{t('telegramUnavailable')}</Alert>
      ) : (
        <>
          <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-surface-secondary">
            <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-bold shrink-0">
              Tg
            </div>
            <div>
              <div className="font-medium text-foreground">{connector.name}</div>
              <p className="text-xs text-muted mt-0.5">{t('telegramDesc')}</p>
            </div>
          </div>

          <FormField label={t('channelNameLabel')} required>
            <Input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              maxLength={100}
            />
          </FormField>

          {existing.length > 0 && (
            <FormField label={t('existingIntegration')}>
              <select
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground"
              >
                <option value="">{t('newIntegration')}</option>
                {existing.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.fullCode}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          {identity === '' && (
            <>
              <Alert variant="info">{t('botTokenHowto')}</Alert>
              {Object.entries(credentialFields).map(([field, label]) => (
                <FormField key={field} label={label} required>
                  <Input
                    type="password"
                    value={credentials[field] || ''}
                    onChange={(e) =>
                      setCredentials((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                    placeholder={label}
                  />
                </FormField>
              ))}
            </>
          )}

          {configProps.length > 0 && (
            <div className="border border-border rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">{t('channelConfig')}</h3>
              {configProps.map(([key, prop]) => (
                <ConfigField
                  key={key}
                  name={key}
                  schema={prop}
                  required={(configSchema?.required ?? []).includes(key)}
                  value={config[key]}
                  onChange={(v) => setConfigValue(key, v)}
                />
              ))}
            </div>
          )}

          <Alert variant="info">{t('noVerifyNote')}</Alert>
        </>
      )}

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="flex justify-between gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={goBack}>{t('back')}</Button>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={goNext}>{t('skipStep')}</Button>
          <Button type="submit" loading={loading} disabled={loading || !connector || !credsFilled || !channelName.trim()}>
            {t('createChannel')}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Header({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">{t('step3Title')}</h2>
      <p className="text-sm text-muted mt-0.5">{t('step3Subtitle')}</p>
    </div>
  );
}

function NavRow({
  t,
  goBack,
  goNext,
}: {
  t: ReturnType<typeof useTranslations>;
  goBack: () => void;
  goNext: () => void;
}) {
  return (
    <div className="flex justify-between gap-3 pt-2">
      <Button type="button" variant="secondary" onClick={goBack}>{t('back')}</Button>
      <Button type="button" onClick={goNext}>{t('next')}</Button>
    </div>
  );
}

// Compact renderer for the handler config JSON Schema. Telegram handlers
// typically expose a couple of string fields; richer types fall back sensibly.
function ConfigField({
  name,
  schema,
  required,
  value,
  onChange,
}: {
  name: string;
  schema: ToolJsonSchema;
  required: boolean;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = schema.title || name;
  const hint = schema.description;

  if (schema.type === 'boolean') {
    return (
      <FormField label={label} required={required} hint={hint} layout="inline">
        <Toggle checked={Boolean(value)} onChange={onChange} />
      </FormField>
    );
  }

  if (schema.enum && schema.enum.length > 0) {
    return (
      <FormField label={label} required={required} hint={hint} layout="inline">
        <select
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground"
        >
          <option value=""></option>
          {schema.enum.map((opt) => (
            <option key={String(opt)} value={String(opt)}>{String(opt)}</option>
          ))}
        </select>
      </FormField>
    );
  }

  const numeric = schema.type === 'integer' || schema.type === 'number';
  return (
    <FormField label={label} required={required} hint={hint} layout="inline">
      <Input
        type={numeric ? 'number' : 'text'}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
  );
}
