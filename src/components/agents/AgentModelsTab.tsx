'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQueries } from '@tanstack/react-query';
import apiService from '@/services/api';
import { AgentLlmResponse, LlmProviderResponse, LlmProviderType } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { localeMap } from '@/i18n/routing';
import { llmProviderModelsOptions, useLlmUsageQuery } from '@/queries/llm-providers';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { PlusIcon, TrashIcon, PencilIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Chip } from '@/components/ui/Chip';
import AddAgentLlmModal from './AddAgentLlmModal';
import EditAgentLlmModal from './EditAgentLlmModal';
import DeleteAgentLlmModal from './DeleteAgentLlmModal';
import { purposeLabelKey } from './agentLlmPurpose';

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
  const tu = useTranslations('LlmUsage');
  const locale = useLocale();
  const bcp47 = localeMap[locale];

  // Free-tier balance for the synthetic platform binding — supplementary, so a
  // failed/absent usage response simply hides the remaining-tokens hint.
  const { data: usage } = useLlmUsageQuery();
  const platformDay = usage
    ?.find((u) => u.source === 'PLATFORM')
    ?.windows.find((w) => w.window === 'DAY');

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

  // Advisory availability check: for each bound provider, look the binding's
  // model up in that provider's registry. UNAVAILABLE (or missing from a
  // non-empty registry) → the provider no longer lists it, calls may fail.
  const boundProviderIds = useMemo(
    () => [...new Set(bindings.map((b) => b.llmProviderId).filter((id): id is string => !!id))],
    [bindings]
  );
  const modelsQueries = useQueries({
    queries: boundProviderIds.map((id) => ({ ...llmProviderModelsOptions(id), staleTime: 30_000 })),
  });
  const isModelUnlisted = (binding: AgentLlmResponse): boolean => {
    if (!binding.llmProviderId) return false;
    const registry = modelsQueries[boundProviderIds.indexOf(binding.llmProviderId)]?.data;
    // An empty registry means models were never refreshed — nothing to judge by.
    if (!registry || registry.length === 0) return false;
    const row = registry.find((m) => m.model === binding.model);
    return !row || row.status === 'UNAVAILABLE';
  };

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
                <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('purpose')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('provider')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('model')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted"></th>
              </tr>
            </thead>
            <tbody>
              {bindings.map((binding) => {
                const isPlatform = binding.source === 'PLATFORM';
                // Fallback for a backend that predates the purpose field.
                const purpose = binding.purpose ?? 'CHAT';
                const provider = binding.llmProviderId ? providerById(binding.llmProviderId) : undefined;
                const providerDisabled = provider ? !provider.enabled : false;
                return (
                  <tr key={binding.name} className="border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-foreground font-mono">
                      {binding.name}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {/* Tool roles stand out; CHAT (the norm) stays neutral. */}
                      <Chip tone={purpose === 'CHAT' ? 'default' : 'accent'}>
                        {t(purposeLabelKey[purpose])}
                      </Chip>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isPlatform ? (
                          <span className="inline-flex items-center gap-2 flex-wrap">
                            <span
                              title={t('platformModelHint')}
                              className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success"
                            >
                              {t('platformModel')}
                            </span>
                            {platformDay && platformDay.limitTokens !== null && (
                              <span className="text-xs text-muted">
                                {tu('remainingToday', {
                                  remaining: (platformDay.remainingTokens ?? 0).toLocaleString(bcp47),
                                  limit: platformDay.limitTokens.toLocaleString(bcp47),
                                })}
                              </span>
                            )}
                          </span>
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground font-mono">
                      <div className="flex items-center gap-2 flex-wrap">
                        {binding.model}
                        {!isPlatform && isModelUnlisted(binding) && (
                          <span
                            title={t('modelUnlistedHint')}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning font-sans"
                          >
                            <ExclamationTriangleIcon className="h-3 w-3" />
                            {t('modelUnlisted')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {/* PLATFORM is a virtual fallback — not editable/deletable.
                          Offer a shortcut to replace it with the user's own key. */}
                      {isPlatform ? (
                        <button
                          onClick={() => setShowAdd(true)}
                          className="text-sm text-accent hover:text-accent/80 transition-colors whitespace-nowrap"
                        >
                          {tu('connectOwnKey')} →
                        </button>
                      ) : (
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
                      )}
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
          onClose={() => setShowAdd(false)}
          onSuccess={handleMutationSuccess}
        />
      )}

      {editing && (
        <EditAgentLlmModal
          agentId={agentId}
          binding={editing}
          providers={providers}
          isLastChatBinding={
            editing.purpose === 'CHAT' &&
            !bindings.some((b) => b !== editing && b.source === 'USER' && b.purpose === 'CHAT')
          }
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
