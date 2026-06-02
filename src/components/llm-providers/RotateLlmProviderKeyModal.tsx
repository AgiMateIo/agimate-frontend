'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { LlmProviderResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface RotateLlmProviderKeyModalProps {
  provider: LlmProviderResponse;
  onClose: () => void;
  onSuccess: (updated: LlmProviderResponse) => void;
}

export default function RotateLlmProviderKeyModal({ provider, onClose, onSuccess }: RotateLlmProviderKeyModalProps) {
  const t = useTranslations('LlmProviders');
  const [apiKey, setApiKey] = useState('');

  const { loading, error, handleSubmit } = useAsyncForm<LlmProviderResponse>({
    onSuccess: (updated) => onSuccess(updated),
    defaultError: 'Failed to rotate key',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.updateLlmProvider(provider.id, { apiKey: apiKey.trim() })
    );

  return (
    <Modal isOpen={true} onClose={onClose} title={`${t('rotateKey')}: ${provider.name}`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Alert variant="warning">{t('rotateKeyWarning')}</Alert>

        <FormField label={t('newApiKey')} required>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t('newApiKeyPlaceholder')}
            required
            disabled={loading}
          />
        </FormField>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="warning" loading={loading} disabled={loading || !apiKey.trim()}>
            {t('rotate')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
