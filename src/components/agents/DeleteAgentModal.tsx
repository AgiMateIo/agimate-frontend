'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgentResponse } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';

interface DeleteAgentModalProps {
  agent: AgentResponse;
  onClose: () => void;
  onSuccess: (agentId: string) => void;
}

export default function DeleteAgentModal({ agent, onClose, onSuccess }: DeleteAgentModalProps) {
  const t = useTranslations('Agents');
  const tCommon = useTranslations('Common');

  return (
    <ConfirmDeleteModal
      title={t('deleteAgentTitle')}
      confirmLabel={tCommon('delete')}
      cancelLabel={tCommon('cancel')}
      defaultError="Failed to delete agent configuration"
      fullWidthButtons
      onConfirm={() => apiService.deleteAgent(agent.id)}
      onClose={onClose}
      onSuccess={() => onSuccess(agent.id)}
    >
      <p className="text-foreground">{t('deleteAgentConfirm', { name: agent.name })}</p>

      <Alert variant="warning">{t('deleteAgentWarning')}</Alert>
    </ConfirmDeleteModal>
  );
}
