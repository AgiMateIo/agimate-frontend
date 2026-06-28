'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeftIcon, ClipboardDocumentIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import apiService from '@/services/api';
import { AgentResponse, AgentType } from '@/types';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Alert } from '@/components/ui/Alert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { useClipboard } from '@/hooks/useClipboard';
import { getErrorMessage } from '@/utils/error';
import DeleteAgentModal from '@/components/agents/DeleteAgentModal';
import AgentForm from '@/components/agents/AgentForm';

export default function EditAgentPage() {
  const t = useTranslations('Agents');
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<AgentResponse | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [agentType, setAgentType] = useState<AgentType>('CENTRIFUGO');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookAuthHeader, setWebhookAuthHeader] = useState('');

  // Regenerate key state
  const [regeneratedKey, setRegeneratedKey] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const { copied, copy } = useClipboard();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setDataError(null);
      const agentData = await apiService.getAgent(agentId);
      setAgent(agentData);
      setName(agentData.name);
      setDescription(agentData.description ?? '');
      setPrompt(agentData.instructions);
      setAgentType(agentData.type);
      setWebhookUrl(agentData.webhookUrl ?? '');
    } catch (err) {
      setDataError(getErrorMessage(err, 'Failed to load data'));
    } finally {
      setDataLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm<AgentResponse>({
    onSuccess: () => {
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
      setRegenerateError(getErrorMessage(err, 'Failed to regenerate key'));
    } finally {
      setRegenerating(false);
    }
  };

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

      {/* Regenerate Key Section */}
      <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Agent Key</h2>
        <p className="text-sm text-muted">
          If your key has been compromised, you can regenerate it. The old key will be invalidated immediately.
        </p>

        {regeneratedKey && (
          <>
            <Alert variant="warning">
              Save this key now! It will only be shown once.
            </Alert>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-surface-secondary border border-border/50 rounded-lg px-4 py-2.5 text-sm font-mono text-foreground break-all">
                {regeneratedKey}
              </code>
              <button
                onClick={() => copy(regeneratedKey)}
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
          </>
        )}

        {regenerateError && <ErrorAlert>{regenerateError}</ErrorAlert>}

        {!regeneratedKey && (
          <Button
            variant="warning"
            onClick={handleRegenerateKey}
            loading={regenerating}
            disabled={regenerating}
          >
            Regenerate Key
          </Button>
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
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              loading={loading}
              className="flex-1"
            >
              {t('save')}
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
