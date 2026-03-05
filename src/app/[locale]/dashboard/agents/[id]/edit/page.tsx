'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import apiService from '@/services/api';
import { ApiKey, AgentResponse, TriggerDestination } from '@/types';
import { Button } from '@/components/ui/Button';
import { FormField, TextArea, Input } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Toggle } from '@/components/ui/Toggle';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { getAgentAvatarUrl } from '@/utils/avatar';

export default function EditAgentPage() {
  const t = useTranslations('Agents');
  const router = useRouter();
  const params = useParams();
  const apiKeyPubId = params.id as string;

  const [agent, setAgent] = useState<AgentResponse | null>(null);
  const [apiKeyName, setApiKeyName] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [triggersTo, setTriggersTo] = useState<TriggerDestination>('centrifugo');
  const [triggersAllowAll, setTriggersAllowAll] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookAuthHeader, setWebhookAuthHeader] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setDataError(null);
      const [agentsData, apiKeysData] = await Promise.all([
        apiService.getAgentsList(),
        apiService.getApiKeys(),
      ]);

      const foundAgent = agentsData.find((a: AgentResponse) => a.apiKeyPubId === apiKeyPubId);
      if (!foundAgent) {
        setDataError('Agent not found');
        setDataLoading(false);
        return;
      }

      const foundKey = apiKeysData.find((k: ApiKey) => k.pubId === apiKeyPubId);
      setApiKeyName(foundKey ? foundKey.name : apiKeyPubId);

      setAgent(foundAgent);
      setName(foundAgent.name);
      setPrompt(foundAgent.prompt);
      setTriggersTo(foundAgent.triggersTo);
      setTriggersAllowAll(foundAgent.triggersAllowAll);
      setWebhookUrl(foundAgent.webhookUrl ?? '');
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setDataLoading(false);
    }
  }, [apiKeyPubId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm<AgentResponse>({
    onSuccess: () => {
      router.push('/dashboard/agents');
    },
    defaultError: 'Failed to update agent configuration',
  });

  const getFieldError = (prefix: string) =>
    Object.entries(fieldErrors)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value)
      .join('; ')
    || '';

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.updateAgent(apiKeyPubId, {
        name,
        prompt,
        triggersAllowAll,
        triggersTo,
        webhookUrl: triggersTo === 'webhook' ? webhookUrl : null,
        webhookAuthHeader: triggersTo === 'webhook' && webhookAuthHeader ? webhookAuthHeader : null,
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

  if (dataError || !agent) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push('/dashboard/agents')}
          className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="text-sm">{t('backToAgents')}</span>
        </button>
        <ErrorAlert>{dataError || 'Agent not found'}</ErrorAlert>
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
        <h1 className="text-2xl font-bold text-foreground">{t('editAgentPageTitle')}</h1>
      </div>

      {/* Form Card */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField label="API Key">
            <div className="px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-muted">
              {apiKeyName}
            </div>
          </FormField>

          <FormField label={t('nameLabel')} required error={getFieldError('name')}>
            <div className="flex items-center gap-3">
              {name && (
                <img
                  src={getAgentAvatarUrl(name)}
                  alt={name}
                  className="w-10 h-10 rounded-lg flex-shrink-0"
                />
              )}
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                required
                maxLength={100}
              />
            </div>
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

          <FormField label={t('skills')}>
            <select
              disabled
              className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-muted opacity-60 cursor-not-allowed"
            >
              <option value="">{t('skillsPlaceholder')}</option>
            </select>
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
                    onChange={() => {
                      setTriggersTo(option.value);
                      if (option.value !== 'webhook') {
                        setWebhookUrl('');
                        setWebhookAuthHeader('');
                      }
                    }}
                    className="accent-accent"
                  />
                  <span className={`text-sm ${option.color}`}>{option.label}</span>
                </label>
              ))}
            </div>
          </FormField>

          {triggersTo === 'webhook' && (
            <>
              <FormField label={t('webhookUrl')} required error={getFieldError('webhookUrl')} hint={t('webhookUrlHint')}>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder={t('webhookUrlPlaceholder')}
                  pattern="^https?://.+"
                  required
                />
              </FormField>

              <FormField label={t('webhookAuthHeader')} error={getFieldError('webhookAuthHeader')}>
                <Input
                  value={webhookAuthHeader}
                  onChange={(e) => setWebhookAuthHeader(e.target.value)}
                  placeholder={t('webhookAuthHeaderPlaceholder')}
                />
                {agent.hasWebhookAuth && (
                  <p className="text-xs text-muted mt-1">{t('webhookAuthConfigured')}</p>
                )}
              </FormField>
            </>
          )}

          <FormField label="Allow All Triggers" error={getFieldError('triggersAllowAll')}>
            <Toggle
              checked={triggersAllowAll}
              onChange={setTriggersAllowAll}
              label="Accept all triggers from connected devices"
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
              disabled={loading || !name.trim() || !prompt.trim()}
              loading={loading}
              className="flex-1"
            >
              {t('save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
