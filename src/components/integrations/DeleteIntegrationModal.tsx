'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { IntegrationResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

interface DeleteIntegrationModalProps {
  integration: IntegrationResponse;
  onClose: () => void;
  onSuccess: (integrationId: string) => void;
}

export default function DeleteIntegrationModal({
  integration,
  onClose,
  onSuccess,
}: DeleteIntegrationModalProps) {
  const t = useTranslations('Integrations');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      await apiService.deleteIntegration(integration.id);
      onSuccess(integration.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('deleteIntegration')} size="sm">
      <div className="space-y-4">
        <p className="text-foreground">
          {t('deleteConfirm', { name: integration.name || integration.fullCode })}
        </p>

        <Alert variant="warning">
          {t('deleteWarning')}
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
