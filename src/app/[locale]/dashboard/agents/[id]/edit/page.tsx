'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import apiService from '@/services/api';
import { AgentResponse, AgentType } from '@/types';
import { useAgentDetailQuery, useAgentCacheActions } from '@/queries/agents';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { getErrorMessage } from '@/utils/error';
import DeleteAgentModal from '@/components/agents/DeleteAgentModal';
import AgentForm from '@/components/agents/AgentForm';
import SecretKeyReveal from '@/components/connectors/SecretKeyReveal';
import { Placeholder } from '@/components/ui/Placeholder';

export default function EditAgentPage() {
  const t = useTranslations('Agents');
  const tCommon = useTranslations('Common');
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const { data: agent, isPending: dataLoading, error: queryError } = useAgentDetailQuery(agentId);
  const { invalidateAll } = useAgentCacheActions();
  const dataError = queryError ? getErrorMessage(queryError, 'Failed to load data') : null;
  useSetBreadcrumb(agentId, agent?.name);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [agentType, setAgentType] = useState<AgentType>('CENTRIFUGO');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookAuthHeader, setWebhookAuthHeader] = useState('');

  // Seed the form whenever fresh agent data arrives.
  const [seededFrom, setSeededFrom] = useState<AgentResponse | null>(null);
  if (agent && agent !== seededFrom) {
    setSeededFrom(agent);
    setName(agent.name);
    setDescription(agent.description ?? '');
    setPrompt(agent.instructions);
    setAgentType(agent.type);
    setWebhookUrl(agent.webhookUrl ?? '');
  }

  // Regenerate key state
  const [regeneratedKey, setRegeneratedKey] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm<AgentResponse>({
    onSuccess: () => {
      invalidateAll();
      router.push('/dashboard/agents');
    },
    defaultError: 'Failed to update agent configuration',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.updateAgent(agentId, {
        name,
        description: description || null,
        instructions: prompt,
        type: agentType,
        webhookUrl: agentType === 'WEBHOOK' ? webhookUrl : null,
        webhookAuthHeader: agentType === 'WEBHOOK' && webhookAuthHeader ? webhookAuthHeader : null,
      })
    );

  const handleRegenerateKey = async () => {
    setRegenerating(true);
    setRegenerateError(null);
    try {
      const result = await apiService.regenerateAgentKey(agentId);
      setRegeneratedKey(result.fullKey);
    } catch (err) {
      setRegenerateError(getErrorMessage(err, t('regenerateKeyFailed')));
    } finally {
      setRegenerating(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <Placeholder>{t('loadingAgents')}</Placeholder>
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

      {/* Regenerate Key Section */}
      <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('agentKey')}</h2>
          <p className="text-sm text-muted mt-1">{t('regenerateKeyDescription')}</p>
        </div>

        {regeneratedKey ? (
          <SecretKeyReveal
            secret={regeneratedKey}
            label={t('agentKey')}
            onDone={() => setRegeneratedKey(null)}
          />
        ) : (
          <>
            {regenerateError && <ErrorAlert>{regenerateError}</ErrorAlert>}
            <Button
              variant="warning"
              onClick={handleRegenerateKey}
              loading={regenerating}
              disabled={regenerating}
            >
              {t('regenerateKey')}
            </Button>
          </>
        )}
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
            webhookAuthConfigured={agent.hasWebhookAuth}
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/dashboard/agents')}
              disabled={loading}
              className="flex-1"
            >
              {tCommon('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              loading={loading}
              className="flex-1"
            >
              {tCommon('save')}
            </Button>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-lg font-medium text-sm border border-error text-error hover:bg-error/10 transition-colors"
            >
              {t('deleteAgentTitle')}
            </button>
          </div>
        </form>
      </div>

      {showDeleteModal && (
        <DeleteAgentModal
          agent={agent}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={() => router.push('/dashboard/agents')}
        />
      )}
    </div>
  );
}
