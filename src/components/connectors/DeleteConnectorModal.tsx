'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AppResponse } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';

interface DeleteConnectorModalProps {
  connector: AppResponse;
  onClose: () => void;
  onSuccess: (connectorId: string) => void;
}

export default function DeleteConnectorModal({ connector, onClose, onSuccess }: DeleteConnectorModalProps) {
  const t = useTranslations('Connectors');

  const tCommon = useTranslations('Common');
  return (
    <ConfirmDeleteModal
      title={t('deleteApp')}
      confirmLabel={tCommon('delete')}
      cancelLabel={tCommon('cancel')}
      defaultError="Failed to delete connector"
      size="sm"
      fullWidthButtons
      onConfirm={() => apiService.deleteApp(connector.id)}
      onClose={onClose}
      onSuccess={() => onSuccess(connector.id)}
    >
      <p className="text-foreground">
        {t('deleteConfirm', { name: connector.name })}
      </p>

      <Alert variant="warning">
        {t('deleteWarning')}
      </Alert>
    </ConfirmDeleteModal>
  );
}
