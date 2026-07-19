'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { CreateLlmProviderRequest } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import {
  LLM_PROVIDER_PRESETS,
  DEFAULT_PROVIDER_PRESET,
  deriveProviderNameFromUrl,
} from './providerPresets';
import { ExtraBodyField } from './ExtraBodyField';
import { parseExtraBodyInput } from './extraBody';

interface AddLlmProviderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddLlmProviderModal({ onClose, onSuccess }: AddLlmProviderModalProps) {
  const t = useTranslations('LlmProviders');

  const [presetKey, setPresetKey] = useState(DEFAULT_PROVIDER_PRESET.key);
  const [name, setName] = useState(deriveProviderNameFromUrl(DEFAULT_PROVIDER_PRESET.defaultBaseUrl));
  // Whether the user has manually typed a name. While false, the name tracks the URL domain.
  const [nameEdited, setNameEdited] = useState(false);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_PROVIDER_PRESET.defaultBaseUrl);
  const [apiKey, setApiKey] = useState('');
  const [extraBodyText, setExtraBodyText] = useState('');

  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const preset = LLM_PROVIDER_PRESETS.find((p) => p.key === presetKey) ?? DEFAULT_PROVIDER_PRESET;
  const providerType = preset.providerType;
  const isCompatible = providerType === 'OPENAI_COMPATIBLE';

  const handlePresetChange = (key: string) => {
    setPresetKey(key);
    const next = LLM_PROVIDER_PRESETS.find((p) => p.key === key) ?? DEFAULT_PROVIDER_PRESET;
    setBaseUrl(next.defaultBaseUrl);
    if (!nameEdited) setName(deriveProviderNameFromUrl(next.defaultBaseUrl));
  };

  const handleBaseUrlChange = (value: string) => {
    setBaseUrl(value);
    if (!nameEdited) setName(deriveProviderNameFromUrl(value));
  };

  const handleNameChange = (value: string) => {
    setName(value);
    // Resume auto-deriving from the URL once the user clears the field again.
    setNameEdited(value.trim() !== '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRefreshError(null);

    if (isCompatible && !baseUrl.trim()) {
      setError(t('baseUrlRequired'));
      return;
    }

    const parsedExtraBody = parseExtraBodyInput(extraBodyText);
    if (!parsedExtraBody.ok) {
      setError(t(parsedExtraBody.errorKey));
      return;
    }

    setCreating(true);
    let createdId: string | null = null;
    try {
      const body: CreateLlmProviderRequest = {
        name: name.trim(),
        providerType,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined,
        extraBody: parsedExtraBody.value ?? undefined,
      };
      const created = await apiService.createLlmProvider(body);
      createdId = created.id;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create provider'));
      setCreating(false);
      return;
    }
    setCreating(false);

    // Auto-refresh models — also serves as credential verification
    setRefreshing(true);
    try {
      await apiService.refreshLlmProviderModels(createdId);
      onSuccess();
    } catch (err) {
      setRefreshError(getErrorMessage(err, t('refreshFailed')));
    } finally {
      setRefreshing(false);
    }
  };

  const handleAcknowledgeRefreshError = () => {
    onSuccess();
  };

  const busy = creating || refreshing;

  return (
    <Modal isOpen={true} onClose={busy ? () => {} : onClose} title={t('addProvider')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label={t('name')} required>
          <Input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={t('namePlaceholder')}
            required
            maxLength={100}
            disabled={busy}
          />
        </FormField>

        <FormField label={t('providerType')} required>
          <Select
            value={presetKey}
            onChange={(e) => handlePresetChange(e.target.value)}
            disabled={busy}
          >
            {LLM_PROVIDER_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {t(p.labelKey)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label={t('baseUrl')}
          required={isCompatible}
          hint={isCompatible ? undefined : t('baseUrlPlaceholderDefault')}
        >
          <Input
            type="url"
            value={baseUrl}
            onChange={(e) => handleBaseUrlChange(e.target.value)}
            placeholder={isCompatible ? t('baseUrlPlaceholderRequired') : t('baseUrlPlaceholderDefault')}
            disabled={busy}
            required={isCompatible}
          />
        </FormField>

        <FormField label={t('apiKey')} required hint={t('apiKeyHint')}>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t('apiKeyPlaceholder')}
            required
            disabled={busy}
          />
        </FormField>

        <ExtraBodyField value={extraBodyText} onChange={setExtraBodyText} disabled={busy} />

        {error && <ErrorAlert>{error}</ErrorAlert>}

        {refreshing && (
          <Alert variant="info">{t('verifyingCredentials')}</Alert>
        )}

        {refreshError && (
          <Alert variant="warning">
            <p className="font-medium">{t('refreshFailedAfterCreate')}</p>
            <p className="text-xs mt-1">{refreshError}</p>
          </Alert>
        )}

        <div className="flex gap-3 pt-2">
          {refreshError ? (
            <Button type="button" onClick={handleAcknowledgeRefreshError} className="w-full">
              {t('ok')}
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={busy || !name.trim() || !apiKey.trim() || (isCompatible && !baseUrl.trim())}
                loading={busy}
              >
                {t('create')}
              </Button>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}
