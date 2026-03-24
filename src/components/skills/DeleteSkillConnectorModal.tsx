'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { SkillConnectorResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface DeleteSkillConnectorModalProps {
  skillId: string;
  binding: SkillConnectorResponse;
  connectorName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteSkillConnectorModal({
  skillId,
  binding,
  connectorName,
  onClose,
  onSuccess,
}: DeleteSkillConnectorModalProps) {
  const t = useTranslations('SkillConnectors');

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: t('deleteError'),
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      await apiService.deleteSkillConnector(skillId, binding.id);
    });

  const summary = [
    connectorName,
    binding.type ? (binding.type === 'TOOL' ? t('typeTool') : t('typeTrigger')) : null,
    binding.name,
  ].filter(Boolean).join(' → ');

  return (
    <Modal isOpen={true} onClose={onClose} title={t('deleteBinding')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-foreground">
          {t('deleteConfirm')}
        </p>
        <div className="text-sm text-muted">
          <strong>{t('binding')}:</strong> {summary}
        </div>

        <Alert variant="warning">
          {t('deleteWarning')}
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
            loading={loading}
            className="flex-1"
          >
            {t('delete')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
