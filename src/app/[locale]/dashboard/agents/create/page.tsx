'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import apiService from '@/services/api';
import { AppResponse, AgentSettingsResponse, TriggerDestination } from '@/types';
import { Button } from '@/components/ui/Button';
import { FormField, TextArea } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Toggle } from '@/components/ui/Toggle';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import TriggerPicker from '@/components/agents/TriggerPicker';
import ToolPicker from '@/components/agents/ToolPicker';

export default function CreateAgentPage() {
  const t = useTranslations('Agents');
  const router = useRouter();

  const [apps, setApps] = useState<AppResponse[]>([]);
  const [existingAgents, setExistingAgents] = useState<AgentSettingsResponse[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [apiKeyPubId, setApiKeyPubId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [triggersTo, setTriggersTo] = useState<TriggerDestination>('centrifugo');
  const [triggersAllowAll, setTriggersAllowAll] = useState(true);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setDataError(null);
      const [agentsData, appsData] = await Promise.all([
        apiService.getAgentSettingsList(),
        apiService.getApps(),
      ]);
      setExistingAgents(agentsData);
      setApps(appsData);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const existingPubIds = new Set(existingAgents.map((a) => a.apiKeyPubId));
  const availableApps = apps.filter((app) => !existingPubIds.has(app.id));

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm<AgentSettingsResponse>({
    onSuccess: () => {
      router.push('/dashboard/agents');
    },
    defaultError: 'Failed to create agent configuration',
  });

  const getFieldError = (prefix: string) =>
    Object.entries(fieldErrors)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value)
      .join('; ')
    || '';

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.createAgentSettings({
        apiKeyPubId,
        prompt,
        triggersAllowAll,
        triggersTo,
        tools,
        triggers: triggersAllowAll ? [] : triggers,
      })
    );

  const triggerDestinationOptions: { value: TriggerDestination; label: string; color: string }[] = [
    { value: 'centrifugo', label: 'Centrifugo (Real-time)', color: 'text-accent' },
    { value: 'webhook', label: 'Webhook', color: 'text-success' },
    { value: 'ignore', label: 'Ignore', color: 'text-muted' },
  ];

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-muted">{t('loadingAgents')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/dashboard/agents')}
        className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        <span className="text-sm">{t('backToAgents')}</span>
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('createAgentTitle')}</h1>
      </div>

      {dataError && <ErrorAlert>{dataError}</ErrorAlert>}

      {/* Form Card */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField label="App" required error={getFieldError('apiKeyPubId')}>
            <select
              value={apiKeyPubId}
              onChange={(e) => setApiKeyPubId(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground"
            >
              <option value="">Select an app...</option>
              {availableApps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name} ({app.maskedKeyId})
                </option>
              ))}
            </select>
            {availableApps.length === 0 && (
              <p className="text-xs text-muted mt-1">
                All apps already have agent configurations.
              </p>
            )}
          </FormField>

          <FormField label="Prompt" required error={getFieldError('prompt')}>
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter instructions for the agent..."
              rows={6}
              required
            />
          </FormField>

          <FormField label="Trigger Destination" required error={getFieldError('triggersTo')}>
            <div className="space-y-2">
              {triggerDestinationOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="triggersTo"
                    value={option.value}
                    checked={triggersTo === option.value}
                    onChange={() => setTriggersTo(option.value)}
                    className="accent-accent"
                  />
                  <span className={`text-sm ${option.color}`}>{option.label}</span>
                </label>
              ))}
            </div>
          </FormField>

          <FormField label="Allow All Triggers" error={getFieldError('triggersAllowAll')}>
            <Toggle
              checked={triggersAllowAll}
              onChange={setTriggersAllowAll}
              label="Accept all triggers from connected devices"
            />
          </FormField>

          {!triggersAllowAll && (
            <FormField label="Triggers" error={getFieldError('triggers')}>
              <TriggerPicker
                selectedTriggers={triggers}
                onChange={setTriggers}
              />
            </FormField>
          )}

          <FormField label="Tools" error={getFieldError('tools')}>
            <ToolPicker
              selectedTools={tools}
              onChange={setTools}
            />
          </FormField>

          {error && <ErrorAlert>{error}</ErrorAlert>}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/dashboard/agents')}
              disabled={loading}
              className="flex-1"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !apiKeyPubId || !prompt.trim()}
              loading={loading}
              className="flex-1"
            >
              {t('createAgent')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
