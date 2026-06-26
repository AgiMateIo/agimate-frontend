'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface DeleteAgentSkillModalProps {
  agentId: string;
  skillId: string;
  skillName: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteAgentSkillModal({ agentId, skillId, skillName, onClose, onSuccess }: DeleteAgentSkillModalProps) {
  const t = useTranslations('Agents');

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to unbind skill',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      await apiService.unbindAgentSkill(agentId, skillId);
    });

  return (
    <Modal isOpen={true} onClose={onClose} title={t('removeSkill')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-foreground">
          {t('removeSkillConfirm')}
        </p>
        <div className="text-sm text-muted">
          <strong>{t('skillName')}:</strong> {skillName ?? skillId}
        </div>

        <Alert variant="warning">
          {t('removeSkillWarning')}
        </Alert>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={loading}
            loading={loading}
            className="flex-1"
          >
            {t('removeSkill')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
