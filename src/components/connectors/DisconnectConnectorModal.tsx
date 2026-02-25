'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

interface DisconnectConnectorModalProps {
  connectorId: string;
  connectorName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DisconnectConnectorModal({ connectorId, connectorName, onClose, onSuccess }: DisconnectConnectorModalProps) {
  const t = useTranslations('Connectors');
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);

    try {
      await apiService.disconnectConnector(connectorId);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect connector');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('disconnectConnector')} size="sm">
      <div className="space-y-4">
        <p className="text-foreground">
          {t('disconnectConfirm', { name: connectorName })}
        </p>

        <Alert variant="warning">
          {t('disconnectWarning')}
        </Alert>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={disconnecting}
            className="flex-1"
          >
            {t('cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleDisconnect}
            loading={disconnecting}
            className="flex-1"
          >
            {t('disconnect')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
