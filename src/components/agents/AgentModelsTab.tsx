'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgentLlmResponse, LlmProviderResponse, LlmProviderType } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { PlusIcon, TrashIcon, PencilIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import AddAgentLlmModal from './AddAgentLlmModal';
import EditAgentLlmModal from './EditAgentLlmModal';
import DeleteAgentLlmModal from './DeleteAgentLlmModal';

interface AgentModelsTabProps {
  agentId: string;
}

const providerTypeBadge: Record<LlmProviderType, string> = {
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic',
  GEMINI: 'Gemini',
  OPENAI_COMPATIBLE: 'OpenAI-compatible',
};

export default function AgentModelsTab({ agentId }: AgentModelsTabProps) {
  const t = useTranslations('Agents');

  const [bindings, setBindings] = useState<AgentLlmResponse[]>([]);
  const [providers, setProviders] = useState<LlmProviderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AgentLlmResponse | null>(null);
  const [deleting, setDeleting] = useState<AgentLlmResponse | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [bindingsData, providersData] = await Promise.all([
        apiService.getAgentLlms(agentId),
        apiService.getLlmProviders(),
      ]);
      setBindings(bindingsData);
      setProviders(providersData);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load model bindings'));
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMutationSuccess = () => {
    setShowAdd(false);
    setEditing(null);
    setDeleting(null);
    fetchData();
  };

  if (error) {
    return <ErrorAlert>{error}</ErrorAlert>;
  }

  if (loading) {
    return <div className="text-center py-12 text-muted">{t('loadingBindings')}</div>;
  }

  const providerById = (id: string) => providers.find(p => p.id === id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/llm-providers"
          className="text-sm text-accent hover:text-accent/80 transition-colors"
        >
          {t('manageProviders')} →
        </Link>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          {t('addModelBinding')}
        </Button>
      </div>

      {bindings.length === 0 ? (
        <div className="text-center py-12 text-muted">{t('noBindings')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('bindingLabel')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('provider')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('model')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted"></th>
              </tr>
            </thead>
            <tbody>
              {bindings.map((binding) => {
                const provider = providerById(binding.llmProviderId);
                const providerDisabled = provider ? !provider.enabled : false;
                return (
                  <tr key={binding.name} className="border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-foreground font-mono">
                      {binding.name}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                          {providerTypeBadge[binding.providerType]}
                        </span>
                        <span className="text-foreground">{binding.llmProviderName}</span>
                        {providerDisabled && (
                          <span
                            title={t('providerDisabledHint')}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning"
                          >
                            <ExclamationTriangleIcon className="h-3 w-3" />
                            {t('providerDisabled')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground font-mono">
                      {binding.model}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditing(binding)}
                          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(binding)}
                          className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddAgentLlmModal
          agentId={agentId}
          providers={providers}
          existingNames={new Set(bindings.map(b => b.name))}
          onProvidersUpdate={setProviders}
          onClose={() => setShowAdd(false)}
          onSuccess={handleMutationSuccess}
        />
      )}

      {editing && (
        <EditAgentLlmModal
          agentId={agentId}
          binding={editing}
          providers={providers}
          onProvidersUpdate={setProviders}
          onClose={() => setEditing(null)}
          onSuccess={handleMutationSuccess}
        />
      )}

      {deleting && (
        <DeleteAgentLlmModal
          agentId={agentId}
          binding={deleting}
          onClose={() => setDeleting(null)}
          onSuccess={handleMutationSuccess}
        />
      )}
    </div>
  );
}
