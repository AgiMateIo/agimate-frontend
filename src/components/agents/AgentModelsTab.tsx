'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQueries } from '@tanstack/react-query';
import {
  AgentLlmBindingRequest,
  AgentLlmPurpose,
  AgentLlmResponse,
  AgentLlmSource,
  AgentType,
  LlmProviderResponse,
} from '@/types';
import { getErrorMessage } from '@/utils/error';
import { isExternalAgentType } from '@/utils/agent';
import { agentLlmsOptions, useAgentCacheActions } from '@/queries/agents';
import { llmProviderModelsOptions, llmProvidersListOptions } from '@/queries/llm-providers';
import apiService from '@/services/api';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Link } from '@/i18n/navigation';
import { FilterPill } from '@/components/ui/FilterPill';
import DeleteAgentLlmModal from './DeleteAgentLlmModal';
import AgentPurposeCard, { type UserBinding } from './AgentPurposeCard';
import { matchCapabilityFilter } from '@/components/llm-providers/modelRegistry';
import { Placeholder } from '@/components/ui/Placeholder';
import {
  LLM_PURPOSES,
  MAX_PURPOSE_CHAIN,
  purposeRequirement,
  purposeState,
} from '@/components/llm-providers/llmPurpose';

interface AgentModelsTabProps {
  agentId: string;
  // An external agent thinks on its own model, so nothing here is "the agent's
  // model" — bindings only cover the tool tasks the platform runs itself.
  agentType?: AgentType;
  // Which set of chains is in force: the platform's or the agent's own.
  llmSource: AgentLlmSource;
}

const toPair = (binding: UserBinding): AgentLlmBindingRequest => ({
  llmProviderId: binding.llmProviderId,
  model: binding.model,
});

// The models screen's data and actions: one card per purpose (AgentPurposeCard
// draws it), a source switcher, and the chain mutations. The one rule that
// shapes everything here: a PLATFORM agent's own bindings are stored but
// inactive, and the backend refuses a non-empty PUT on them — adding a model
// changes the payer and needs the explicit switch to BYOK.
export default function AgentModelsTab({ agentId, agentType, llmSource }: AgentModelsTabProps) {
  const t = useTranslations('Agents');

  const [{ data: bindings, isPending: bindingsPending, error: bindingsError },
         { data: allProviders, isPending: providersPending, error: providersError }] = useQueries({
    queries: [agentLlmsOptions(agentId), llmProvidersListOptions()],
  });
  const { setAgent, setAgentLlms, invalidateAgentLlms } = useAgentCacheActions();

  // A link being replaced (index) or appended (index: null).
  const [editing, setEditing] = useState<{ purpose: AgentLlmPurpose; index: number | null } | null>(null);
  const [deleting, setDeleting] = useState<UserBinding | null>(null);
  // Reordering saves at once (there is no per-link endpoint), and the lock keeps
  // rapid clicks from racing whole-chain PUTs.
  const [savingPurpose, setSavingPurpose] = useState<AgentLlmPurpose | null>(null);
  const [switchingSource, setSwitchingSource] = useState<AgentLlmSource | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Platform rows are not addressable — keep the platform providers out of the
  // editor, where they would only produce a failed request.
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
  // purposes, whose demand is hard; CHAT's tool support is advisory.
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

  const handleSourceSwitch = async (source: AgentLlmSource) => {
    if (source === llmSource || switchingSource) return;
    setActionError(null);
    setSwitchingSource(source);
    setEditing(null);
    setDeleting(null);
    try {
      const updated = await apiService.setAgentLlmSource(agentId, source);
      // The PUT answers with the whole agent, including the recomputed binding
      // list; write both in so the switcher and the cards flip together. The
      // invalidation then confirms with the server rather than filling a gap.
      setAgent(updated);
      setAgentLlms(agentId, updated.llms);
      invalidateAgentLlms(agentId);
    } catch (err) {
      setActionError(getErrorMessage(err, t('sourceSwitchFailed')));
    } finally {
      setSwitchingSource(null);
    }
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

  // The platform's effective chains are already resolved for this agent type
  // (media only for external agents); group them the same way.
  const platformChains = new Map<AgentLlmPurpose, AgentLlmResponse[]>();
  for (const binding of bindings) {
    if (binding.source !== 'PLATFORM') continue;
    const list = platformChains.get(binding.purpose);
    if (list) list.push(binding);
    else platformChains.set(binding.purpose, [binding]);
  }
  const platformChainOf = (purpose: AgentLlmPurpose) => platformChains.get(purpose) ?? [];

  const platformMode = llmSource === 'PLATFORM';

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

  const noProviders = bindableProviders.length === 0;

  // BYOK only: an unbound purpose falls back to the purpose lists of the
  // agent's chat providers, in their chain order — the resolver walks the same
  // list, skips a provider with no list or an explicit [], and reads no list of
  // a disabled provider at all.
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

  // ROUTINE's last resort: the chat model itself. On the platform source that is
  // the head of the platform's CHAT chain; on BYOK, the first own CHAT link that
  // is not dead.
  const chatModel = platformMode
    ? platformChainOf('CHAT')[0]?.model
    : chainOf('CHAT').find((b) => {
        const provider = providerById(b.llmProviderId);
        return provider?.enabled && !isModelUnlisted(b);
      })?.model ?? chainOf('CHAT')[0]?.model;

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
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{t('llmSource')}</span>
            <div className="flex items-center gap-1.5">
              <FilterPill
                active={platformMode}
                onClick={() => handleSourceSwitch('PLATFORM')}
                disabled={switchingSource !== null}
              >
                {t('llmSourcePlatform')}
              </FilterPill>
              <FilterPill
                active={!platformMode}
                onClick={() => handleSourceSwitch('BYOK')}
                disabled={switchingSource !== null}
              >
                {t('llmSourceByok')}
              </FilterPill>
            </div>
          </div>
          <Link
            href="/dashboard/llm-providers"
            className="text-sm text-accent hover:text-accent/80 transition-colors whitespace-nowrap"
          >
            {t('manageProviders')} →
          </Link>
        </div>
        <p className="text-sm text-muted">
          {platformMode ? t('llmSourcePlatformHint') : t('llmSourceByokHint')}
        </p>
        {/* For an external agent the chat model is the client's; what is bound
            here only drives the tool tasks the platform executes itself. */}
        {agentType && isExternalAgentType(agentType) && (
          <p className="text-sm text-muted">{t('externalPurposeHint')}</p>
        )}
      </div>

      {actionError && <ErrorAlert>{actionError}</ErrorAlert>}

      <div className="space-y-3">
        {LLM_PURPOSES.map((purpose) => {
          const chain = chainOf(purpose);
          const platformChain = platformChainOf(purpose);
          const unbound = !platformMode && chain.length === 0;
          // What the purpose would fall back to, walked the way the resolver
          // walks it: the chat providers in chain order, each skipped when it
          // declares no list — or deliberately none.
          const inherited = unbound ? inheritedFrom(purpose) : undefined;
          // ROUTINE is the one purpose that never fails: without a chain of its
          // own it runs on the chat model — the platform's CHAT chain or the
          // agent's own, depending on the source.
          const onChatModel = platformMode
            ? purpose === 'ROUTINE' && platformChain.length === 0 && !!chatModel
            : unbound && purpose === 'ROUTINE' && !inherited;
          // An explicit [] at one provider only drops that provider from the
          // chain, so it is a warning about the agent's own providers.
          const purposeOff =
            unbound &&
            purpose !== 'CHAT' &&
            purpose !== 'ROUTINE' &&
            !inherited &&
            chatProviders.length > 0 &&
            chatProviders.every((p) => purposeState(p.purposePriority, purpose) === 'off');
          const isEditing = editing?.purpose === purpose;
          // Adding is a BYOK move: on PLATFORM the backend refuses it.
          const canAdd = !platformMode && !isEditing && chain.length < MAX_PURPOSE_CHAIN && !noProviders;

          return (
            <AgentPurposeCard
              key={purpose}
              purpose={purpose}
              agentId={agentId}
              agentType={agentType}
              platformMode={platformMode}
              platformChain={platformChain}
              chain={chain}
              editorChain={chain.map(toPair)}
              providers={bindableProviders}
              canAdd={canAdd}
              editing={isEditing}
              editingIndex={isEditing ? editing.index : null}
              busy={savingPurpose === purpose}
              inherited={
                inherited ? { providerName: inherited.provider.name, model: inherited.model } : undefined
              }
              onChatModel={onChatModel}
              chatModel={chatModel}
              purposeOff={purposeOff}
              noProviders={noProviders}
              isModelUnlisted={isModelUnlisted}
              isModelUnfit={isModelUnfit}
              onMove={(index, delta) => moveLink(purpose, index, delta)}
              onEdit={(index) => setEditing({ purpose, index })}
              onCancelEdit={() => setEditing(null)}
              onDelete={setDeleting}
              onSuccess={handleMutationSuccess}
            />
          );
        })}
      </div>

      {deleting && (
        <DeleteAgentLlmModal
          agentId={agentId}
          binding={deleting}
          remaining={deleteRemaining}
          hasOtherBindings={userBindings.length > 1}
          clearWholePurpose={platformMode}
          purposeCount={chainOf(deleting.purpose).length}
          onClose={() => setDeleting(null)}
          onSuccess={handleMutationSuccess}
        />
      )}
    </div>
  );
}
