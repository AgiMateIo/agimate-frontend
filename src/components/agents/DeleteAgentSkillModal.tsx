'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';

interface DeleteAgentSkillModalProps {
  agentId: string;
  skillId: string;
  skillName: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteAgentSkillModal({ agentId, skillId, skillName, onClose, onSuccess }: DeleteAgentSkillModalProps) {
  const t = useTranslations('Agents');

  const tCommon = useTranslations('Common');
  return (
    <ConfirmDeleteModal
      title={t('removeSkill')}
      confirmLabel={t('removeSkill')}
      cancelLabel={tCommon('cancel')}
      defaultError="Failed to unbind skill"
      fullWidthButtons
      onConfirm={() => apiService.unbindAgentSkill(agentId, skillId)}
      onClose={onClose}
      onSuccess={onSuccess}
    >
      <p className="text-foreground">
        {t('removeSkillConfirm')}
      </p>
      <div className="text-sm text-muted">
        <strong>{t('skillName')}:</strong> {skillName ?? skillId}
      </div>

      <Alert variant="warning">
        {t('removeSkillWarning')}
      </Alert>
    </ConfirmDeleteModal>
  );
}
