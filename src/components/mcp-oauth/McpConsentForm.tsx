'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiService, { ApiError } from '@/services/api';
import { agentPresetsOptions } from '@/queries/agent-presets';
import { connectorCatalogOptions } from '@/queries/connectors';
import { useAgentCacheActions } from '@/queries/agents';
import { findConnector, isInternalConnector } from '@/utils/connector';
import { getErrorMessage } from '@/utils/error';
import AuthCard from '@/components/auth/AuthCard';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Input, Select } from '@/components/ui/FormField';
import type { AgentPresetResponse, McpAuthorizationParams, McpConsent } from '@/types';

const FROM_PRESET = '__preset';
const EMPTY = '__empty';

interface McpConsentFormProps {
  consent: McpConsent;
  authorization: McpAuthorizationParams;
  userEmail: string | null;
  onRecheck: () => void;
  // Hands over the redirect the backend built; the page follows it.
  onLeave: (redirectUrl: string) => void;
}

// Presets meant for an external brain first: they were written for this case.
const externalFirst = (a: AgentPresetResponse, b: AgentPresetResponse) =>
  Number(b.agentType !== null) - Number(a.agentType !== null);

export default function McpConsentForm({
  consent,
  authorization,
  userEmail,
  onRecheck,
  onLeave,
}: McpConsentFormProps) {
  const t = useTranslations('McpAuthorize');
  const { invalidateAll } = useAgentCacheActions();
  const { data: presetsData, isPending: presetsPending } = useQuery(agentPresetsOptions());
  const { data: catalog } = useQuery(connectorCatalogOptions());
  const presets = useMemo(() => [...(presetsData ?? [])].sort(externalFirst), [presetsData]);

  const selectable = consent.agents.filter((a) => a.available && a.enabled);
  // Nothing to pick from → creating one is the only way forward, so it starts selected.
  const [choice, setChoice] = useState<string | null>(selectable.length === 0 ? FROM_PRESET : null);
  const [presetName, setPresetName] = useState<string>('');
  const [emptyName, setEmptyName] = useState(consent.clientName);
  const [busy, setBusy] = useState<'approve' | 'deny' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preset = presets.find((p) => p.name === presetName) ?? presets[0];
  // No presets (none on the installation, or the gallery failed): the empty agent is left.
  const effectiveChoice = choice === FROM_PRESET && !presetsPending && !preset ? EMPTY : choice;
  const canApprove =
    !!effectiveChoice &&
    (effectiveChoice !== FROM_PRESET || !!preset) &&
    (effectiveChoice !== EMPTY || emptyName.trim().length > 0);

  // The ordinary create endpoint; the key in the answer is neither shown nor kept.
  const createAgent = async (): Promise<string> => {
    if (effectiveChoice === FROM_PRESET && preset) {
      const created = await apiService.createAgent({
        name: preset.title,
        description: preset.description || undefined,
        instructions: preset.instructions || undefined,
        type: 'MCP',
        skillIds: preset.skills.map((s) => s.id),
        presetName: preset.name,
      });
      const agentId = created.agent.id;
      // As in the wizard: open the internal connectors, or the preset's skills stay red.
      const internal = preset.connectorCodes.filter((code) => {
        const entry = findConnector(catalog, code);
        return !!entry && isInternalConnector(entry);
      });
      for (const connectorCode of internal) {
        await apiService.bindAgentConnection(agentId, { connectorCode }).catch(() => {});
      }
      return agentId;
    }
    const created = await apiService.createAgent({ name: emptyName.trim(), type: 'MCP' });
    return created.agent.id;
  };

  const approve = async () => {
    if (!effectiveChoice) return;
    setBusy('approve');
    setError(null);
    let agentId = effectiveChoice;
    try {
      if (effectiveChoice === FROM_PRESET || effectiveChoice === EMPTY) {
        agentId = await createAgent();
        invalidateAll();
        // Should approve fail, a retry must reuse this agent, not make a second one.
        setChoice(agentId);
        onRecheck();
      }
      const { redirectUrl } = await apiService.approveMcpAuthorization(authorization, agentId);
      onLeave(redirectUrl);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(t('agentNotFound'));
        setChoice(null);
        onRecheck();
      } else {
        setError(getErrorMessage(err, t('approveFailed')));
      }
      setBusy(null);
    }
  };

  const deny = async () => {
    setBusy('deny');
    setError(null);
    try {
      const { redirectUrl } = await apiService.denyMcpAuthorization(authorization);
      onLeave(redirectUrl);
    } catch (err) {
      setError(getErrorMessage(err, t('denyFailed')));
      setBusy(null);
    }
  };

  const disabled = busy !== null;

  return (
    <AuthCard>
      <div className="space-y-6">
        {/* The name is the client's own claim; the host is what tells a real
            client from a fake with the same name, so it is never smaller. */}
        <div className="text-center space-y-1">
          <h1 className="text-lg font-semibold text-foreground">
            {t.rich('title', {
              name: consent.clientName,
              b: (chunks) => <span className="font-bold">{chunks}</span>,
            })}
          </h1>
          <p className="text-lg font-semibold font-mono text-foreground break-all">{consent.clientHost}</p>
          <p className="text-sm text-muted">
            {consent.localApplication
              ? t('returnsLocal')
              : t('returnsTo', { host: consent.redirectHost })}
          </p>
          {userEmail && <p className="text-xs text-muted">{t('signedInAs', { email: userEmail })}</p>}
        </div>

        <fieldset className="space-y-2" disabled={disabled}>
          <legend className="text-sm font-medium text-foreground mb-2">{t('chooseAgent')}</legend>

          {consent.agents.map((agent) => {
            const reason = !agent.available
              ? t('agentUnavailable')
              : !agent.enabled
                ? t('agentDisabled')
                : null;
            return (
              <Option
                key={agent.id}
                value={agent.id}
                checked={effectiveChoice === agent.id}
                onSelect={setChoice}
                disabled={reason !== null}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{agent.name}</span>
                  <Chip tone="muted">{agent.type}</Chip>
                </div>
                {agent.description && (
                  <p className="text-xs text-muted mt-0.5 line-clamp-2">{agent.description}</p>
                )}
                {reason && <p className="text-xs text-muted mt-0.5">{reason}</p>}
              </Option>
            );
          })}

          {presets.length > 0 && (
            <Option value={FROM_PRESET} checked={effectiveChoice === FROM_PRESET} onSelect={setChoice}>
              <span className="text-sm font-medium text-foreground">{t('createFromPreset')}</span>
              {effectiveChoice === FROM_PRESET && preset && (
                <div className="mt-2 space-y-1">
                  <Select
                    size="sm"
                    value={preset.name}
                    onChange={(e) => setPresetName(e.target.value)}
                    aria-label={t('createFromPreset')}
                  >
                    {presets.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.title}
                      </option>
                    ))}
                  </Select>
                  {preset.description && <p className="text-xs text-muted">{preset.description}</p>}
                </div>
              )}
            </Option>
          )}

          <Option value={EMPTY} checked={effectiveChoice === EMPTY} onSelect={setChoice}>
            <span className="text-sm font-medium text-foreground">{t('createEmpty')}</span>
            {effectiveChoice === EMPTY && (
              <div className="mt-2">
                <Input
                  value={emptyName}
                  onChange={(e) => setEmptyName(e.target.value)}
                  maxLength={100}
                  aria-label={t('agentName')}
                  placeholder={t('agentName')}
                />
              </div>
            )}
          </Option>
        </fieldset>

        {effectiveChoice === EMPTY && (
          <Alert variant="warning">{t('emptyAgentWarning', { name: consent.clientName })}</Alert>
        )}

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="space-y-3">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={deny}
              loading={busy === 'deny'}
              disabled={disabled}
            >
              {t('deny')}
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={approve}
              loading={busy === 'approve'}
              disabled={disabled || !canApprove}
            >
              {t('approve')}
            </Button>
          </div>
          <p className="text-xs text-muted text-center">{t('footnote', { name: consent.clientName })}</p>
        </div>
      </div>
    </AuthCard>
  );
}

function Option({
  value,
  checked,
  onSelect,
  disabled = false,
  children,
}: {
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
        disabled
          ? 'border-border/50 opacity-60 cursor-not-allowed'
          : checked
            ? 'border-accent bg-accent/5 cursor-pointer'
            : 'border-border hover:bg-surface-secondary cursor-pointer'
      }`}
    >
      <input
        type="radio"
        name="mcp-agent"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(value)}
        className="mt-1 accent-accent"
      />
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}
