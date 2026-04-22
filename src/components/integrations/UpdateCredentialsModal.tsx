'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { IntegrationResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface UpdateCredentialsModalProps {
  integration: IntegrationResponse;
  credentialFields: string[];
  onClose: () => void;
  onSuccess: (integration: IntegrationResponse) => void;
}

export default function UpdateCredentialsModal({
  integration,
  credentialFields,
  onClose,
  onSuccess,
}: UpdateCredentialsModalProps) {
  const t = useTranslations('Integrations');
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm<IntegrationResponse>({
    onSuccess,
    defaultError: t('updateCredentialsError'),
  });

  const handleFieldChange = (fieldName: string, value: string) => {
    setCredentials(prev => ({ ...prev, [fieldName]: value }));
  };

  const allFieldsFilled = credentialFields.every(field => credentials[field]?.trim());

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () =>
      apiService.updateIntegrationSecret(integration.id, { credentials })
    );

  return (
    <Modal isOpen={true} onClose={onClose} title={t('updateCredentials')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Alert variant="warning">
          {t('updateCredentialsWarning')}
        </Alert>

        {credentialFields.map(fieldName => (
          <FormField
            key={fieldName}
            label={fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
            required
            error={fieldErrors[fieldName]}
          >
            <Input
              type="password"
              value={credentials[fieldName] || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              placeholder={`Enter ${fieldName}`}
              required
            />
          </FormField>
        ))}

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
            disabled={loading || !allFieldsFilled}
            loading={loading}
            className="flex-1"
          >
            {t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
