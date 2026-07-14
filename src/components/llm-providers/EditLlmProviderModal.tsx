'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { LlmProviderResponse, UpdateLlmProviderRequest } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { Toggle } from '@/components/ui/Toggle';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface EditLlmProviderModalProps {
  provider: LlmProviderResponse;
  onClose: () => void;
  onSuccess: (updated: LlmProviderResponse) => void;
}

export default function EditLlmProviderModal({ provider, onClose, onSuccess }: EditLlmProviderModalProps) {
  const t = useTranslations('LlmProviders');
  const tu = useTranslations('LlmUsage');
  const [name, setName] = useState(provider.name);
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl ?? '');
  const [defaultModel, setDefaultModel] = useState(provider.defaultModel ?? '');
  const [enabled, setEnabled] = useState(provider.enabled);

  const isCompatible = provider.providerType === 'OPENAI_COMPATIBLE';
  const isPlatform = provider.platform;
  // The platform name is a locked service key ("platform") — renaming is rejected.
  const models = provider.availableModels ?? [];

  const { loading, error, handleSubmit } = useAsyncForm<LlmProviderResponse>({
    onSuccess: (updated) => onSuccess(updated),
    defaultError: 'Failed to update provider',
  });

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, () => {
      const body: UpdateLlmProviderRequest = {};
      if (!isPlatform && name.trim() !== provider.name) body.name = name.trim();
      const trimmedUrl = baseUrl.trim();
      if (trimmedUrl !== (provider.baseUrl ?? '')) {
        body.baseUrl = trimmedUrl === '' ? '' : trimmedUrl;
      }
      if (defaultModel !== (provider.defaultModel ?? '')) {
        body.defaultModel = defaultModel === '' ? null : defaultModel;
      }
      if (enabled !== provider.enabled) body.enabled = enabled;
      return apiService.updateLlmProvider(provider.id, body);
    });

  return (
    <Modal isOpen={true} onClose={onClose} title={t('editProvider')}>
      <form onSubmit={onSubmit} className="space-y-4">
        {!isPlatform && (
          <FormField label={t('name')} required>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              disabled={loading}
            />
          </FormField>
        )}

        <FormField label={t('baseUrl')} hint={isCompatible ? undefined : t('baseUrlPlaceholderDefault')}>
          <Input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={isCompatible ? t('baseUrlPlaceholderRequired') : t('baseUrlPlaceholderDefault')}
            disabled={loading}
            required={isCompatible}
          />
        </FormField>

        <FormField
          label={isPlatform ? tu('fallbackModel') : tu('defaultModel')}
          hint={isPlatform ? tu('fallbackModelHint') : tu('defaultModelHint')}
        >
          <Select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            disabled={loading || models.length === 0}
          >
            <option value="">{tu('noDefaultModel')}</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.displayName ?? m.id}</option>
            ))}
          </Select>
        </FormField>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{t('providerStatus')}</span>
          <Toggle
            checked={enabled}
            onChange={setEnabled}
            disabled={loading}
            label={enabled ? t('enabled') : t('disabled')}
          />
        </div>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button type="submit" loading={loading} disabled={loading || !name.trim()}>
            {t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
