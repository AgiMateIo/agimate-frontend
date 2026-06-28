'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeftIcon, ClipboardDocumentIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import apiService from '@/services/api';
import { AgentCreatedResponse, AgentType } from '@/types';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { useClipboard } from '@/hooks/useClipboard';
import { getAgentAvatarUrl } from '@/utils/avatar';
import AgentForm from '@/components/agents/AgentForm';

export default function CreateAgentPage() {
  const t = useTranslations('Agents');
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get('teamId');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [agentType, setAgentType] = useState<AgentType>('CENTRIFUGO');
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

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.createAgent({
        name,
        description: description || undefined,
        instructions: prompt || undefined,
        type: agentType,
        webhookUrl: agentType === 'WEBHOOK' ? webhookUrl : null,
        webhookAuthHeader: agentType === 'WEBHOOK' && webhookAuthHeader ? webhookAuthHeader : null,
        agenticTeamId: teamId || null,
      })
    );

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
          <AgentForm
            name={name}
            onNameChange={setName}
            description={description}
            onDescriptionChange={setDescription}
            prompt={prompt}
            onPromptChange={setPrompt}
            agentType={agentType}
            onAgentTypeChange={setAgentType}
            webhookUrl={webhookUrl}
            onWebhookUrlChange={setWebhookUrl}
            webhookAuthHeader={webhookAuthHeader}
            onWebhookAuthHeaderChange={setWebhookAuthHeader}
            fieldErrors={fieldErrors}
            error={error}
          />

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
              disabled={loading || !name.trim()}
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
