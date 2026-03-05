'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeftIcon, ClipboardDocumentIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import apiService from '@/services/api';
import { AgentCreatedResponse, TriggerDestination } from '@/types';
import { Button } from '@/components/ui/Button';
import { FormField, TextArea, Input } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Alert } from '@/components/ui/Alert';
import { Toggle } from '@/components/ui/Toggle';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { useClipboard } from '@/hooks/useClipboard';
import { getAgentAvatarUrl } from '@/utils/avatar';

export default function CreateAgentPage() {
  const t = useTranslations('Agents');
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get('teamId');

  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [triggersTo, setTriggersTo] = useState<TriggerDestination>('centrifugo');
  const [triggersAllowAll, setTriggersAllowAll] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookAuthHeader, setWebhookAuthHeader] = useState('');
  const [createdResult, setCreatedResult] = useState<AgentCreatedResponse | null>(null);
  const { copied, copy } = useClipboard();

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm<AgentCreatedResponse>({
    onSuccess: (result) => {
      setCreatedResult(result);
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
      apiService.createAgent({
        name,
        prompt,
        triggersAllowAll,
        triggersTo,
        webhookUrl: triggersTo === 'webhook' ? webhookUrl : null,
        webhookAuthHeader: triggersTo === 'webhook' && webhookAuthHeader ? webhookAuthHeader : null,
        agenticTeamPubId: teamId || null,
      })
    );

  const triggerDestinationOptions: { value: TriggerDestination; label: string; color: string }[] = [
    { value: 'centrifugo', label: 'Centrifugo (Real-time)', color: 'text-accent' },
    { value: 'webhook', label: 'Webhook', color: 'text-success' },
    { value: 'ignore', label: 'Ignore', color: 'text-muted' },
  ];

  const backPath = teamId ? `/dashboard/agentic-teams/${teamId}/agents` : '/dashboard/agents';

  // Show the created key
  if (createdResult) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push(backPath)}
          className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="text-sm">{t('backToAgents')}</span>
        </button>

        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('createAgentTitle')}</h1>
        </div>

        <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <img
              src={getAgentAvatarUrl(createdResult.agent.name)}
              alt={createdResult.agent.name}
              className="w-10 h-10 rounded-lg"
            />
            <h2 className="text-lg font-semibold text-foreground">{createdResult.agent.name}</h2>
          </div>

          <Alert variant="warning">
            Save this key now! It will only be shown once.
          </Alert>

          <FormField label="Agent Key">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-surface-secondary border border-border/50 rounded-lg px-4 py-2.5 text-sm font-mono text-foreground break-all">
                {createdResult.fullKey}
              </code>
              <button
                onClick={() => copy(createdResult.fullKey)}
                className="shrink-0 p-2.5 rounded-lg border border-border/50 hover:bg-surface-secondary transition-colors text-muted hover:text-foreground"
                title="Copy key"
              >
                {copied ? (
                  <ClipboardDocumentCheckIcon className="w-5 h-5 text-success" />
                ) : (
                  <ClipboardDocumentIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </FormField>

          <Button
            onClick={() => router.push(backPath)}
            className="w-full"
          >
            {t('backToAgents')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push(backPath)}
        className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        <span className="text-sm">{t('backToAgents')}</span>
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('createAgentTitle')}</h1>
      </div>

      {/* Form Card */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <form onSubmit={onSubmit} className="space-y-4">
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
              onClick={() => router.push(backPath)}
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
              {t('createAgent')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
