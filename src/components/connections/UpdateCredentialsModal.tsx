'use client';

import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { ConnectionResponse, CredentialFieldSpec } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import CredentialFieldsForm, { useCredentialFields } from './CredentialFieldsForm';

interface UpdateCredentialsModalProps {
  connection: ConnectionResponse;
  // field code → its declaration
  credentialFields: Record<string, CredentialFieldSpec>;
  onClose: () => void;
  onSuccess: (connection: ConnectionResponse) => void;
}

export default function UpdateCredentialsModal({
  connection,
  credentialFields,
  onClose,
  onSuccess,
}: UpdateCredentialsModalProps) {
  const t = useTranslations('Connections');
  const tCommon = useTranslations('Common');
  const { credentials, handleFieldChange, canSubmit, filledCredentials } =
    useCredentialFields(credentialFields);

  const { loading, error, fieldErrors, handleSubmit } = useAsyncForm<ConnectionResponse>({
    onSuccess,
    defaultError: t('updateCredentialsError'),
  });

  const onSubmit = (e: React.FormEvent) =>
    // A field the user typed into and then cleared must not be sent as an empty
    // string — that would overwrite a working credential with nothing.
    handleSubmit(e, () =>
      apiService.updateConnectionSecret(connection.id, { credentials: filledCredentials() })
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
            {tCommon('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={loading || !canSubmit}
            loading={loading}
            className="flex-1"
          >
            {tCommon('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
