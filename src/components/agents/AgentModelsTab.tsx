'use client';

import { useState, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQueries } from '@tanstack/react-query';
import { AgentLlmPurpose, AgentLlmResponse, LlmProviderType } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { localeMap } from '@/i18n/routing';
import { agentLlmsOptions, useAgentCacheActions } from '@/queries/agents';
import {
  llmProviderModelsOptions,
  llmProvidersListOptions,
  useLlmUsageQuery,
} from '@/queries/llm-providers';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Link } from '@/i18n/navigation';
import { TrashIcon, PencilIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Chip } from '@/components/ui/Chip';
import AgentLlmRowEditor from './AgentLlmRowEditor';
import DeleteAgentLlmModal from './DeleteAgentLlmModal';
import { matchCapabilityFilter } from '@/components/llm-providers/modelRegistry';
import {
  AGENT_LLM_PURPOSES,
  purposeLabelKey,
  purposeRequirement,
  purposeRequirementLabelKey,
} from './agentLlmPurpose';

interface AgentModelsTabProps {
  agentId: string;
}

const providerTypeBadge: Record<LlmProviderType, string> = {
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic',
  GEMINI: 'Gemini',
  OPENAI_COMPATIBLE: 'OpenAI-compatible',
};

// One row per purpose — the purpose IS the binding's identity, so the table is a
// fixed list of the five purposes rather than of arbitrary rows. Filling a row
// creates the binding, editing replaces it, clearing it hands the purpose back to
// the backend's auto-pick (or, for the last one, to the platform fallback).
export default function AgentModelsTab({ agentId }: AgentModelsTabProps) {
  const t = useTranslations('Agents');
  const tu = useTranslations('LlmUsage');
  const locale = useLocale();
  const bcp47 = localeMap[locale];

  // Free-tier balance for the synthetic platform row — supplementary, so a
  // failed/absent usage response simply hides the remaining-tokens hint.
  const { data: usage } = useLlmUsageQuery();
  const platformDay = usage
    ?.find((u) => u.source === 'PLATFORM')
    ?.windows.find((w) => w.window === 'DAY');

  const [{ data: bindings, isPending: bindingsPending, error: bindingsError },
         { data: allProviders, isPending: providersPending, error: providersError }] = useQueries({
    queries: [agentLlmsOptions(agentId), llmProvidersListOptions()],
  });
  const { invalidateAgentLlms } = useAgentCacheActions();

  const [editing, setEditing] = useState<AgentLlmPurpose | null>(null);
  const [deleting, setDeleting] = useState<AgentLlmResponse | null>(null);

  // The platform row only shows up for ADMINs and cannot be bound to an agent
  // (POST/PUT with its id give a bare 404) — keep it out of the editor.
  const bindableProviders = useMemo(
    () => (allProviders ?? []).filter((p) => !p.platform),
    [allProviders]
  );

  // Advisory availability check: for each bound provider, look the binding's
  // model up in that provider's registry. UNAVAILABLE (or missing from a
  // non-empty registry) → the provider no longer lists it, calls may fail.
  const boundProviderIds = useMemo(
    () => [...new Set((bindings ?? []).map((b) => b.llmProviderId).filter((id): id is string => !!id))],
    [bindings]
  );
  const modelsQueries = useQueries({
    queries: boundProviderIds.map((id) => ({ ...llmProviderModelsOptions(id), staleTime: 30_000 })),
  });
  const registryRow = (binding: AgentLlmResponse) => {
    if (!binding.llmProviderId) return undefined;
    const registry = modelsQueries[boundProviderIds.indexOf(binding.llmProviderId)]?.data;
    // An empty registry means models were never refreshed — nothing to judge by.
    if (!registry || registry.length === 0) return undefined;
    return { registry, row: registry.find((m) => m.model === binding.model) };
  };
  const isModelUnlisted = (binding: AgentLlmResponse): boolean => {
    const found = registryRow(binding);
    return !!found && (!found.row || found.row.status === 'UNAVAILABLE');
  };
  // A model bound before the purpose gained a requirement — or one whose metadata
  // changed since — can sit in a purpose it cannot serve. Only flag the media
  // purposes,
  // whose demand is hard; CHAT's tool support is advisory.
  const isModelUnfit = (binding: AgentLlmResponse): boolean => {
    const requirement = purposeRequirement[binding.purpose];
    if (!requirement.hard) return false;
    const found = registryRow(binding);
    return !!found?.row && matchCapabilityFilter(found.row, requirement.filter) === 'excluded';
  };

  const handleMutationSuccess = () => {
    setEditing(null);
    setDeleting(null);
    invalidateAgentLlms(agentId);
  };

  const error = bindingsError ?? providersError;
  if (error) {
    return <ErrorAlert>{getErrorMessage(error, 'Failed to load model bindings')}</ErrorAlert>;
  }

  if (bindingsPending || providersPending || !bindings || !allProviders) {
    return <div className="text-center py-12 text-muted">{t('loadingBindings')}</div>;
  }

  const providerById = (id: string) => allProviders.find((p) => p.id === id);
  // `source` is the only reliable marker — a synthetic platform row is
  // indistinguishable from a real one by its provider name or model.
  const byPurpose = new Map(
    bindings.filter((b) => b.source === 'USER').map((b) => [b.purpose, b] as const)
  );
  const platformRow = bindings.find((b) => b.source === 'PLATFORM');
  const noProviders = bindableProviders.length === 0;

  // Without a provider of their own there is nothing to pick a model from, so
  // the call to action is the key, not the model.
  const setModelAction = (purpose: AgentLlmPurpose, label: string) =>
    noProviders ? (
      <Link
        href="/dashboard/llm-providers"
        className="text-sm text-accent hover:text-accent/80 transition-colors whitespace-nowrap"
      >
        {tu('connectOwnKey')} →
      </Link>
    ) : (
      <button
        onClick={() => setEditing(purpose)}
        className="text-sm text-accent hover:text-accent/80 transition-colors whitespace-nowrap"
      >
        {label}
      </button>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted">{t('purposeHint')}</p>
        <Link
          href="/dashboard/llm-providers"
          className="text-sm text-accent hover:text-accent/80 transition-colors whitespace-nowrap"
        >
          {t('manageProviders')} →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('purpose')}</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('provider')}</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">{t('model')}</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted"></th>
            </tr>
          </thead>
          <tbody>
            {AGENT_LLM_PURPOSES.map((purpose) => {
              if (editing === purpose) {
                return (
                  <tr key={purpose} className="border-b border-border last:border-b-0">
                    <td colSpan={4} className="p-0">
                      <AgentLlmRowEditor
                        agentId={agentId}
                        purpose={purpose}
                        binding={byPurpose.get(purpose)}
                        providers={bindableProviders}
                        onCancel={() => setEditing(null)}
                        onSuccess={handleMutationSuccess}
                      />
                    </td>
                  </tr>
                );
              }

              const binding = byPurpose.get(purpose);
              // The platform fallback is reported on its own purpose (CHAT in
              // practice) and only while the agent has no bindings at all.
              const platform = !binding && platformRow?.purpose === purpose ? platformRow : undefined;
              const provider = binding?.llmProviderId ? providerById(binding.llmProviderId) : undefined;

              return (
                <tr
                  key={purpose}
                  className="border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors"
                >
                  <td className="py-3 px-4 text-sm">
                    {/* Tool purposes stand out; CHAT (the norm) stays neutral. */}
                    <Chip tone={purpose === 'CHAT' ? 'default' : 'accent'}>
                      {t(purposeLabelKey[purpose])}
                    </Chip>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      {platform ? (
                        <>
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
                        </>
                      ) : binding ? (
                        <>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                            {providerTypeBadge[binding.providerType]}
                          </span>
                          <span className="text-foreground">{binding.llmProviderName}</span>
                          {provider && !provider.enabled && (
                            <span
                              title={t('providerDisabledHint')}
                              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning"
                            >
                              <ExclamationTriangleIcon className="h-3 w-3" />
                              {t('providerDisabled')}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted" title={t('autoModelHint')}>
                          {t('autoModel')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-foreground font-mono">
                    <div className="flex items-center gap-2 flex-wrap">
                      {binding?.model ?? platform?.model ?? <span className="text-muted font-sans">—</span>}
                      {binding && isModelUnfit(binding) && (
                        <span
                          title={t(purposeRequirementLabelKey[binding.purpose])}
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning font-sans"
                        >
                          <ExclamationTriangleIcon className="h-3 w-3" />
                          {t('modelUnfit')}
                        </span>
                      )}
                      {binding && isModelUnlisted(binding) && (
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
                    {binding ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditing(purpose)}
                          aria-label={t('changeModel')}
                          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(binding)}
                          aria-label={t('deleteModelBinding')}
                          className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      // The platform row is virtual — PUT/DELETE on its purpose 404,
                      // so the only move it offers is creating a real binding.
                      setModelAction(purpose, platform ? t('chooseOwnModel') : t('setModel'))
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {deleting && (
        <DeleteAgentLlmModal
          agentId={agentId}
          binding={deleting}
          isLastBinding={byPurpose.size === 1}
          onClose={() => setDeleting(null)}
          onSuccess={handleMutationSuccess}
        />
      )}
    </div>
  );
}
