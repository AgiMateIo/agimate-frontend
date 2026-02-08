'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { ConnectedDevice } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

interface DisconnectDeviceModalProps {
  device: ConnectedDevice;
  onClose: () => void;
  onSuccess: (connectionId: string) => void;
}

export default function DisconnectDeviceModal({ device, onClose, onSuccess }: DisconnectDeviceModalProps) {
  const t = useTranslations('Devices');
  const tCommon = useTranslations('Common');
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);

    try {
      await apiService.disconnectDevice(device.connectionId);
      onSuccess(device.connectionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect device');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('disconnectDevice')} size="sm">
      <div className="space-y-4">
        <p className="text-foreground">
          {t('disconnectConfirm', { name: device.connectionName })}
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
            {tCommon('cancel')}
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
