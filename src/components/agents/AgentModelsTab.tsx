'use client';

import { useState, useMemo } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQueries } from '@tanstack/react-query';
import {
  AgentLlmBindingRequest,
  AgentLlmPurpose,
  AgentLlmResponse,
  AgentType,
  LlmProviderResponse,
} from '@/types';
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
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MicrophoneIcon,
  PencilIcon,
  PhotoIcon,
  PlusIcon,
  SpeakerWaveIcon,
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

// One face per purpose so the six cards read apart at a glance.
const purposeIcons = {
  CHAT: ChatBubbleLeftRightIcon,
  ROUTINE: ClockIcon,
  IMAGE: PhotoIcon,
  VISION: EyeIcon,
  AUDIO_IN: MicrophoneIcon,
  AUDIO_OUT: SpeakerWaveIcon,
} satisfies Record<AgentLlmPurpose, ComponentType<SVGProps<SVGSVGElement>>>;

// One card per purpose, holding that purpose's ordered chain of bindings. The
// links are drawn as a vertical chain — a filled node for the attempt, hollow
// ones below it for the fallbacks — because the order IS the feature. The server
// picks the first link it can use on every call and says nothing about which one
// that was, so the card shows the order of attempts, never "active". An empty
// chain still resolves through the chat provider's priority list (or, for the
// last purpose, the chat model itself) — that is what the empty state spells
// out. A zero-binding agent gets a single synthetic PLATFORM row.
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

  // An unbound purpose falls back to the purpose lists of the agent's chat
  // providers, in their chain order — the resolver walks the same list, skips a
  // provider with no list or an explicit [], and reads no list of a disabled
  // provider at all.
  const chatProviders = [...new Set(chainOf('CHAT').map((b) => b.llmProviderId))]
    .map((id) => providerById(id))
    .filter((p): p is LlmProviderResponse => !!p && p.enabled);

  // The first listed model the resolver would not skip. A known registry lets a
  // list of dead models fall through to the next provider; an unknown one is no
  // basis for judging, so the head of the list stays the best guess.
  const usableListedModel = (
    provider: LlmProviderResponse,
    purpose: AgentLlmPurpose
  ): string | undefined => {
    const list = provider.purposePriority?.[purpose];
    if (!list || list.length === 0) return undefined;
    const registry = registryOf(provider.id);
    if (!registry || registry.length === 0) return list[0];
    return list.find((m) => registry.find((r) => r.model === m)?.status !== 'UNAVAILABLE');
  };

  const inheritedFrom = (
    purpose: AgentLlmPurpose
  ): { provider: LlmProviderResponse; model: string } | undefined => {
    for (const provider of chatProviders) {
      const model = usableListedModel(provider, purpose);
      if (model) return { provider, model };
    }
    return undefined;
  };

  // ROUTINE's last resort: the chat chain itself, the first link that is not
  // dead. The platform model covers the fully unbound agent.
  const chatModel =
    chainOf('CHAT').find((b) => {
      const provider = providerById(b.llmProviderId);
      return provider?.enabled && !isModelUnlisted(b);
    })?.model ??
    chainOf('CHAT')[0]?.model ??
    platformRow?.model;

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
          // What the purpose would fall back to, walked the way the resolver
          // walks it: the chat providers in chain order, each skipped when it
          // declares no list — or deliberately none.
          const inherited = unbound ? inheritedFrom(purpose) : undefined;
          // ROUTINE is the one purpose that never fails: without a model of its
          // own or in the chat providers' lists it runs on the chat model.
          const onChatModel = unbound && purpose === 'ROUTINE' && !inherited;
          // An explicit [] at one provider only drops that provider from the
          // chain, so it is a warning about the agent's own providers — for
          // media the platform may still serve, and nobody promised it would not.
          const purposeOff =
            unbound &&
            purpose !== 'CHAT' &&
            purpose !== 'ROUTINE' &&
            !inherited &&
            chatProviders.length > 0 &&
            chatProviders.every((p) => purposeState(p.purposePriority, purpose) === 'off');
          // The chain's tail is the "add a fallback" node — no separate button.
          const canAdd = !isEditing && chain.length < MAX_PURPOSE_CHAIN && !noProviders;

          return (
            <section key={purpose} className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {/* Tool purposes stand out; the text ones (the norm) stay neutral. */}
                  <Chip icon={purposeIcons[purpose]} tone={isTextPurpose(purpose) ? 'default' : 'accent'}>
                    {tp(purposeLabelKey[purpose])}
                  </Chip>
                  {chain.length > 0 && (
                    <span className="text-xs text-muted" title={t('chainOrderHint')}>
                      {t('chainCount', { count: chain.length, max: MAX_PURPOSE_CHAIN })}
                    </span>
                  )}
                </div>
                {chain.length >= MAX_PURPOSE_CHAIN && (
                  <span className="text-xs text-muted">{t('chainFull', { max: MAX_PURPOSE_CHAIN })}</span>
                )}
              </div>

              {chain.length > 0 && (
                <ol>
                  {chain.map((binding, index) => {
                    const provider = providerById(binding.llmProviderId);
                    const primary = index === 0;
                    return (
                      <li
                        key={`${binding.llmProviderId}:${binding.model}`}
                        className="group flex gap-3"
                      >
                        {/* The node and the rail below it: the first link is the
                            attempt, every next one a fallback for the one above. */}
                        <div className="flex flex-col items-center">
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] tabular-nums ${
                              primary
                                ? 'bg-accent font-medium text-accent-foreground'
                                : 'border border-border bg-surface text-muted'
                            }`}
                          >
                            {index + 1}
                          </span>
                          {(index < chain.length - 1 || canAdd) && (
                            <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 pb-3">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span
                              className={`truncate font-mono text-sm ${
                                primary ? 'font-medium text-foreground' : 'text-foreground/80'
                              }`}
                            >
                              {binding.model}
                            </span>
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
                          <div className="mt-0.5 flex items-center gap-2 flex-wrap text-xs">
                            <span className="truncate text-foreground/70">{binding.llmProviderName}</span>
                            <span className="text-muted">
                              {primary ? t('chainPrimaryHint') : t('chainFallbackHint')}
                            </span>
                            {provider && !provider.enabled && (
                              <Chip icon={ExclamationTriangleIcon} tone="warning" title={t('providerDisabledHint')}>
                                {t('providerDisabled')}
                              </Chip>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-start gap-0.5 pb-3 pt-0.5 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                          {chain.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => moveLink(purpose, index, -1)}
                                disabled={busy || index === 0}
                                aria-label={t('moveModelUp')}
                                className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-secondary transition-colors disabled:opacity-30"
                              >
                                <ArrowUpIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveLink(purpose, index, 1)}
                                disabled={busy || index === chain.length - 1}
                                aria-label={t('moveModelDown')}
                                className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-secondary transition-colors disabled:opacity-30"
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
                            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
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

                  {canAdd && (
                    <li className="flex gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted">
                        <PlusIcon className="h-3 w-3" />
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditing({ purpose, index: null })}
                        disabled={busy}
                        className="self-start text-sm text-accent hover:text-accent/80 transition-colors disabled:opacity-40"
                      >
                        {t('addFallbackModel')}
                      </button>
                    </li>
                  )}
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
                <div className="flex items-center gap-3">
                  <span
                    className="h-5 w-5 shrink-0 rounded-full border border-dashed border-border"
                    aria-hidden
                  />
                  <div className="flex min-w-0 flex-1 items-center gap-2 flex-wrap">
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
                          {t('inheritedFromProvider', { provider: inherited.provider.name })}
                        </span>
                        <span className="text-sm text-muted font-mono">{inherited.model}</span>
                      </>
                    ) : onChatModel ? (
                      <>
                        <span className="text-sm text-muted" title={t('routineOnChatModelHint')}>
                          {t('routineOnChatModel')}
                        </span>
                        {chatModel && <span className="text-sm text-muted font-mono">{chatModel}</span>}
                      </>
                    ) : purposeOff ? (
                      <Chip icon={ExclamationTriangleIcon} tone="warning" title={t('purposeOffHint')}>
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
