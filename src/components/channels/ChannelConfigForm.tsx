'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import {
  ChannelResponse,
  CreateChannelRequest,
  UpdateChannelRequest,
} from '@/types';
import { getConnectorKind } from '@/utils/connector';
import { Button } from '@/components/ui/Button';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { buildConfig, seedConfigState, tryParseJsonObject } from './channelConfig';
import { ConfigFieldRenderer } from './ConfigFieldRenderer';
import { useChannelConfigData } from './useChannelConfigData';
import { TriggerProbeModal } from './TriggerProbeModal';
import { CapturedSamplePanel } from './CapturedSamplePanel';
import type { TriggerLog } from '@/types';

interface ChannelConfigFormProps {
  agentId: string;
  channel: ChannelResponse | null;
  onCancel: () => void;
  onSuccess: (channel: ChannelResponse) => void;
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
  const [connectionId, setConnectionId] = useState(channel?.connectionId ?? '');

  const { handlers, connectors, connections } = useChannelConfigData({
    channel,
    connectorCode,
  });

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

  const [probeOpen, setProbeOpen] = useState(false);
  // Payload of the trigger captured via the probe, offered as a picker for filter conditions.
  const [capturedSample, setCapturedSample] = useState<Record<string, unknown> | null>(null);

  // A captured trigger already tells us its connector + connection instance; pre-fill the
  // binding and keep the payload so the user can turn its fields into an input filter.
  const handleProbeCaptured = (log: TriggerLog) => {
    setProbeOpen(false);
    setConnectorCode(log.connectorCode);
    setConnectionId(log.connectionId ?? '');
    setCapturedSample(log.input);
  };

  // Merge a picked payload leaf into the input filter (dot-path key = value).
  const addFilterCondition = (path: string, value: string | number | boolean | null) => {
    const parsed = tryParseJsonObject(inputFilterText);
    const base = parsed.ok ? parsed.value : {};
    setInputFilterText(JSON.stringify({ ...base, [path]: value }, null, 2));
  };

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm<ChannelResponse>({
    onSuccess: (result) => onSuccess(result),
    defaultError: 'Failed to save channel',
  });

  const selectedHandler = useMemo(
    () => handlers.find((h) => h.name === channelHandler),
    [handlers, channelHandler],
  );
  const configSchema = selectedHandler?.configFields;

  // (Re)seed the config form for the active handler. Not an effect: on edit the
  // trigger is the handler list arriving, so there is no event to hang it on,
  // and seeding after the commit would paint one frame of empty fields first.
  // This is the adjust-state-during-render form — React discards the render and
  // redoes it with the new state before anything reaches the DOM.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (selectedHandler && seededFor !== selectedHandler.name) {
    const { values, jsonText } = seedConfigState(selectedHandler.configFields, channel?.config ?? {});
    setSeededFor(selectedHandler.name);
    setConfigValues(values);
    setConfigJsonText(jsonText);
  }

  const filterValidation = useMemo(() => tryParseJsonObject(inputFilterText), [inputFilterText]);

  const setConfigValue = (key: string, value: unknown) =>
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  const setConfigJson = (key: string, value: string) =>
    setConfigJsonText((prev) => ({ ...prev, [key]: value }));

  const INLINE_FIELD_ERROR_KEYS = ['name'];
  const unmappedFieldErrors = Object.fromEntries(
    Object.entries(fieldErrors).filter(([key]) => !INLINE_FIELD_ERROR_KEYS.includes(key)),
  );

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      const config = buildConfig(configSchema, configValues, configJsonText, rawConfigText, t);
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
        connectionId,
        config: config.value,
        inputFilter: filterValue,
      };
      return apiService.createChannel(body);
    });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <ErrorAlert>{error}</ErrorAlert>}
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
            connectionName={channel!.connectionName || channel!.connectionId || '—'}
          />
        ) : (
          <>
            <FormField label={t('fieldHandler')} required layout="inline">
              <Select value={channelHandler} onChange={(e) => setChannelHandler(e.target.value)}>
                <option value="">{t('selectHandler')}</option>
                {handlers.map((h) => (
                  <option key={h.name} value={h.name}>{h.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label={t('fieldConnector')} required layout="inline">
              <Select
                value={connectorCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setConnectorCode(code);
                  setConnectionId('');
                }}
              >
                <option value="">{t('selectConnector')}</option>
                {connectors.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code} - {getConnectorKind(c)})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label={t('fieldConnection')} required layout="inline">
              <Select
                value={connectionId}
                onChange={(e) => setConnectionId(e.target.value)}
                disabled={!connectorCode}
                className="disabled:opacity-50"
              >
                <option value="">{t('selectConnection')}</option>
                {connectionId && !connections.some((o) => o.value === connectionId) && (
                  <option value={connectionId}>{connectionId}</option>
                )}
                {connections.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}{o.hint ? ` (${o.hint})` : ''}
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-muted">{t('probeHint')}</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setProbeOpen(true)}
              >
                {t('probeButton')}
              </Button>
            </div>
          </>
        )}
      </div>

      {!isEdit && probeOpen && (
        <TriggerProbeModal
          onClose={() => setProbeOpen(false)}
          onCaptured={handleProbeCaptured}
        />
      )}

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

      {!isEdit && capturedSample && (
        <CapturedSamplePanel
          sample={capturedSample}
          activePaths={filterValidation.ok ? Object.keys(filterValidation.value) : []}
          onPick={addFilterCondition}
        />
      )}

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

function ReadonlyBinding({
  handler,
  connectorCode,
  connectionName,
}: { handler: string; connectorCode: string; connectionName: string }) {
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
        <span className="text-muted w-20 shrink-0">connection</span>
        <span className="text-foreground truncate">{connectionName}</span>
      </div>
    </div>
  );
}
