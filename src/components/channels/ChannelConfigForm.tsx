'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import {
  AppResponse,
  ChannelResponse,
  ConnectorCatalogEntry,
  ConnectorType,
  CreateChannelRequest,
  DeviceTriggerInfo,
  DeviceToolInfo,
  IntegrationResponse,
  TriggerLog,
  UpdateChannelRequest,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { ProbeCaptureModal } from './ProbeCaptureModal';
import { CapturedSamplePanel } from './CapturedSamplePanel';

interface ChannelConfigFormProps {
  agentPubId: string;
  channel: ChannelResponse | null;
  onCancel: () => void;
  onSuccess: (channel: ChannelResponse) => void;
}

interface IdentityOption {
  value: string;
  label: string;
  hint?: string;
}

const DEFAULT_PARAMS_PLACEHOLDER = `{
  "chat_id": "{trigger.data.message.chat_id}",
  "text": "{text}"
}`;

const TEMPLATE_PRESETS: Record<string, { messageField: string; params: string }> = {
  telegram: {
    messageField: 'data.message.text',
    params: `{
  "chat_id": "{trigger.data.message.chat_id}",
  "text": "{text}",
  "parse_mode": "HTML"
}`,
  },
};

// Depth-first search for the first dotted path whose string leaf contains `substring`.
// Used to surface the leaf that holds the user's probe code in the captured TriggerLog.
function findPathContaining(value: unknown, substring: string, path = ''): string | null {
  if (typeof value === 'string') {
    return value.includes(substring) ? path : null;
  }
  if (value !== null && typeof value === 'object') {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const found = findPathContaining(value[i], substring, path);
        if (found !== null) return found;
      }
      return null;
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childPath = path ? `${path}.${key}` : key;
      const found = findPathContaining(child, substring, childPath);
      if (found !== null) return found;
    }
  }
  return null;
}

function tryParseJson(text: string): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
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

export default function ChannelConfigForm({
  agentPubId,
  channel,
  onCancel,
  onSuccess,
}: ChannelConfigFormProps) {
  const t = useTranslations('Channels');
  const isEdit = !!channel;

  const [name, setName] = useState(channel?.name ?? '');
  const [triggerMessageField, setTriggerMessageField] = useState(channel?.triggerMessageField ?? '');
  const [paramsText, setParamsText] = useState(
    channel ? JSON.stringify(channel.replyToolParams, null, 2) : DEFAULT_PARAMS_PLACEHOLDER,
  );
  const [inputFilterText, setInputFilterText] = useState(
    channel?.inputFilter ? JSON.stringify(channel.inputFilter, null, 2) : '',
  );

  const [triggerConnectorCode, setTriggerConnectorCode] = useState(channel?.triggerConnectorCode ?? '');
  const [triggerConnectorType, setTriggerConnectorType] = useState<ConnectorType | null>(null);
  const [triggerIdentity, setTriggerIdentity] = useState(channel?.triggerIdentity ?? '');
  const [triggerName, setTriggerName] = useState(channel?.triggerName ?? '');
  const [useSameForReply, setUseSameForReply] = useState(
    !channel ||
      (channel.triggerConnectorCode === channel.replyConnectorCode &&
        channel.triggerIdentity === channel.replyIdentity),
  );
  const [replyConnectorCode, setReplyConnectorCode] = useState(channel?.replyConnectorCode ?? '');
  const [replyConnectorType, setReplyConnectorType] = useState<ConnectorType | null>(null);
  const [replyIdentity, setReplyIdentity] = useState(channel?.replyIdentity ?? '');
  const [replyToolName, setReplyToolName] = useState(channel?.replyToolName ?? '');

  const [connectors, setConnectors] = useState<ConnectorCatalogEntry[]>([]);
  const [triggerIdentities, setTriggerIdentities] = useState<IdentityOption[]>([]);
  const [replyIdentities, setReplyIdentities] = useState<IdentityOption[]>([]);
  const [triggers, setTriggers] = useState<DeviceTriggerInfo[]>([]);
  const [tools, setTools] = useState<DeviceToolInfo[]>([]);

  const { loading, error, handleSubmit } = useAsyncForm<ChannelResponse>({
    onSuccess: (result) => onSuccess(result),
    defaultError: 'Failed to save channel',
  });

  const [probeOpen, setProbeOpen] = useState(false);
  const [capturedSample, setCapturedSample] = useState<Record<string, unknown> | null>(null);
  const [suggestedPath, setSuggestedPath] = useState<string | null>(null);

  const handleProbeCaptured = useCallback(
    (log: TriggerLog, probeCode: string) => {
      setProbeOpen(false);
      // Resolve connector type from already-loaded catalog so the dependent
      // useEffects can load identities/triggers correctly.
      const conn = connectors.find((c) => c.code === log.connectorCode);
      setTriggerConnectorCode(log.connectorCode);
      setTriggerConnectorType(conn?.type ?? null);
      setTriggerIdentity(log.identity);
      setTriggerName(log.triggerName);
      setCapturedSample(log.triggerInput);

      // Locate the leaf containing the probe code — that's the user's message text.
      const detected = findPathContaining(log.triggerInput, probeCode);
      setSuggestedPath(detected);

      const preset = TEMPLATE_PRESETS[log.connectorCode];
      // Auto-fill message field only when the user hasn't deviated from the default:
      // empty, or still equal to the preset's messageField. Preserve any manual input.
      if (detected) {
        setTriggerMessageField((curr) => {
          if (!curr.trim()) return detected;
          if (preset && curr === preset.messageField) return detected;
          return curr;
        });
      } else if (preset) {
        setTriggerMessageField((curr) => curr || preset.messageField);
      }
      if (preset) {
        setParamsText((curr) => (curr === DEFAULT_PARAMS_PLACEHOLDER ? preset.params : curr));
      }
    },
    [connectors],
  );

  // Reset the persistent suggestion when the user opens a fresh probe — otherwise
  // a stale marker could point at a leaf that no longer exists in the new sample.
  const openProbe = useCallback(() => {
    setSuggestedPath(null);
    setProbeOpen(true);
  }, []);

  useEffect(() => {
    apiService.getConnectorCatalog().then((all) => {
      const filtered = all.filter((c) => c.type === 'APP' || c.type === 'INTEGRATION');
      setConnectors(filtered);
      const tConn = filtered.find((c) => c.code === channel?.triggerConnectorCode);
      if (tConn) setTriggerConnectorType(tConn.type);
      const rConn = filtered.find((c) => c.code === channel?.replyConnectorCode);
      if (rConn) setReplyConnectorType(rConn.type);
    }).catch(() => {});
  }, [channel?.triggerConnectorCode, channel?.replyConnectorCode]);

  const loadIdentities = useCallback(
    async (code: string, type: ConnectorType | null): Promise<IdentityOption[]> => {
      if (!code || !type) return [];
      if (type === 'INTEGRATION') {
        const creds = await apiService.getIntegrationCredentials(code);
        return creds.map((c: IntegrationResponse) => ({
          value: c.id,
          label: c.name || c.platformIdentifier,
          hint: c.name ? c.platformIdentifier : undefined,
        }));
      }
      const apps = await apiService.getApps({ size: 100 });
      return apps.content.map((a: AppResponse) => ({ value: a.pubId, label: a.name }));
    },
    [],
  );

  useEffect(() => {
    if (isEdit || !triggerConnectorCode || !triggerConnectorType) return;
    let cancelled = false;
    loadIdentities(triggerConnectorCode, triggerConnectorType).then((opts) => {
      if (!cancelled) setTriggerIdentities(opts);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isEdit, triggerConnectorCode, triggerConnectorType, loadIdentities]);

  useEffect(() => {
    if (isEdit || useSameForReply || !replyConnectorCode || !replyConnectorType) return;
    let cancelled = false;
    loadIdentities(replyConnectorCode, replyConnectorType).then((opts) => {
      if (!cancelled) setReplyIdentities(opts);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isEdit, useSameForReply, replyConnectorCode, replyConnectorType, loadIdentities]);

  useEffect(() => {
    if (isEdit || !triggerConnectorCode || !triggerConnectorType || !triggerIdentity) return;
    let cancelled = false;
    const fetcher = triggerConnectorType === 'INTEGRATION'
      ? apiService.getIntegrationTriggers(triggerConnectorCode)
      : apiService.getAppTriggers(triggerIdentity);
    fetcher.then((data) => { if (!cancelled) setTriggers(data); }).catch(() => {});
    return () => { cancelled = true; };
  }, [isEdit, triggerConnectorCode, triggerConnectorType, triggerIdentity]);

  useEffect(() => {
    if (isEdit) return;
    const code = useSameForReply ? triggerConnectorCode : replyConnectorCode;
    const type = useSameForReply ? triggerConnectorType : replyConnectorType;
    const identity = useSameForReply ? triggerIdentity : replyIdentity;
    if (!code || !type || !identity) return;
    let cancelled = false;
    const fetcher = type === 'INTEGRATION'
      ? apiService.getIntegrationTools(code)
      : apiService.getAppTools(identity);
    fetcher.then((data) => { if (!cancelled) setTools(data); }).catch(() => {});
    return () => { cancelled = true; };
  }, [
    isEdit,
    useSameForReply,
    triggerConnectorCode, triggerConnectorType, triggerIdentity,
    replyConnectorCode, replyConnectorType, replyIdentity,
  ]);

  const paramsValidation = useMemo(() => tryParseJson(paramsText), [paramsText]);
  const filterValidation = useMemo(() => tryParseJson(inputFilterText), [inputFilterText]);

  const placeholderSuggestions = useMemo(() => {
    const set = new Set<string>(['{text}']);
    const re = /\{trigger\.[a-zA-Z0-9_.]+\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(paramsText)) !== null) set.add(m[0]);
    return Array.from(set);
  }, [paramsText]);

  const insertPlaceholder = (ph: string) => {
    setParamsText((curr) => `${curr}${curr.endsWith('\n') ? '' : ' '}${ph}`);
  };

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      if (!paramsValidation.ok) throw new Error(`replyToolParams: ${paramsValidation.error}`);
      if (inputFilterText.trim() && !filterValidation.ok) {
        throw new Error(`inputFilter: ${filterValidation.error}`);
      }
      const filterValue = inputFilterText.trim() && filterValidation.ok ? filterValidation.value : null;

      if (isEdit && channel) {
        const body: UpdateChannelRequest = {
          name: name.trim(),
          triggerMessageField: triggerMessageField.trim(),
          replyToolParams: paramsValidation.value,
        };
        if (filterValue) {
          body.inputFilter = filterValue;
        } else if (channel.inputFilter) {
          body.clearInputFilter = true;
          body.inputFilter = null;
        }
        return apiService.updateChannel(channel.pubId, body);
      }

      const body: CreateChannelRequest = {
        agentPubId,
        name: name.trim(),
        triggerConnectorCode,
        triggerIdentity,
        triggerName,
        triggerMessageField: triggerMessageField.trim(),
        replyConnectorCode: useSameForReply ? triggerConnectorCode : replyConnectorCode,
        replyIdentity: useSameForReply ? triggerIdentity : replyIdentity,
        replyToolName,
        replyToolParams: paramsValidation.value,
        inputFilter: filterValue,
      };
      return apiService.createChannel(body);
    });

  return (
    <>
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <Alert variant="error">{error}</Alert>}

      <FormField label={t('fieldName')} required>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder={t('placeholderName')}
        />
      </FormField>

      <div className="border border-border rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">{t('sectionTrigger')}</h3>

        {isEdit ? (
          <ReadonlyBinding
            connectorCode={channel!.triggerConnectorCode}
            identityName={channel!.triggerIdentityName || channel!.triggerIdentity}
            resourceName={channel!.triggerName}
          />
        ) : (
          <>
            <button
              type="button"
              onClick={openProbe}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 text-accent text-sm font-medium transition-colors"
            >
              <span aria-hidden>🪄</span>
              <span>{t('probeButton')}</span>
            </button>
            <FormField label={t('fieldConnector')} required>
              <select
                value={triggerConnectorCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setTriggerConnectorCode(code);
                  const conn = connectors.find((c) => c.code === code);
                  setTriggerConnectorType(conn?.type ?? null);
                  setTriggerIdentity('');
                  setTriggerName('');
                  const preset = TEMPLATE_PRESETS[code];
                  if (preset) {
                    setTriggerMessageField((curr) => curr || preset.messageField);
                    setParamsText((curr) =>
                      curr === DEFAULT_PARAMS_PLACEHOLDER ? preset.params : curr,
                    );
                  }
                }}
                className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground"
              >
                <option value="">{t('selectConnector')}</option>
                {connectors.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code} - {c.type})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={t('fieldIdentity')} required>
              <select
                value={triggerIdentity}
                onChange={(e) => { setTriggerIdentity(e.target.value); setTriggerName(''); }}
                disabled={!triggerConnectorCode}
                className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground disabled:opacity-50"
              >
                <option value="">{t('selectIdentity')}</option>
                {triggerIdentity && !triggerIdentities.some((o) => o.value === triggerIdentity) && (
                  <option value={triggerIdentity}>{triggerIdentity}</option>
                )}
                {triggerIdentities.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}{o.hint ? ` (${o.hint})` : ''}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={t('fieldTrigger')} required>
              <select
                value={triggerName}
                onChange={(e) => setTriggerName(e.target.value)}
                disabled={!triggerIdentity}
                className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground disabled:opacity-50"
              >
                <option value="">{t('selectTrigger')}</option>
                {triggerName && !triggers.some((tr) => tr.name === triggerName) && (
                  <option value={triggerName}>{triggerName}</option>
                )}
                {triggers.map((tr) => (
                  <option key={tr.name} value={tr.name}>
                    {tr.name}{tr.description ? ` — ${tr.description}` : ''}
                  </option>
                ))}
              </select>
            </FormField>
          </>
        )}

        <FormField
          label={t('fieldMessageField')}
          required
          hint={t('messageFieldHint')}
        >
          <Input
            value={triggerMessageField}
            onChange={(e) => setTriggerMessageField(e.target.value)}
            placeholder="data.message.text"
          />
        </FormField>

        {!isEdit && capturedSample && (
          <CapturedSamplePanel
            sample={capturedSample}
            currentPath={triggerMessageField}
            suggestedPath={suggestedPath}
            onPickPath={setTriggerMessageField}
          />
        )}
      </div>

      <div className="border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{t('sectionReply')}</h3>
          {!isEdit && (
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={useSameForReply}
                onChange={(ev) => setUseSameForReply(ev.target.checked)}
                className="accent-accent"
              />
              {t('useSameForReply')}
            </label>
          )}
        </div>

        {isEdit ? (
          <ReadonlyBinding
            connectorCode={channel!.replyConnectorCode}
            identityName={channel!.replyIdentityName || channel!.replyIdentity}
            resourceName={channel!.replyToolName}
          />
        ) : (
          <>
            {!useSameForReply && (
              <>
                <FormField label={t('fieldConnector')} required>
                  <select
                    value={replyConnectorCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setReplyConnectorCode(code);
                      const conn = connectors.find((c) => c.code === code);
                      setReplyConnectorType(conn?.type ?? null);
                      setReplyIdentity('');
                      setReplyToolName('');
                    }}
                    className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground"
                  >
                    <option value="">{t('selectConnector')}</option>
                    {connectors.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code} - {c.type})
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label={t('fieldIdentity')} required>
                  <select
                    value={replyIdentity}
                    onChange={(e) => { setReplyIdentity(e.target.value); setReplyToolName(''); }}
                    disabled={!replyConnectorCode}
                    className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground disabled:opacity-50"
                  >
                    <option value="">{t('selectIdentity')}</option>
                    {replyIdentities.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}{o.hint ? ` (${o.hint})` : ''}
                      </option>
                    ))}
                  </select>
                </FormField>
              </>
            )}

            <FormField label={t('fieldTool')} required>
              <select
                value={replyToolName}
                onChange={(e) => setReplyToolName(e.target.value)}
                disabled={
                  useSameForReply
                    ? !triggerIdentity
                    : !replyIdentity
                }
                className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground disabled:opacity-50"
              >
                <option value="">{t('selectTool')}</option>
                {tools.map((tl) => (
                  <option key={tl.name} value={tl.name}>
                    {tl.name}{tl.description ? ` — ${tl.description}` : ''}
                  </option>
                ))}
              </select>
            </FormField>
          </>
        )}

        <FormField
          label={t('fieldReplyParams')}
          required
          hint={t('replyParamsHint')}
          error={paramsValidation.ok ? undefined : paramsValidation.error}
        >
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {placeholderSuggestions.map((ph) => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => insertPlaceholder(ph)}
                  className="text-[10px] font-mono px-2 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                >
                  {ph}
                </button>
              ))}
            </div>
            <textarea
              value={paramsText}
              onChange={(e) => setParamsText(e.target.value)}
              rows={10}
              spellCheck={false}
              className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-foreground font-mono text-xs resize-y"
            />
          </div>
        </FormField>
      </div>

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
    {!isEdit && (
      <ProbeCaptureModal
        isOpen={probeOpen}
        onClose={() => setProbeOpen(false)}
        onCaptured={handleProbeCaptured}
      />
    )}
    </>
  );
}

function ReadonlyBinding({
  connectorCode,
  identityName,
  resourceName,
}: { connectorCode: string; identityName: string; resourceName: string }) {
  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-baseline gap-2">
        <span className="text-muted w-20 shrink-0">connector</span>
        <span className="font-mono text-foreground">{connectorCode}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-muted w-20 shrink-0">identity</span>
        <span className="text-foreground truncate">{identityName}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-muted w-20 shrink-0">name</span>
        <span className="font-mono text-foreground">{resourceName}</span>
      </div>
    </div>
  );
}
