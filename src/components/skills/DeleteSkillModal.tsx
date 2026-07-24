'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { SkillResponse } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';

interface DeleteSkillModalProps {
  skill: SkillResponse;
  onClose: () => void;
  onSuccess: (skillId: string) => void;
}

export default function DeleteSkillModal({
  skill,
  onClose,
  onSuccess,
}: DeleteSkillModalProps) {
  const t = useTranslations('Skills');

  return (
    <ConfirmDeleteModal
      title={t('deleteSkillTitle')}
      confirmLabel={t('delete')}
      cancelLabel={t('cancel')}
      defaultError="Failed to delete skill"
      size="sm"
      fullWidthButtons
      onConfirm={() => apiService.deleteSkill(skill.id)}
      onClose={onClose}
      onSuccess={() => onSuccess(skill.id)}
    >
      <p className="text-foreground">
        {t('deleteSkillConfirm', { name: skill.title })}
      </p>

      <Alert variant="warning">
        {t('deleteSkillWarning')}
      </Alert>
    </ConfirmDeleteModal>
  );
}
