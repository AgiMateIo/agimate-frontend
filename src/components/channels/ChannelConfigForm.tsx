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
  ToolJsonSchema,
  ToolSpecification,
  TriggerLog,
  UpdateChannelRequest,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { ProbeCaptureModal } from './ProbeCaptureModal';
import { CapturedSamplePanel, type JsonLeaf } from './CapturedSamplePanel';

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

// Normalise a param/key name for fuzzy matching: lowercase + strip _, -, and dots.
function normaliseParamName(s: string): string {
  return s.toLowerCase().replace(/[_\-.]/g, '');
}

const REPLY_TEXT_NAMES = new Set(['text', 'message', 'body', 'content', 'reply', 'response']);

// Find the shortest dotted path in `sample` whose last segment fuzzy-matches `paramName`.
function findTriggerPathForParam(
  sample: Record<string, unknown> | null,
  paramName: string,
): string | null {
  if (!sample) return null;
  const target = normaliseParamName(paramName);
  if (!target) return null;

  let best: string | null = null;

  const visit = (value: unknown, path: string, lastSegment: string) => {
    if (path && normaliseParamName(lastSegment) === target) {
      if (best === null || path.split('.').length < best.split('.').length) {
        best = path;
      }
    }
    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          visit(value[i], path, lastSegment);
        }
        return;
      }
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        const childPath = path ? `${path}.${key}` : key;
        visit(child, childPath, key);
      }
    }
  };
  visit(sample, '', '');
  return best;
}

// Build a JSON template string from a tool's JSON Schema. Required-only by default;
// optional fields included when `opts.includeOptional` is true. Smart placeholders:
//   - `{text}` for reply-text string params (text/message/body/content/reply/response).
//   - `{trigger.<path>}` when a path in the captured triggerInput fuzzy-matches the param name.
//   - First enum value when present.
//   - Recurse into nested object/array schemas.
//   - Type defaults otherwise.
function buildToolParamsTemplate(
  schema: ToolJsonSchema,
  opts: { includeOptional: boolean; sample: Record<string, unknown> | null },
): string {
  if (schema.type !== 'object' || !schema.properties) {
    return DEFAULT_PARAMS_PLACEHOLDER;
  }
  const out = buildObjectValue(schema, opts);
  return JSON.stringify(out, null, 2);
}

function valueForProperty(
  name: string,
  prop: ToolJsonSchema,
  opts: { includeOptional: boolean; sample: Record<string, unknown> | null },
): unknown {
  if (prop.type === 'string' && REPLY_TEXT_NAMES.has(name.toLowerCase())) {
    return '{text}';
  }
  const triggerPath = findTriggerPathForParam(opts.sample, name);
  if (triggerPath) {
    return `{trigger.${triggerPath}}`;
  }
  if (prop.enumValues && prop.enumValues.length > 0) {
    return prop.enumValues[0];
  }
  if (prop.type === 'object') {
    return buildObjectValue(prop, opts);
  }
  if (prop.type === 'array') {
    if (prop.items) return [valueForProperty(name, prop.items, opts)];
    return [];
  }
  switch (prop.type) {
    case 'string': return '';
    case 'number':
    case 'integer': return 0;
    case 'boolean': return false;
    default: return null;
  }
}

function buildObjectValue(
  schema: ToolJsonSchema,
  opts: { includeOptional: boolean; sample: Record<string, unknown> | null },
): Record<string, unknown> {
  const required = new Set(schema.required ?? []);
  const out: Record<string, unknown> = {};
  for (const [name, prop] of Object.entries(schema.properties ?? {})) {
    if (!opts.includeOptional && !required.has(name)) continue;
    out[name] = valueForProperty(name, prop, opts);
  }
  return out;
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
  agentId,
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
  const [toolSpecs, setToolSpecs] = useState<Record<string, ToolSpecification>>({});
  const [includeOptional, setIncludeOptional] = useState(false);
  const [paramsAutoGenerated, setParamsAutoGenerated] = useState(!channel);

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm<ChannelResponse>({
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

  const handleAddFilter = useCallback((path: string, value: JsonLeaf) => {
    setInputFilterText((curr) => {
      const parsed = tryParseJson(curr);
      if (!parsed.ok) return curr;
      const merged = { ...parsed.value, [path]: value };
      return JSON.stringify(merged, null, 2);
    });
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
      return apps.content.map((a: AppResponse) => ({ value: a.id, label: a.name }));
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
    // Spec endpoint: APP needs identity, INTEGRATION/INTERNAL_SERVICE doesn't.
    const specFetcher = apiService
      .getToolSpecifications(code, type === 'INTEGRATION' ? undefined : identity)
      .catch(() => ({} as Record<string, ToolSpecification>));
    Promise.all([fetcher, specFetcher]).then(([data, specs]) => {
      if (cancelled) return;
      setTools(data);
      setToolSpecs(specs);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [
    isEdit,
    useSameForReply,
    triggerConnectorCode, triggerConnectorType, triggerIdentity,
    replyConnectorCode, replyConnectorType, replyIdentity,
  ]);

  // Regenerate the params template when the selected tool, optional toggle, or captured
  // sample changes — but only while paramsText is still an untouched auto-generated value.
  // The setState-in-effect is intentional: textarea content is derived from async-loaded spec.
  useEffect(() => {
    if (isEdit) return;
    if (!paramsAutoGenerated) return;
    if (!replyToolName) return;
    const spec = toolSpecs[replyToolName];
    if (!spec) return;
    const next = buildToolParamsTemplate(spec.parameters, {
      includeOptional,
      sample: capturedSample,
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParamsText(next);
  }, [isEdit, paramsAutoGenerated, replyToolName, toolSpecs, includeOptional, capturedSample]);

  // Has the selected tool any optional fields? Controls whether the "Show optional" checkbox is meaningful.
  const selectedSpecHasOptional = useMemo(() => {
    if (!replyToolName) return false;
    const spec = toolSpecs[replyToolName];
    if (!spec || !spec.parameters.properties) return false;
    const required = new Set(spec.parameters.required ?? []);
    return Object.keys(spec.parameters.properties).some((k) => !required.has(k));
  }, [replyToolName, toolSpecs]);

  const resetParamsToDefault = useCallback(() => {
    const spec = replyToolName ? toolSpecs[replyToolName] : null;
    if (spec) {
      setParamsText(
        buildToolParamsTemplate(spec.parameters, { includeOptional, sample: capturedSample }),
      );
    } else {
      const preset = TEMPLATE_PRESETS[useSameForReply ? triggerConnectorCode : replyConnectorCode];
      setParamsText(preset?.params ?? DEFAULT_PARAMS_PLACEHOLDER);
    }
    setParamsAutoGenerated(true);
  }, [
    replyToolName, toolSpecs, includeOptional, capturedSample,
    useSameForReply, triggerConnectorCode, replyConnectorCode,
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
    setParamsAutoGenerated(false);
  };

  // Field errors bound to a specific FormField (shown inline). Anything else from
  // the backend's error.details is rendered in the catch-all Alert so no validation
  // message is silently swallowed.
  const INLINE_FIELD_ERROR_KEYS = ['name'];
  const unmappedFieldErrors = Object.fromEntries(
    Object.entries(fieldErrors).filter(([key]) => !INLINE_FIELD_ERROR_KEYS.includes(key)),
  );

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
        return apiService.updateChannel(channel.id, body);
      }

      const body: CreateChannelRequest = {
        agentId,
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
            <FormField label={t('fieldConnector')} required layout="inline">
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

            <FormField label={t('fieldIdentity')} required layout="inline">
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

            <FormField label={t('fieldTrigger')} required layout="inline">
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
          layout="inline"
        >
          <Input
            value={triggerMessageField}
            onChange={(e) => setTriggerMessageField(e.target.value)}
            placeholder="data.message.text"
          />
        </FormField>

        {!isEdit && capturedSample && (
          <CapturedSamplePanel
            mode="message"
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
                <FormField label={t('fieldConnector')} required layout="inline">
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

                <FormField label={t('fieldIdentity')} required layout="inline">
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

            <FormField label={t('fieldTool')} required layout="inline">
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
            <div className="flex flex-wrap items-center justify-between gap-2">
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
              {!isEdit && replyToolName && toolSpecs[replyToolName] && (
                <div className="flex items-center gap-3 text-[11px]">
                  <label className={`flex items-center gap-1.5 ${selectedSpecHasOptional ? 'cursor-pointer text-muted' : 'opacity-50 cursor-not-allowed text-muted'}`}>
                    <input
                      type="checkbox"
                      checked={includeOptional}
                      onChange={(ev) => setIncludeOptional(ev.target.checked)}
                      disabled={!selectedSpecHasOptional}
                      className="accent-accent"
                    />
                    {t('showOptionalFields')}
                  </label>
                  <button
                    type="button"
                    onClick={resetParamsToDefault}
                    className="px-2 py-1 rounded bg-surface-secondary border border-border text-muted hover:text-foreground hover:bg-border transition-colors"
                  >
                    ↺ {t('resetParamsTemplate')}
                  </button>
                </div>
              )}
            </div>
            {!isEdit && paramsAutoGenerated && replyToolName && toolSpecs[replyToolName] && (
              <div className="text-[11px] text-muted">
                {t('paramsAutoGeneratedHint', { tool: replyToolName })}
              </div>
            )}
            <textarea
              value={paramsText}
              onChange={(e) => {
                setParamsText(e.target.value);
                setParamsAutoGenerated(false);
              }}
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
        <div className="space-y-2">
          <textarea
            value={inputFilterText}
            onChange={(e) => setInputFilterText(e.target.value)}
            rows={4}
            spellCheck={false}
            placeholder='{ "data.message.chat_id": 12345 }'
            className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-foreground font-mono text-xs resize-y"
          />
          {!isEdit && capturedSample && (
            <CapturedSamplePanel
              mode="filter"
              sample={capturedSample}
              currentFilter={filterValidation.ok ? filterValidation.value : {}}
              onAddFilter={handleAddFilter}
              disabled={!!inputFilterText.trim() && !filterValidation.ok}
              disabledReason={t('capturedSampleFilterParseError')}
            />
          )}
        </div>
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
