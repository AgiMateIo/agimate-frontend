'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { IntegrationResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import CredentialFieldsForm, { useCredentialFields } from './CredentialFieldsForm';

interface UpdateCredentialsModalProps {
  integration: IntegrationResponse;
  // field code → human-readable label
  credentialFields: Record<string, string>;
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
  const { credentials, handleFieldChange, allFieldsFilled } = useCredentialFields(credentialFields);

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm<IntegrationResponse>({
    onSuccess,
    defaultError: t('updateCredentialsError'),
  });

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

        <CredentialFieldsForm
          credentialFields={credentialFields}
          credentials={credentials}
          fieldErrors={fieldErrors}
          onFieldChange={handleFieldChange}
        />

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
