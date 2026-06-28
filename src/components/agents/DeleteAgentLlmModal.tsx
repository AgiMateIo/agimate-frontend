'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgentLlmResponse } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';

interface DeleteAgentLlmModalProps {
  agentId: string;
  binding: AgentLlmResponse;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteAgentLlmModal({ agentId, binding, onClose, onSuccess }: DeleteAgentLlmModalProps) {
  const t = useTranslations('Agents');

  return (
    <ConfirmDeleteModal
      title={t('deleteModelBinding')}
      confirmLabel={t('deleteModelBinding')}
      cancelLabel={t('cancel')}
      defaultError="Failed to delete binding"
      fullWidthButtons
      onConfirm={() => apiService.deleteAgentLlm(agentId, binding.name)}
      onClose={onClose}
      onSuccess={onSuccess}
    >
      <p className="text-foreground">{t('removeBindingConfirm')}</p>
      <div className="text-sm text-muted space-y-1">
        <div><strong>{t('bindingLabel')}:</strong> <span className="font-mono">{binding.name}</span></div>
        <div><strong>{t('provider')}:</strong> {binding.llmProviderName}</div>
        <div><strong>{t('model')}:</strong> <span className="font-mono">{binding.model}</span></div>
      </div>

      <Alert variant="warning">{t('removeBindingWarning')}</Alert>
    </ConfirmDeleteModal>
  );
}
