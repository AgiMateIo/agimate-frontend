'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgentLlmBindingRequest, AgentLlmResponse } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { purposeLabelKey } from '@/components/llm-providers/llmPurpose';

interface DeleteAgentLlmModalProps {
  agentId: string;
  binding: AgentLlmResponse;
  // The links that stay — the PUT body that removes this one. Empty clears the
  // whole purpose, which the backend treats the same as DELETE.
  remaining: AgentLlmBindingRequest[];
  // False when this is the agent's only binding — removing it drops the agent
  // back onto the platform fallback model.
  hasOtherBindings: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteAgentLlmModal({
  agentId,
  binding,
  remaining,
  hasOtherBindings,
  onClose,
  onSuccess,
}: DeleteAgentLlmModalProps) {
  const t = useTranslations('Agents');
  const tCommon = useTranslations('Common');
  const tp = useTranslations('LlmProviders');

  const lastOfPurpose = remaining.length === 0;

  return (
    <ConfirmDeleteModal
      title={t('deleteModelBinding')}
      confirmLabel={t('deleteModelBinding')}
      cancelLabel={tCommon('cancel')}
      defaultError="Failed to delete binding"
      fullWidthButtons
      onConfirm={async () => {
        await apiService.updateAgentLlm(agentId, binding.purpose, { bindings: remaining });
      }}
      onClose={onClose}
      onSuccess={onSuccess}
    >
      <p className="text-foreground">{t('removeBindingConfirm')}</p>
      <div className="text-sm text-muted space-y-1">
        <div><strong>{t('purpose')}:</strong> {tp(purposeLabelKey[binding.purpose])}</div>
        <div><strong>{t('provider')}:</strong> {binding.llmProviderName}</div>
        <div><strong>{t('model')}:</strong> <span className="font-mono">{binding.model}</span></div>
      </div>

      <Alert variant="warning">
        {!hasOtherBindings
          ? t('removeLastBindingWarning')
          : !lastOfPurpose
            // A middle link: the next one moves up, the purpose stays bound.
            ? t('removeChainLinkWarning')
            : binding.purpose === 'CHAT'
              // The platform fallback only appears when the agent has zero bindings,
              // so dropping the whole CHAT chain while other purposes stay bound
              // leaves no chat model.
              ? t('removeChatBindingWarning')
              : binding.purpose === 'ROUTINE'
                ? t('removeRoutineBindingWarning')
                : t('removeBindingWarning')}
      </Alert>
    </ConfirmDeleteModal>
  );
}
