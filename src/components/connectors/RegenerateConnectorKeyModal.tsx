'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { ConnectorCreatedResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { useClipboard } from '@/hooks/useClipboard';

interface RegenerateConnectorKeyModalProps {
  connectorId: string;
  connectorName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RegenerateConnectorKeyModal({ connectorId, connectorName, onClose, onSuccess }: RegenerateConnectorKeyModalProps) {
  const t = useTranslations('Connectors');
  const [regeneratedKey, setRegeneratedKey] = useState<ConnectorCreatedResponse | null>(null);
  const { copied, copy } = useClipboard();

  const { loading, error, handleSubmit } = useAsyncForm<ConnectorCreatedResponse>({
    onSuccess: setRegeneratedKey,
    defaultError: 'Failed to regenerate connector key',
  });

  const handleRegenerate = (e: React.FormEvent) =>
    handleSubmit(e, () => apiService.regenerateConnectorKey(connectorId));

  const handleClose = () => {
    if (regeneratedKey) {
      onSuccess();
    }
    onClose();
  };

  const handleCopy = () => {
    if (regeneratedKey) {
      copy(regeneratedKey.fullKey);
    }
  };

  if (regeneratedKey) {
    return (
      <Modal isOpen={true} onClose={handleClose} title={t('keyRegenerated')}>
        <div className="space-y-4">
          <Alert variant="warning">
            <p className="font-medium">
              {t('saveKeyWarning')}
            </p>
            <p className="text-xs mt-1">
              {t('saveKeyWarningDetail')}
            </p>
          </Alert>

          <FormField label={t('connectorKey')}>
            <div className="flex gap-2">
              <Input
                type="text"
                value={regeneratedKey.fullKey}
                readOnly
                className="flex-1 font-mono text-sm select-all"
              />
              <Button onClick={handleCopy} className="flex items-center gap-2 whitespace-nowrap">
                {copied ? (
                  <>
                    <CheckIcon className="h-5 w-5" />
                    {t('copied')}
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="h-5 w-5" />
                    {t('copy')}
                  </>
                )}
              </Button>
            </div>
          </FormField>

          <Button onClick={handleClose} className="w-full">
            {t('done')}
          </Button>
        </div>
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
            {t('cancel')}
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
