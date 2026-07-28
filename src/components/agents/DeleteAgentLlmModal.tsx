'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgentLlmResponse } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { purposeLabelKey } from '@/components/llm-providers/llmPurpose';

interface DeleteAgentLlmModalProps {
  agentId: string;
  binding: AgentLlmResponse;
  // True when this is the agent's only binding — removing it drops the agent
  // back onto the platform fallback model.
  isLastBinding: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteAgentLlmModal({
  agentId,
  binding,
  isLastBinding,
  onClose,
  onSuccess,
}: DeleteAgentLlmModalProps) {
  const t = useTranslations('Agents');
  const tp = useTranslations('LlmProviders');

  return (
    <ConfirmDeleteModal
      title={t('deleteModelBinding')}
      confirmLabel={t('deleteModelBinding')}
      cancelLabel={t('cancel')}
      defaultError="Failed to delete binding"
      fullWidthButtons
      onConfirm={() => apiService.deleteAgentLlm(agentId, binding.purpose)}
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
        {isLastBinding
          ? t('removeLastBindingWarning')
          // The platform fallback only appears when the agent has zero bindings,
          // so dropping CHAT while other purposes stay bound leaves no chat model.
          : binding.purpose === 'CHAT'
            ? t('removeChatBindingWarning')
            : t('removeBindingWarning')}
      </Alert>
    </ConfirmDeleteModal>
  );
}
