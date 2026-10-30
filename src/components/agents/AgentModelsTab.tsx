'use client';

import { useState, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQueries } from '@tanstack/react-query';
import { AgentLlmBindingRequest, AgentLlmPurpose, AgentLlmResponse, AgentType } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { isExternalAgentType } from '@/utils/agent';
import { localeMap } from '@/i18n/routing';
import { agentLlmsOptions, useAgentCacheActions } from '@/queries/agents';
import {
  llmProviderModelsOptions,
  llmProvidersListOptions,
  useLlmUsageQuery,
} from '@/queries/llm-providers';
import apiService from '@/services/api';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Link } from '@/i18n/navigation';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Chip } from '@/components/ui/Chip';
import AgentLlmRowEditor from './AgentLlmRowEditor';
import DeleteAgentLlmModal from './DeleteAgentLlmModal';
import { matchCapabilityFilter } from '@/components/llm-providers/modelRegistry';
import { Placeholder } from '@/components/ui/Placeholder';
import {
  LLM_PURPOSES,
  MAX_PURPOSE_CHAIN,
  isTextPurpose,
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

// A real binding row: only the synthetic PLATFORM record lacks a provider id.
type UserBinding = AgentLlmResponse & { llmProviderId: string };

const toPair = (binding: UserBinding): AgentLlmBindingRequest => ({
  llmProviderId: binding.llmProviderId,
  model: binding.model,
});

// One card per purpose, holding that purpose's ordered chain of bindings. The
// server picks the first link it can use on every call and says nothing about
// which one that was, so the card shows the order of attempts, never "active".
// An empty chain still resolves through the chat provider's priority list (or,
// for the last purpose, the chat model itself) — that is what the empty state
// spells out. A zero-binding agent gets a single synthetic PLATFORM row.
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

  // A link being replaced (index) or appended (index: null).
  const [editing, setEditing] = useState<{ purpose: AgentLlmPurpose; index: number | null } | null>(null);
  const [deleting, setDeleting] = useState<UserBinding | null>(null);
  // Reordering saves at once (there is no per-link endpoint), and the lock keeps
  // rapid clicks from racing whole-chain PUTs.
  const [savingPurpose, setSavingPurpose] = useState<AgentLlmPurpose | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    setActionError(null);
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
  // Served order is the chain order (purpose, then priority) — do not re-sort.
  const userBindings = bindings.filter(
    (b): b is UserBinding => b.source === 'USER' && !!b.llmProviderId
  );
  const chains = new Map<AgentLlmPurpose, UserBinding[]>();
  for (const binding of userBindings) {
    const list = chains.get(binding.purpose);
    if (list) list.push(binding);
    else chains.set(binding.purpose, [binding]);
  }
  const chainOf = (purpose: AgentLlmPurpose) => chains.get(purpose) ?? [];

  // Moving a link rewrites the whole chain in the new order — the only way to
  // express "this one first" through the API.
  const moveLink = async (purpose: AgentLlmPurpose, index: number, delta: number) => {
    const chain = chainOf(purpose);
    const target = index + delta;
    if (target < 0 || target >= chain.length) return;
    const reordered = chain.map(toPair);
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setActionError(null);
    setSavingPurpose(purpose);
    try {
      await apiService.updateAgentLlm(agentId, purpose, { bindings: reordered });
      invalidateAgentLlms(agentId);
    } catch (err) {
      setActionError(getErrorMessage(err, t('saveOrderFailed')));
    } finally {
      setSavingPurpose(null);
    }
  };

  // `source` is the only reliable marker — a synthetic platform row is
  // indistinguishable from a real one by its provider name or model. It only
  // exists while the agent has no bindings at all.
  const platformRow = bindings.find((b) => b.source === 'PLATFORM');
  const noProviders = bindableProviders.length === 0;

  // An unbound purpose resolves through the priority list of the provider that
  // carries the first link of the agent's CHAT chain — and by nothing else,
  // since the backend does not pick a model by capability.
  const chatBinding = chainOf('CHAT')[0];
  const chatProvider = chatBinding ? providerById(chatBinding.llmProviderId) : undefined;
  const chatModel = chatBinding?.model ?? platformRow?.model;
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
        onClick={() => setEditing({ purpose, index: null })}
        className="text-sm text-accent hover:text-accent/80 transition-colors whitespace-nowrap"
      >
        {label}
      </button>
    );

  // What the chain leaves behind when this link goes: the rest of the purpose's
  // chain, sent back as one PUT. Matched by provider + model (unique within a
  // purpose by the backend's own rule), so a background refetch cannot strand
  // the modal on stale row objects.
  const deleteRemaining = deleting
    ? chainOf(deleting.purpose)
        .filter((b) => !(b.llmProviderId === deleting.llmProviderId && b.model === deleting.model))
        .map(toPair)
    : [];

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

      {actionError && <ErrorAlert>{actionError}</ErrorAlert>}

      <div className="space-y-3">
        {LLM_PURPOSES.map((purpose) => {
          const chain = chainOf(purpose);
          // The platform fallback is reported on its own purpose (CHAT in
          // practice) and only while the agent has no bindings at all.
          const platform = chain.length === 0 && platformRow?.purpose === purpose ? platformRow : undefined;
          const isEditing = editing?.purpose === purpose;
          const busy = savingPurpose === purpose;
          const unbound = chain.length === 0 && !platform;
          // Only meaningful for an unbound card, and only once a chat provider
          // exists to inherit from.
          const inheritedState = unbound && chatProvider
            ? purposeState(chatProvider.purposePriority, purpose)
            : 'unset';
          const inherited = inheritedState === 'list' ? inheritedModel(purpose) : undefined;
          // ROUTINE is the one purpose that never fails: without a model of
          // its own or on the chat provider's list it runs on the chat model.
          const onChatModel = unbound && purpose === 'ROUTINE' && !inherited;

          return (
            <section key={purpose} className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {/* Tool purposes stand out; the text ones (the norm) stay neutral. */}
                  <Chip tone={isTextPurpose(purpose) ? 'default' : 'accent'}>
                    {tp(purposeLabelKey[purpose])}
                  </Chip>
                  {chain.length > 0 ? (
                    <span className="text-xs text-muted" title={t('chainOrderHint')}>
                      {t('chainCount', { count: chain.length, max: MAX_PURPOSE_CHAIN })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">{tp(purposeRequirementLabelKey[purpose])}</span>
                  )}
                </div>
                {!isEditing && chain.length > 0 && (
                  chain.length >= MAX_PURPOSE_CHAIN ? (
                    <span className="text-xs text-muted">{t('chainFull', { max: MAX_PURPOSE_CHAIN })}</span>
                  ) : !noProviders ? (
                    <button
                      type="button"
                      onClick={() => setEditing({ purpose, index: null })}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors disabled:opacity-40"
                    >
                      <PlusIcon className="h-4 w-4" />
                      {t('addModel')}
                    </button>
                  ) : null
                )}
              </div>

              {chain.length > 0 && (
                <ol className="divide-y divide-border/50 border border-border rounded-lg bg-surface-secondary">
                  {chain.map((binding, index) => {
                    const provider = providerById(binding.llmProviderId);
                    return (
                      <li
                        key={`${binding.llmProviderId}:${binding.model}`}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <span
                          className="w-4 shrink-0 text-xs text-muted tabular-nums"
                          title={t('chainOrderHint')}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1 grid gap-x-4 gap-y-1 md:grid-cols-2">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-sm text-foreground truncate">{binding.llmProviderName}</span>
                            {provider && !provider.enabled && (
                              <Chip icon={ExclamationTriangleIcon} tone="warning" title={t('providerDisabledHint')}>
                                {t('providerDisabled')}
                              </Chip>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-sm text-foreground font-mono truncate">{binding.model}</span>
                            {isModelUnfit(binding) && (
                              <Chip
                                icon={ExclamationTriangleIcon}
                                tone="warning"
                                title={tp(purposeRequirementLabelKey[binding.purpose])}
                              >
                                {t('modelUnfit')}
                              </Chip>
                            )}
                            {isModelUnlisted(binding) && (
                              <Chip icon={ExclamationTriangleIcon} tone="warning" title={t('modelUnlistedHint')}>
                                {t('modelUnlisted')}
                              </Chip>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {chain.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => moveLink(purpose, index, -1)}
                                disabled={busy || index === 0}
                                aria-label={t('moveModelUp')}
                                className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors disabled:opacity-30"
                              >
                                <ArrowUpIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveLink(purpose, index, 1)}
                                disabled={busy || index === chain.length - 1}
                                aria-label={t('moveModelDown')}
                                className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors disabled:opacity-30"
                              >
                                <ArrowDownIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditing({ purpose, index })}
                            disabled={busy}
                            aria-label={t('changeModel')}
                            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(binding)}
                            disabled={busy}
                            aria-label={t('deleteModelBinding')}
                            className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              {isEditing ? (
                <AgentLlmRowEditor
                  agentId={agentId}
                  purpose={purpose}
                  chain={chain.map(toPair)}
                  index={editing.index}
                  providers={bindableProviders}
                  onCancel={() => setEditing(null)}
                  onSuccess={handleMutationSuccess}
                />
              ) : chain.length === 0 ? (
                <div className="flex items-center justify-between gap-3 flex-wrap rounded-lg bg-surface-secondary px-3 py-2.5">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
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
                        <span className="text-sm text-foreground font-mono">{platform.model}</span>
                      </>
                    ) : inherited ? (
                      <>
                        <span className="text-sm text-muted" title={t('inheritedModelHint')}>
                          {t('inheritedFromProvider', { provider: chatProvider!.name })}
                        </span>
                        <span className="text-sm text-muted font-mono">{inherited}</span>
                      </>
                    ) : onChatModel ? (
                      <>
                        <span className="text-sm text-muted" title={t('routineOnChatModelHint')}>
                          {t('routineOnChatModel')}
                        </span>
                        {chatModel && <span className="text-sm text-muted font-mono">{chatModel}</span>}
                      </>
                    ) : inheritedState === 'off' ? (
                      <Chip
                        icon={ExclamationTriangleIcon}
                        tone="warning"
                        title={t('purposeOffHint', { provider: chatProvider!.name })}
                      >
                        {t('purposeOff')}
                      </Chip>
                    ) : (
                      <span className="text-sm text-muted" title={t('unsetModelHint')}>
                        {t('unsetModel')}
                      </span>
                    )}
                  </div>
                  {/* The platform row is virtual — PUT on its purpose would be a
                      no-op, so the only move it offers is creating a real link. */}
                  {setModelAction(purpose, platform ? t('chooseOwnModel') : t('setModel'))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {deleting && (
        <DeleteAgentLlmModal
          agentId={agentId}
          binding={deleting}
          remaining={deleteRemaining}
          hasOtherBindings={userBindings.length > 1}
          onClose={() => setDeleting(null)}
          onSuccess={handleMutationSuccess}
        />
      )}
    </div>
  );
}
