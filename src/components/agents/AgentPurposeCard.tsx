'use client';

import type { ComponentType, SVGProps } from 'react';
import { useTranslations } from 'next-intl';
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
import {
  AgentLlmBindingRequest,
  AgentLlmPurpose,
  AgentLlmResponse,
  AgentType,
  LlmProviderResponse,
} from '@/types';
import { isExternalAgentType } from '@/utils/agent';
import { Chip } from '@/components/ui/Chip';
import { Link } from '@/i18n/navigation';
import AgentLlmRowEditor from './AgentLlmRowEditor';
import {
  MAX_PURPOSE_CHAIN,
  isTextPurpose,
  purposeLabelKey,
  purposeRequirementLabelKey,
} from '@/components/llm-providers/llmPurpose';

// A real binding row: only a PLATFORM row lacks a provider id.
export type UserBinding = AgentLlmResponse & { llmProviderId: string };

export interface AgentPurposeCardProps {
  purpose: AgentLlmPurpose;
  agentId: string;
  agentType?: AgentType;
  // PLATFORM mode: the platform's effective chain is drawn read-only and the
  // agent's own rows are listed as inactive cleanup.
  platformMode: boolean;
  platformChain: AgentLlmResponse[];
  chain: UserBinding[];
  // The own chain in PUT shape — what the link editor sends back with one
  // position substituted.
  editorChain: AgentLlmBindingRequest[];
  // Already filtered to bindable providers (no platform row) by the caller.
  providers: LlmProviderResponse[];
  // Whether the "add a fallback" node/editor may appear (BYOK, room left).
  canAdd: boolean;
  editing: boolean;
  editingIndex: number | null;
  // A whole-chain PUT is in flight for this purpose.
  busy: boolean;
  // BYOK only: what an unbound purpose falls back to.
  inherited?: { providerName: string; model: string };
  onChatModel: boolean;
  chatModel?: string;
  purposeOff: boolean;
  noProviders: boolean;
  isModelUnlisted: (binding: AgentLlmResponse) => boolean;
  isModelUnfit: (binding: AgentLlmResponse) => boolean;
  onMove: (index: number, delta: number) => void;
  onEdit: (index: number | null) => void;
  onCancelEdit: () => void;
  onDelete: (binding: UserBinding) => void;
  onSuccess: () => void;
}

// One face per purpose so the six cards read apart at a glance.
const purposeIcons = {
  CHAT: ChatBubbleLeftRightIcon,
  ROUTINE: ClockIcon,
  IMAGE: PhotoIcon,
  VISION: EyeIcon,
  AUDIO_IN: MicrophoneIcon,
  AUDIO_OUT: SpeakerWaveIcon,
} satisfies Record<AgentLlmPurpose, ComponentType<SVGProps<SVGSVGElement>>>;

// One purpose, one card. The two sources are never mixed:
//   PLATFORM — the platform's chain is shown read-only; the agent's own rows
//              follow, marked inactive, with cleanup only (the backend refuses
//              a non-empty PUT on a PLATFORM agent).
//   BYOK     — the agent's own chain, editable, falling back to the purpose
//              lists of its chat providers. No platform model is substituted.
// The links are drawn as a vertical chain — a filled node for the attempt,
// hollow ones below it for the fallbacks — because the order IS the feature.
export default function AgentPurposeCard({
  purpose,
  agentId,
  agentType,
  platformMode,
  platformChain,
  chain,
  editorChain,
  providers,
  canAdd,
  editing,
  editingIndex,
  busy,
  inherited,
  onChatModel,
  chatModel,
  purposeOff,
  noProviders,
  isModelUnlisted,
  isModelUnfit,
  onMove,
  onEdit,
  onCancelEdit,
  onDelete,
  onSuccess,
}: AgentPurposeCardProps) {
  const t = useTranslations('Agents');
  const tu = useTranslations('LlmUsage');
  const tp = useTranslations('LlmProviders');

  const shownCount = platformMode ? platformChain.length : chain.length;
  const externalTextPurpose =
    !!agentType && isExternalAgentType(agentType) && isTextPurpose(purpose);

  // Without a provider of their own there is nothing to pick a model from, so
  // the call to action is the key, not the model.
  const setModelAction = (
    <div className="flex items-center gap-3">
      {noProviders ? (
        <Link
          href="/dashboard/llm-providers"
          className="text-sm text-accent hover:text-accent/80 transition-colors whitespace-nowrap"
        >
          {tu('connectOwnKey')} →
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => onEdit(null)}
          className="text-sm text-accent hover:text-accent/80 transition-colors whitespace-nowrap"
        >
          {t('setModel')}
        </button>
      )}
    </div>
  );

  return (
    <section className="border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Tool purposes stand out; the text ones (the norm) stay neutral. */}
          <Chip icon={purposeIcons[purpose]} tone={isTextPurpose(purpose) ? 'default' : 'accent'}>
            {tp(purposeLabelKey[purpose])}
          </Chip>
          {shownCount > 0 && (
            <span className="text-xs text-muted" title={t('chainOrderHint')}>
              {t('chainCount', { count: shownCount, max: MAX_PURPOSE_CHAIN })}
            </span>
          )}
          {!platformMode && chain.length >= MAX_PURPOSE_CHAIN && (
            <span className="text-xs text-muted">{t('chainFull', { max: MAX_PURPOSE_CHAIN })}</span>
          )}
        </div>
      </div>

      {platformMode ? (
        <>
          {/* The platform's effective chain — read-only, no provider id. */}
          {platformChain.length > 0 ? (
            <ol>
              {platformChain.map((binding, index) => {
                const primary = index === 0;
                return (
                  <li key={`${binding.llmProviderName}:${binding.model}:${binding.priority}`} className="flex gap-3">
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
                      {index < platformChain.length - 1 && (
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
                        {primary && (
                          <Chip strong tone="success" title={t('platformModelHint')}>
                            {t('platformModel')}
                          </Chip>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 flex-wrap text-xs">
                        <span className="truncate text-foreground/70">{binding.llmProviderName}</span>
                        <span className="text-muted">
                          {primary ? t('chainPrimaryHint') : t('chainFallbackHint')}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="flex items-center gap-3">
              <span
                className="h-5 w-5 shrink-0 rounded-full border border-dashed border-border"
                aria-hidden
              />
              {/* ROUTINE never fails: without a chain of its own it runs on the
                  platform's chat model. An external agent has no chat cycle of
                  its own — the platform has no chat chain to miss. */}
              {onChatModel ? (
                <>
                  <span className="text-sm text-muted" title={t('routineOnChatModelHint')}>
                    {t('routineOnChatModel')}
                  </span>
                  {chatModel && <span className="text-sm text-muted font-mono">{chatModel}</span>}
                </>
              ) : (
                <span
                  className="text-sm text-muted"
                  title={externalTextPurpose ? undefined : t('noPlatformModelHint')}
                >
                  {externalTextPurpose ? t('mcpUnavailable_models') : t('noPlatformModel')}
                </span>
              )}
            </div>
          )}

          {/* Own rows are kept but do not take part — cleanup only. An empty
              PUT is the allowed way to remove them; a non-empty one would be
              refused, so the card offers the whole-purpose DELETE instead. */}
          {chain.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Chip tone="muted">{t('inactiveBindings')}</Chip>
                <span className="text-xs text-muted">{t('inactiveBindingsHint')}</span>
              </div>
              <ol className="divide-y divide-border/50">
                {chain.map((binding) => (
                  <li
                    key={`${binding.llmProviderId}:${binding.model}`}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <span className="block truncate font-mono text-sm text-foreground/70">
                        {binding.model}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {binding.llmProviderName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDelete(binding)}
                      aria-label={t('deleteModelBinding')}
                      className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Editing a chain changes who pays, so the backend asks for the
              source switch first — the button says so instead of failing. */}
          <button
            type="button"
            disabled
            title={t('switchToByokToEdit')}
            className="cursor-not-allowed text-left text-sm text-muted/70"
          >
            {platformChain.length > 0 ? t('addFallbackModel') : t('setModel')}
          </button>
        </>
      ) : (
        <>
          {chain.length > 0 && (
            <ol>
              {chain.map((binding, index) => {
                const primary = index === 0;
                const provider = providers.find((p) => p.id === binding.llmProviderId);
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
                            onClick={() => onMove(index, -1)}
                            disabled={busy || index === 0}
                            aria-label={t('moveModelUp')}
                            className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-secondary transition-colors disabled:opacity-30"
                          >
                            <ArrowUpIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onMove(index, 1)}
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
                        onClick={() => onEdit(index)}
                        disabled={busy}
                        aria-label={t('changeModel')}
                        className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(binding)}
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
                    onClick={() => onEdit(null)}
                    disabled={busy}
                    className="self-start text-sm text-accent hover:text-accent/80 transition-colors disabled:opacity-40"
                  >
                    {t('addFallbackModel')}
                  </button>
                </li>
              )}
            </ol>
          )}

          {editing ? (
            <AgentLlmRowEditor
              agentId={agentId}
              purpose={purpose}
              chain={editorChain}
              index={editingIndex}
              providers={providers}
              onCancel={onCancelEdit}
              onSuccess={onSuccess}
            />
          ) : chain.length === 0 ? (
            <div className="flex items-center gap-3">
              <span
                className="h-5 w-5 shrink-0 rounded-full border border-dashed border-border"
                aria-hidden
              />
              <div className="flex min-w-0 flex-1 items-center gap-2 flex-wrap">
                {inherited ? (
                  <>
                    <span className="text-sm text-muted" title={t('inheritedModelHint')}>
                      {t('inheritedFromProvider', { provider: inherited.providerName })}
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
                  <span
                    className="text-sm text-muted"
                    title={purpose === 'CHAT' ? t('chatUnsetHint') : t('unsetModelHint')}
                  >
                    {purpose === 'CHAT' ? t('chatUnset') : t('unsetModel')}
                  </span>
                )}
              </div>
              {setModelAction}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
