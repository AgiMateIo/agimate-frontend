'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AppCreatedResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import SecretKeyReveal from './SecretKeyReveal';

interface RegenerateConnectorKeyModalProps {
  connectorId: string;
  connectorName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RegenerateConnectorKeyModal({ connectorId, connectorName, onClose, onSuccess }: RegenerateConnectorKeyModalProps) {
  const t = useTranslations('Connectors');
  const tCommon = useTranslations('Common');
  const [regeneratedKey, setRegeneratedKey] = useState<AppCreatedResponse | null>(null);

  const { loading, error, handleSubmit } = useAsyncForm<AppCreatedResponse>({
    onSuccess: setRegeneratedKey,
    defaultError: 'Failed to regenerate connector key',
  });

  const handleRegenerate = (e: React.FormEvent) =>
    handleSubmit(e, () => apiService.regenerateAppKey(connectorId));

  const handleClose = () => {
    if (regeneratedKey) {
      onSuccess();
    }
    onClose();
  };

  if (regeneratedKey) {
    return (
      <Modal isOpen={true} onClose={handleClose} title={t('keyRegenerated')}>
        <SecretKeyReveal secret={regeneratedKey.fullKey} onDone={handleClose} />
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={t('regenerateKey')} size="sm">
      <form onSubmit={handleRegenerate} className="space-y-4">
        <p className="text-foreground">
          {t('regenerateConfirm', { name: connectorName })}
        </p>

        <Alert variant="warning">
          {t('regenerateWarning')}
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
            {tCommon('cancel')}
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={loading}
            className="flex-1"
          >
            {t('regenerate')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
