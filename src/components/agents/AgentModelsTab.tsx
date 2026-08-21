'use client';

import { useState, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQueries } from '@tanstack/react-query';
import { AgentLlmPurpose, AgentLlmResponse, AgentType, LlmProviderType } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { isExternalAgentType } from '@/utils/agent';
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
import { Placeholder } from '@/components/ui/Placeholder';
import {
  LLM_PURPOSES,
  purposeLabelKey,
  purposeRequirement,
  purposeRequirementLabelKey,
  purposeState,
} from '@/components/llm-providers/llmPurpose';

interface AgentModelsTabProps {
  agentId: string;
  // An external agent thinks on its own model, so nothing here is "the agent's
  // model" — bindings only cover the tool tasks the platform runs itself.
  agentType?: AgentType;
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
export default function AgentModelsTab({ agentId, agentType }: AgentModelsTabProps) {
  const t = useTranslations('Agents');
  const tu = useTranslations('LlmUsage');
  // Purpose names and their model requirements are LLM-domain vocabulary shared
  // with the provider screens — they live in the LlmProviders namespace.
  const tp = useTranslations('LlmProviders');
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
  const registryOf = (providerId: string) => modelsQueries[boundProviderIds.indexOf(providerId)]?.data;
  const registryRow = (binding: AgentLlmResponse) => {
    if (!binding.llmProviderId) return undefined;
    const registry = registryOf(binding.llmProviderId);
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
    return <Placeholder>{t('loadingBindings')}</Placeholder>;
  }

  const providerById = (id: string) => allProviders.find((p) => p.id === id);
  // `source` is the only reliable marker — a synthetic platform row is
  // indistinguishable from a real one by its provider name or model.
  const byPurpose = new Map(
    bindings.filter((b) => b.source === 'USER').map((b) => [b.purpose, b] as const)
  );
  const platformRow = bindings.find((b) => b.source === 'PLATFORM');
  const noProviders = bindableProviders.length === 0;

  // A purpose the agent has not bound is served by the purpose list of the
  // provider carrying its CHAT binding — and by nothing else, since the backend
  // no longer picks a model by capability. Show what that resolves to, so an
  // unbound row is not read as "the platform will figure it out".
  const chatBinding = byPurpose.get('CHAT');
  const chatProvider = chatBinding?.llmProviderId ? providerById(chatBinding.llmProviderId) : undefined;
  // First model of the list the provider would actually reach for: UNAVAILABLE
  // ones are skipped in favour of the next. Without a registry to check against,
  // the head of the list is the best guess.
  const inheritedModel = (purpose: AgentLlmPurpose): string | undefined => {
    const list = chatProvider?.purposePriority?.[purpose];
    if (!list || list.length === 0) return undefined;
    const registry = chatProvider ? registryOf(chatProvider.id) : undefined;
    if (!registry || registry.length === 0) return list[0];
    return list.find((m) => registry.find((r) => r.model === m)?.status !== 'UNAVAILABLE') ?? list[0];
  };

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
        {/* For an external agent the chat model is the client's; what is bound
            here only drives the tool tasks the platform executes itself. */}
        <p className="text-sm text-muted">
          {agentType && isExternalAgentType(agentType) ? t('externalPurposeHint') : t('purposeHint')}
        </p>
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
            {LLM_PURPOSES.map((purpose) => {
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
              // Only meaningful for an unbound row, and only once a chat
              // provider exists to inherit from.
              const unbound = !binding && !platform;
              const inheritedState = unbound && chatProvider
                ? purposeState(chatProvider.purposePriority, purpose)
                : 'unset';
              const inherited = inheritedState === 'list' ? inheritedModel(purpose) : undefined;

              return (
                <tr
                  key={purpose}
                  className="border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors"
                >
                  <td className="py-3 px-4 text-sm">
                    {/* Tool purposes stand out; CHAT (the norm) stays neutral. */}
                    <Chip tone={purpose === 'CHAT' ? 'default' : 'accent'}>
                      {tp(purposeLabelKey[purpose])}
                    </Chip>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      {platform ? (
                        <>
                          <Chip strong tone="success" title={t('platformModelHint')}>
                            {t('platformModel')}
                          </Chip>
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
                          <Chip strong tone="accent">{providerTypeBadge[binding.providerType]}</Chip>
                          <span className="text-foreground">{binding.llmProviderName}</span>
                          {provider && !provider.enabled && (
                            <Chip icon={ExclamationTriangleIcon} tone="warning" title={t('providerDisabledHint')}>
                              {t('providerDisabled')}
                            </Chip>
                          )}
                        </>
                      ) : inherited ? (
                        <span className="text-muted" title={t('inheritedModelHint')}>
                          {t('inheritedFromProvider', { provider: chatProvider!.name })}
                        </span>
                      ) : inheritedState === 'off' ? (
                        <Chip icon={ExclamationTriangleIcon} tone="warning" title={t('purposeOffHint', { provider: chatProvider!.name })}>
                          {t('purposeOff')}
                        </Chip>
                      ) : (
                        <span className="text-muted" title={t('unsetModelHint')}>
                          {t('unsetModel')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-foreground font-mono">
                    <div className="flex items-center gap-2 flex-wrap">
                      {binding?.model ?? platform?.model ?? (
                        inherited
                          ? <span className="text-muted">{inherited}</span>
                          : <span className="text-muted font-sans">—</span>
                      )}
                      {binding && isModelUnfit(binding) && (
                        <Chip icon={ExclamationTriangleIcon} tone="warning" title={tp(purposeRequirementLabelKey[binding.purpose])}>
                          {t('modelUnfit')}
                        </Chip>
                      )}
                      {binding && isModelUnlisted(binding) && (
                        <Chip icon={ExclamationTriangleIcon} tone="warning" title={t('modelUnlistedHint')}>
                          {t('modelUnlisted')}
                        </Chip>
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
