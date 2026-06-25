'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import {
  AppResponse,
  ChannelHandlerResponse,
  ChannelResponse,
  ConnectorCatalogEntry,
  CreateChannelRequest,
  IntegrationResponse,
  ToolJsonSchema,
  UpdateChannelRequest,
} from '@/types';
import { getConnectorKind, ConnectorKind } from '@/utils/connector';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { Toggle } from '@/components/ui/Toggle';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface ChannelConfigFormProps {
  agentId: string;
  channel: ChannelResponse | null;
  onCancel: () => void;
  onSuccess: (channel: ChannelResponse) => void;
}

interface IdentityOption {
  value: string;
  label: string;
  hint?: string;
}

function tryParseJsonObject(
  text: string,
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  if (!text.trim()) return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Must be a JSON object' };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid JSON' };
  }
}

// Seed editable form state for each config property from an existing config value (edit)
// or from empty defaults (create). Object-typed properties are edited as JSON text and
// kept in `jsonText`; everything else lives in `values`.
function seedConfigState(
  schema: ToolJsonSchema | undefined,
  config: Record<string, unknown>,
): { values: Record<string, unknown>; jsonText: Record<string, string> } {
  const values: Record<string, unknown> = {};
  const jsonText: Record<string, string> = {};
  const props = schema?.properties ?? {};
  for (const [name, prop] of Object.entries(props)) {
    const existing = config[name];
    switch (prop.type) {
      case 'boolean':
        values[name] = typeof existing === 'boolean' ? existing : false;
        break;
      case 'array':
        values[name] = Array.isArray(existing) ? existing.map((v) => String(v)) : [];
        break;
      case 'object':
        jsonText[name] = existing != null ? JSON.stringify(existing, null, 2) : '';
        break;
      case 'integer':
      case 'number':
        values[name] = existing == null ? '' : String(existing);
        break;
      default:
        values[name] = existing == null ? '' : String(existing);
    }
  }
  return { values, jsonText };
}

export default function ChannelConfigForm({
  agentId,
  channel,
  onCancel,
  onSuccess,
}: ChannelConfigFormProps) {
  const t = useTranslations('Channels');
  const isEdit = !!channel;

  const [name, setName] = useState(channel?.name ?? '');
  const [channelHandler, setChannelHandler] = useState(channel?.channelHandler ?? '');
  const [connectorCode, setConnectorCode] = useState(channel?.connectorCode ?? '');
  const [connectorType, setConnectorType] = useState<ConnectorKind | null>(null);
  const [identity, setIdentity] = useState(channel?.identity ?? '');

  const [handlers, setHandlers] = useState<ChannelHandlerResponse[]>([]);
  const [connectors, setConnectors] = useState<ConnectorCatalogEntry[]>([]);
  const [identities, setIdentities] = useState<IdentityOption[]>([]);

  // Per-property editable state for the dynamic config form.
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});
  const [configJsonText, setConfigJsonText] = useState<Record<string, string>>({});
  // Fallback when no schema is available (unknown handler on edit): edit the whole config raw.
  const [rawConfigText, setRawConfigText] = useState(
    channel ? JSON.stringify(channel.config, null, 2) : '',
  );

  const [inputFilterText, setInputFilterText] = useState(
    channel?.inputFilter ? JSON.stringify(channel.inputFilter, null, 2) : '',
  );

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm<ChannelResponse>({
    onSuccess: (result) => onSuccess(result),
    defaultError: 'Failed to save channel',
  });

  const selectedHandler = useMemo(
    () => handlers.find((h) => h.name === channelHandler),
    [handlers, channelHandler],
  );
  const configSchema = selectedHandler?.configFields;

  // Load handlers + connector catalog once.
  useEffect(() => {
    apiService.getChannelHandlers().then(setHandlers).catch(() => {});
    apiService
      .getConnectorCatalog()
      .then((all) => {
        const filtered = all.filter((c) => getConnectorKind(c) !== 'SERVICE');
        setConnectors(filtered);
        const conn = filtered.find((c) => c.code === channel?.connectorCode);
        if (conn) setConnectorType(getConnectorKind(conn));
      })
      .catch(() => {});
  }, [channel?.connectorCode]);

  // Once handlers are loaded, (re)seed the config form for the active handler.
  // On create this fires when the user picks a handler; on edit it seeds from channel.config.
  useEffect(() => {
    if (!selectedHandler) return;
    const { values, jsonText } = seedConfigState(selectedHandler.configFields, channel?.config ?? {});
    setConfigValues(values);
    setConfigJsonText(jsonText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHandler?.name]);

  const loadIdentities = useCallback(
    async (code: string, type: ConnectorKind | null): Promise<IdentityOption[]> => {
      if (!code || !type) return [];
      if (type === 'INTEGRATION') {
        const creds = await apiService.getIntegrationCredentials(code);
        return creds.map((c: IntegrationResponse) => ({
          value: c.id,
          label: c.name || c.fullCode,
          hint: c.name ? c.subCode : undefined,
        }));
      }
      const apps = await apiService.getApps({ size: 100 });
      return apps.content.map((a: AppResponse) => ({ value: a.id, label: a.name }));
    },
    [],
  );

  useEffect(() => {
    if (isEdit || !connectorCode || !connectorType) return;
    let cancelled = false;
    loadIdentities(connectorCode, connectorType)
      .then((opts) => { if (!cancelled) setIdentities(opts); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isEdit, connectorCode, connectorType, loadIdentities]);

  const filterValidation = useMemo(() => tryParseJsonObject(inputFilterText), [inputFilterText]);

  const setConfigValue = (key: string, value: unknown) =>
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  const setConfigJson = (key: string, value: string) =>
    setConfigJsonText((prev) => ({ ...prev, [key]: value }));

  // Assemble the typed `config` object from the per-property editable state.
  function buildConfig(): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
    if (!configSchema) {
      return tryParseJsonObject(rawConfigText);
    }
    const required = new Set(configSchema.required ?? []);
    const out: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(configSchema.properties ?? {})) {
      const isRequired = required.has(key);
      switch (prop.type) {
        case 'boolean':
          out[key] = Boolean(configValues[key]);
          break;
        case 'array': {
          const items = (configValues[key] as string[] | undefined) ?? [];
          const trimmed = items.map((s) => s.trim()).filter((s) => s !== '');
          if (prop.items?.type === 'integer' || prop.items?.type === 'number') {
            const nums = trimmed.map(Number);
            if (nums.some((n) => Number.isNaN(n))) {
              return { ok: false, error: `${key}: ${t('invalidNumberList')}` };
            }
            if (nums.length > 0 || isRequired) out[key] = nums;
          } else if (trimmed.length > 0 || isRequired) {
            out[key] = trimmed;
          }
          break;
        }
        case 'integer':
        case 'number': {
          const raw = String(configValues[key] ?? '').trim();
          if (raw === '') {
            if (isRequired) return { ok: false, error: `${key}: ${t('fieldRequired')}` };
            break;
          }
          const n = Number(raw);
          if (Number.isNaN(n)) return { ok: false, error: `${key}: ${t('invalidNumber')}` };
          out[key] = n;
          break;
        }
        case 'object': {
          const parsed = tryParseJsonObject(configJsonText[key] ?? '');
          if (!parsed.ok) return { ok: false, error: `${key}: ${parsed.error}` };
          if (Object.keys(parsed.value).length > 0 || isRequired) out[key] = parsed.value;
          break;
        }
        default: {
          const raw = String(configValues[key] ?? '');
          if (raw.trim() === '' && !isRequired) break;
          out[key] = raw;
        }
      }
    }
    return { ok: true, value: out };
  }

  const INLINE_FIELD_ERROR_KEYS = ['name'];
  const unmappedFieldErrors = Object.fromEntries(
    Object.entries(fieldErrors).filter(([key]) => !INLINE_FIELD_ERROR_KEYS.includes(key)),
  );

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      const config = buildConfig();
      if (!config.ok) throw new Error(config.error);
      if (inputFilterText.trim() && !filterValidation.ok) {
        throw new Error(`inputFilter: ${filterValidation.error}`);
      }
      const filterValue = inputFilterText.trim() && filterValidation.ok ? filterValidation.value : null;

      if (isEdit && channel) {
        const body: UpdateChannelRequest = {
          name: name.trim(),
          config: config.value,
        };
        if (filterValue) {
          body.inputFilter = filterValue;
        } else if (channel.inputFilter) {
          body.clearInputFilter = true;
          body.inputFilter = null;
        }
        return apiService.updateChannel(channel.id, body);
      }

      const body: CreateChannelRequest = {
        agentId,
        name: name.trim(),
        channelHandler,
        connectorCode,
        identity,
        config: config.value,
        inputFilter: filterValue,
      };
      return apiService.createChannel(body);
    });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <Alert variant="error">{error}</Alert>}
      {Object.keys(unmappedFieldErrors).length > 0 && (
        <Alert variant="error">
          <ul className="list-disc list-inside space-y-0.5">
            {Object.entries(unmappedFieldErrors).map(([field, message]) => (
              <li key={field}>
                <span className="font-medium">{field}</span>: {message}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <FormField label={t('fieldName')} required layout="inline" error={fieldErrors.name}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder={t('placeholderName')}
        />
      </FormField>

      <div className="border border-border rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">{t('sectionBinding')}</h3>

        {isEdit ? (
          <ReadonlyBinding
            handler={channel!.channelHandler}
            connectorCode={channel!.connectorCode}
            identityName={channel!.identityName || channel!.identity}
          />
        ) : (
          <>
            <FormField label={t('fieldHandler')} required layout="inline">
              <select
                value={channelHandler}
                onChange={(e) => setChannelHandler(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground"
              >
                <option value="">{t('selectHandler')}</option>
                {handlers.map((h) => (
                  <option key={h.name} value={h.name}>{h.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label={t('fieldConnector')} required layout="inline">
              <select
                value={connectorCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setConnectorCode(code);
                  const conn = connectors.find((c) => c.code === code);
                  setConnectorType(conn ? getConnectorKind(conn) : null);
                  setIdentity('');
                }}
                className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground"
              >
                <option value="">{t('selectConnector')}</option>
                {connectors.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code} - {getConnectorKind(c)})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={t('fieldIdentity')} required layout="inline">
              <select
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                disabled={!connectorCode}
                className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground disabled:opacity-50"
              >
                <option value="">{t('selectIdentity')}</option>
                {identity && !identities.some((o) => o.value === identity) && (
                  <option value={identity}>{identity}</option>
                )}
                {identities.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}{o.hint ? ` (${o.hint})` : ''}
                  </option>
                ))}
              </select>
            </FormField>
          </>
        )}
      </div>

      {(channelHandler || isEdit) && (
        <div className="border border-border rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">{t('sectionConfig')}</h3>

          {configSchema ? (
            Object.entries(configSchema.properties ?? {}).length === 0 ? (
              <p className="text-xs text-muted">{t('configNoFields')}</p>
            ) : (
              Object.entries(configSchema.properties ?? {}).map(([key, prop]) => (
                <ConfigFieldRenderer
                  key={key}
                  name={key}
                  schema={prop}
                  required={(configSchema.required ?? []).includes(key)}
                  value={configValues[key]}
                  jsonText={configJsonText[key] ?? ''}
                  addLabel={t('addItem')}
                  onValueChange={(v) => setConfigValue(key, v)}
                  onJsonChange={(v) => setConfigJson(key, v)}
                />
              ))
            )
          ) : (
            <FormField label={t('sectionConfig')} hint={t('configRawHint')}>
              <textarea
                value={rawConfigText}
                onChange={(e) => setRawConfigText(e.target.value)}
                rows={10}
                spellCheck={false}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-foreground font-mono text-xs resize-y"
              />
            </FormField>
          )}
        </div>
      )}

      <FormField
        label={t('fieldInputFilter')}
        hint={t('inputFilterHint')}
        error={inputFilterText.trim() && !filterValidation.ok ? filterValidation.error : undefined}
      >
        <textarea
          value={inputFilterText}
          onChange={(e) => setInputFilterText(e.target.value)}
          rows={4}
          spellCheck={false}
          placeholder='{ "data.message.chat_id": 12345 }'
          className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-foreground font-mono text-xs resize-y"
        />
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          {t('cancel')}
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? t('save') : t('create')}
        </Button>
      </div>
    </form>
  );
}

interface ConfigFieldRendererProps {
  name: string;
  schema: ToolJsonSchema;
  required: boolean;
  value: unknown;
  jsonText: string;
  addLabel: string;
  onValueChange: (value: unknown) => void;
  onJsonChange: (value: string) => void;
}

function ConfigFieldRenderer({
  name,
  schema,
  required,
  value,
  jsonText,
  addLabel,
  onValueChange,
  onJsonChange,
}: ConfigFieldRendererProps) {
  const label = schema.title || name;
  const hint = schema.description;

  if (schema.type === 'boolean') {
    return (
      <FormField label={label} required={required} hint={hint} layout="inline">
        <Toggle checked={Boolean(value)} onChange={(checked) => onValueChange(checked)} />
      </FormField>
    );
  }

  if (schema.type === 'array') {
    const items = (value as string[] | undefined) ?? [];
    const numeric = schema.items?.type === 'integer' || schema.items?.type === 'number';
    const update = (next: string[]) => onValueChange(next);
    return (
      <FormField label={label} required={required} hint={hint}>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={item}
                inputMode={numeric ? 'numeric' : undefined}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  update(next);
                }}
              />
              <button
                type="button"
                onClick={() => update(items.filter((_, idx) => idx !== i))}
                className="shrink-0 px-2 py-1 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
                aria-label="remove"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update([...items, ''])}
            className="text-xs font-medium px-2 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            + {addLabel}
          </button>
        </div>
      </FormField>
    );
  }

  if (schema.type === 'object') {
    return (
      <FormField label={label} required={required} hint={hint}>
        <textarea
          value={jsonText}
          onChange={(e) => onJsonChange(e.target.value)}
          rows={6}
          spellCheck={false}
          placeholder="{ }"
          className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-foreground font-mono text-xs resize-y"
        />
      </FormField>
    );
  }

  if (schema.enum && schema.enum.length > 0) {
    return (
      <FormField label={label} required={required} hint={hint} layout="inline">
        <select
          value={String(value ?? '')}
          onChange={(e) => onValueChange(e.target.value)}
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
        onChange={(e) => onValueChange(e.target.value)}
      />
    </FormField>
  );
}

function ReadonlyBinding({
  handler,
  connectorCode,
  identityName,
}: { handler: string; connectorCode: string; identityName: string }) {
  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-baseline gap-2">
        <span className="text-muted w-20 shrink-0">handler</span>
        <span className="font-mono text-foreground">{handler}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-muted w-20 shrink-0">connector</span>
        <span className="font-mono text-foreground">{connectorCode}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-muted w-20 shrink-0">identity</span>
        <span className="text-foreground truncate">{identityName}</span>
      </div>
    </div>
  );
}
