'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { IntegrationResponse } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';

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

  return (
    <ConfirmDeleteModal
      title={t('deleteIntegration')}
      confirmLabel={t('delete')}
      cancelLabel={t('cancel')}
      defaultError={t('deleteError')}
      size="sm"
      fullWidthButtons
      onConfirm={() => apiService.deleteIntegration(integration.id)}
      onClose={onClose}
      onSuccess={() => onSuccess(integration.id)}
    >
      <p className="text-foreground">
        {t('deleteConfirm', { name: integration.name || integration.fullCode })}
      </p>

      <Alert variant="warning">
        {t('deleteWarning')}
      </Alert>
    </ConfirmDeleteModal>
  );
}
