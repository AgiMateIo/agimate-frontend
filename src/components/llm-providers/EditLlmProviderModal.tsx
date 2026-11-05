'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { LlmProviderResponse, LlmProviderType, UpdateLlmProviderRequest } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { Toggle } from '@/components/ui/Toggle';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { ExtraBodyField } from './ExtraBodyField';
import { formatExtraBody, parseExtraBodyInput } from './extraBody';
import { MediaTransportField, type MediaTransportChoice } from './MediaTransportField';
import { PROVIDER_TYPE_LABEL_KEY, normalizeBaseUrl, providerTypeOptions } from './providerTypes';

interface EditLlmProviderModalProps {
  provider: LlmProviderResponse;
  onClose: () => void;
  onSuccess: (updated: LlmProviderResponse) => void;
}

// Credentials and connection settings only — which model serves which purpose is
// its own screen (ProviderPurposesSection), since it needs the model registry.
export default function EditLlmProviderModal({ provider, onClose, onSuccess }: EditLlmProviderModalProps) {
  const t = useTranslations('LlmProviders');
  const tCommon = useTranslations('Common');
  const [name, setName] = useState(provider.name);
  // Changing the type no longer means recreating the provider: the key, the
  // model registry and agent bindings survive, so this is an ordinary field.
  const [providerType, setProviderType] = useState<LlmProviderType>(provider.providerType);
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl ?? '');
  const [baseUrlError, setBaseUrlError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(provider.enabled);
  // A provider saved before the field existed answers null; that maps to "default",
  // and leaving it alone keeps the request free of the key.
  const [mediaTransport, setMediaTransport] = useState<MediaTransportChoice>(
    provider.mediaTransport ?? ''
  );
  const [extraBodyText, setExtraBodyText] = useState(formatExtraBody(provider.extraBody));

  const isCompatible = providerType === 'OPENAI_COMPATIBLE';

  const { loading, error, handleSubmit, setError } = useAsyncForm<LlmProviderResponse>({
    onSuccess: (updated) => onSuccess(updated),
    defaultError: 'Failed to update provider',
  });

  const handleProviderTypeChange = (next: LlmProviderType) => {
    setProviderType(next);
    setBaseUrlError(null);
  };

  const onSubmit = (e: React.FormEvent) => {
    const parsedExtraBody = parseExtraBodyInput(extraBodyText);
    if (!parsedExtraBody.ok) {
      e.preventDefault();
      setError(t(parsedExtraBody.errorKey));
      return;
    }
    // The backend validates the type and URL as the pair that results, and
    // refuses OPENAI_COMPATIBLE without a URL from either source. Check it here
    // so the refusal lands under the field instead of in the generic alert.
    const nextUrl = normalizeBaseUrl(baseUrl);
    if (isCompatible && !nextUrl) {
      e.preventDefault();
      setBaseUrlError(t('baseUrlRequired'));
      return;
    }
    handleSubmit(e, () => {
      const body: UpdateLlmProviderRequest = {};
      // Renaming is allowed for platform rows too — the name is unique among
      // the platform providers, and a duplicate answers 409.
      if (name.trim() !== provider.name) body.name = name.trim();
      if (providerType !== provider.providerType) body.providerType = providerType;
      if (nextUrl !== (provider.baseUrl ?? '').trim()) {
        body.baseUrl = nextUrl;
      }
      if (enabled !== provider.enabled) body.enabled = enabled;
      // PATCH has no way to write the field back to null, so moving off
      // MEDIA_ENDPOINT sends CHAT_MODALITIES explicitly — behaviourally the same
      // as the null default, and the only value the endpoint accepts.
      if (mediaTransport !== (provider.mediaTransport ?? '')) {
        body.mediaTransport = mediaTransport || 'CHAT_MODALITIES';
      }
      // PATCH semantics: absent = keep; {} = clear the stored value.
      if (JSON.stringify(parsedExtraBody.value) !== JSON.stringify(provider.extraBody ?? null)) {
        body.extraBody = parsedExtraBody.value ?? {};
      }
      return apiService.updateLlmProvider(provider.id, body);
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('editProvider')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          label={t('name')}
          required
          hint={provider.platform ? t('platformNameHint') : undefined}
        >
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            disabled={loading}
          />
        </FormField>

        <FormField label={t('providerType')} required>
          <Select
            value={providerType}
            onChange={(e) => handleProviderTypeChange(e.target.value as LlmProviderType)}
            disabled={loading}
          >
            {providerTypeOptions(providerType).map((type) => (
              <option key={type} value={type}>
                {t(PROVIDER_TYPE_LABEL_KEY[type])}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label={t('baseUrl')}
          required={isCompatible}
          hint={isCompatible ? t('baseUrlHint') : t('baseUrlHintDefault')}
          error={baseUrlError ?? undefined}
        >
          <Input
            type="url"
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value);
              setBaseUrlError(null);
            }}
            placeholder={isCompatible ? t('baseUrlPlaceholderRequired') : t('baseUrlPlaceholderDefault')}
            disabled={loading}
          />
        </FormField>

        <MediaTransportField
          value={mediaTransport}
          onChange={setMediaTransport}
          disabled={loading}
        />

        <ExtraBodyField value={extraBodyText} onChange={setExtraBodyText} baseUrl={baseUrl} disabled={loading} />

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
            {tCommon('cancel')}
          </Button>
          <Button type="submit" loading={loading} disabled={loading || !name.trim()}>
            {tCommon('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
