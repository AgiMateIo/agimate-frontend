'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { SkillResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

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
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      await apiService.deleteSkill(skill.id);
      onSuccess(skill.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete skill');
    } finally {
      setDeleting(false);
    }
  };

  if (skill.parentPubId != null) {
    return (
      <Modal isOpen={true} onClose={onClose} title={t('deleteSkillTitle')} size="sm">
        <div className="space-y-4">
          <Alert variant="warning">{t('featuredCloneReadOnly')}</Alert>
          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={t('deleteSkillTitle')} size="sm">
      <div className="space-y-4">
        <p className="text-foreground">
          {t('deleteSkillConfirm', { name: skill.name })}
        </p>

        <Alert variant="warning">
          {t('deleteSkillWarning')}
        </Alert>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={deleting}
            className="flex-1"
          >
            {t('cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={deleting}
            className="flex-1"
          >
            {t('delete')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
