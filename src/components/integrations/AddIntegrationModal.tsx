'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { ConnectorCatalogEntry, IntegrationResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import CredentialFieldsForm, { useCredentialFields } from './CredentialFieldsForm';

interface AddIntegrationModalProps {
  platforms: ConnectorCatalogEntry[];
  onClose: () => void;
  onSuccess: (integration: IntegrationResponse) => void;
}

export default function AddIntegrationModal({
  platforms,
  onClose,
  onSuccess,
}: AddIntegrationModalProps) {
  const t = useTranslations('Integrations');
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPlatform, setSelectedPlatform] = useState<ConnectorCatalogEntry | null>(null);
  const [name, setName] = useState('');

  // field code → human-readable label
  const credentialFields = selectedPlatform?.integrationMeta?.credentialFields ?? {};
  const { credentials, handleFieldChange, allFieldsFilled, reset: resetCredentials } =
    useCredentialFields(credentialFields);

  const { loading, error, fieldErrors, handleSubmit, clearError } = useAsyncForm<IntegrationResponse>({
    onSuccess,
    defaultError: t('createError'),
  });

  const handlePlatformSelect = (platform: ConnectorCatalogEntry) => {
    setSelectedPlatform(platform);
    resetCredentials();
    setName('');
    clearError();
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setSelectedPlatform(null);
    clearError();
  };

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      const created = await apiService.createIntegration({
        connectorCode: selectedPlatform!.code,
        credentials,
        name: name.trim() || undefined,
      });
      // DYNAMIC connectors (e.g. MCP) discover tools per instance — warm the
      // tools cache right after connecting. Don't fail creation if this errors.
      if (selectedPlatform!.capabilities?.toolBinding === 'DYNAMIC') {
        try {
          await apiService.testIntegration(created.id);
        } catch (err) {
          console.error('Failed to discover tools for new integration:', err);
        }
      }
      return created;
    });

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={step === 1 ? t('selectPlatform') : t('configureIntegration')}
      size={step === 1 ? 'lg' : 'md'}
    >
      {step === 1 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('selectPlatformSubtitle')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {platforms.filter(p => p.integrationMeta).map((platform) => (
              <button
                key={platform.code}
                onClick={() => handlePlatformSelect(platform)}
                className="flex items-start gap-3 p-4 rounded-lg border border-border bg-surface-secondary hover:bg-surface-secondary/80 hover:border-accent transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-bold text-lg shrink-0">
                  {platform.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{platform.name}</div>
                  {platform.description && (
                    <p className="text-xs text-muted mt-0.5">{platform.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary border border-border">
            <div className="h-8 w-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-bold">
              {selectedPlatform!.name.charAt(0)}
            </div>
            <div className="font-medium text-foreground">{selectedPlatform!.name}</div>
          </div>

          <FormField label={t('name')}>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              maxLength={100}
            />
          </FormField>

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
              onClick={handleBack}
              disabled={loading}
            >
              {t('back')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !allFieldsFilled}
              loading={loading}
              className="flex-1"
            >
              {t('create')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
