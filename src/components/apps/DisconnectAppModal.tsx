'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

interface DisconnectAppModalProps {
  appId: string;
  appName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DisconnectAppModal({ appId, appName, onClose, onSuccess }: DisconnectAppModalProps) {
  const t = useTranslations('Apps');
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);

    try {
      await apiService.disconnectApp(appId);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect app');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('disconnectApp')} size="sm">
      <div className="space-y-4">
        <p className="text-foreground">
          {t('disconnectConfirm', { name: appName })}
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
