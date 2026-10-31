'use client';

import { useTranslations } from 'next-intl';
import apiService, { ApiError } from '@/services/api';
import { AgentLlmBindingRequest, AgentLlmResponse } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { purposeLabelKey } from '@/components/llm-providers/llmPurpose';

interface DeleteAgentLlmModalProps {
  agentId: string;
  binding: AgentLlmResponse;
  // The links that stay — the PUT body that removes this one. Empty clears the
  // whole purpose, which the backend treats the same as DELETE. Ignored when
  // `clearWholePurpose` is set.
  remaining: AgentLlmBindingRequest[];
  // False when this is the agent's only binding.
  hasOtherBindings: boolean;
  // A PLATFORM-source agent refuses a non-empty PUT, so an own row is removed by
  // clearing the whole purpose with DELETE instead. All own links of the purpose
  // go together; the platform chain is untouched.
  clearWholePurpose?: boolean;
  // How many own links that DELETE takes — the copy says the number.
  purposeCount?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteAgentLlmModal({
  agentId,
  binding,
  remaining,
  hasOtherBindings,
  clearWholePurpose = false,
  purposeCount = 1,
  onClose,
  onSuccess,
}: DeleteAgentLlmModalProps) {
  const t = useTranslations('Agents');
  const tCommon = useTranslations('Common');
  const tp = useTranslations('LlmProviders');

  const lastOfPurpose = remaining.length === 0;
  // Clearing a purpose is not "removing one model" — the label has to say so.
  const actionLabel = clearWholePurpose
    ? t('clearInactivePurposeTitle')
    : t('deleteModelBinding');

  return (
    <ConfirmDeleteModal
      title={actionLabel}
      confirmLabel={actionLabel}
      cancelLabel={tCommon('cancel')}
      defaultError="Failed to delete binding"
      fullWidthButtons
      onConfirm={async () => {
        if (clearWholePurpose) {
          try {
            await apiService.deleteAgentLlm(agentId, binding.purpose);
          } catch (err) {
            // Another tab already cleared it — the wanted outcome.
            if (err instanceof ApiError && err.status === 404) return;
            throw err;
          }
        } else {
          await apiService.updateAgentLlm(agentId, binding.purpose, { bindings: remaining });
        }
      }}
      onClose={onClose}
      onSuccess={onSuccess}
    >
      <p className="text-foreground">
        {clearWholePurpose ? t('clearInactivePurposeConfirm') : t('removeBindingConfirm')}
      </p>
      <div className="text-sm text-muted space-y-1">
        <div><strong>{t('purpose')}:</strong> {tp(purposeLabelKey[binding.purpose])}</div>
        {/* The whole-purpose action takes every own link; naming one of them
            would read as if only that one goes. */}
        {!clearWholePurpose && (
          <>
            <div><strong>{t('provider')}:</strong> {binding.llmProviderName}</div>
            <div><strong>{t('model')}:</strong> <span className="font-mono">{binding.model}</span></div>
          </>
        )}
      </div>

      <Alert variant="warning">
        {clearWholePurpose
          // These rows are already inactive; the backend's only allowed cleanup
          // on a PLATFORM agent is the whole-purpose DELETE.
          ? t('clearInactivePurposeWarning', { count: purposeCount })
          : !hasOtherBindings
            ? t('removeLastBindingWarning')
            : !lastOfPurpose
              // A middle link: the next one moves up, the purpose stays bound.
              ? t('removeChainLinkWarning')
              : binding.purpose === 'CHAT'
                // Dropping the whole CHAT chain while other purposes stay bound
                // leaves the agent without a chat model of its own.
                ? t('removeChatBindingWarning')
                : binding.purpose === 'ROUTINE'
                  ? t('removeRoutineBindingWarning')
                  : t('removeBindingWarning')}
      </Alert>
    </ConfirmDeleteModal>
  );
}
