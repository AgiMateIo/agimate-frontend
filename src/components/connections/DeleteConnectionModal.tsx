'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { ConnectionResponse } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';

interface DeleteConnectionModalProps {
  connection: ConnectionResponse;
  onClose: () => void;
  onSuccess: (connectionId: string) => void;
}

export default function DeleteConnectionModal({
  connection,
  onClose,
  onSuccess,
}: DeleteConnectionModalProps) {
  const t = useTranslations('Connections');

  return (
    <ConfirmDeleteModal
      title={t('deleteIntegration')}
      confirmLabel={t('delete')}
      cancelLabel={t('cancel')}
      defaultError={t('deleteError')}
      size="sm"
      fullWidthButtons
      onConfirm={() => apiService.deleteConnection(connection.id)}
      onClose={onClose}
      onSuccess={() => onSuccess(connection.id)}
    >
      <p className="text-foreground">
        {t('deleteConfirm', { name: connection.name || connection.fullCode })}
      </p>

      <Alert variant="warning">
        {t('deleteWarning')}
      </Alert>
    </ConfirmDeleteModal>
  );
}
