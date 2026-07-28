'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { CreatePlatformLlmProviderRequest } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { LLM_PROVIDER_PRESETS, DEFAULT_PROVIDER_PRESET } from './providerPresets';

interface AddPlatformProviderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

// ADMIN-only. Creates the singleton platform provider. Unlike the personal-provider
// form there is no name field (the backend forces `name: "platform"`), and the row
// is created disabled — the free-tier is turned on later via the enable toggle once
// quotas are set.
export default function AddPlatformProviderModal({ onClose, onSuccess }: AddPlatformProviderModalProps) {
  const t = useTranslations('LlmProviders');
  const tu = useTranslations('LlmUsage');

  const [presetKey, setPresetKey] = useState(DEFAULT_PROVIDER_PRESET.key);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_PROVIDER_PRESET.defaultBaseUrl);
  const [apiKey, setApiKey] = useState('');
  const [chatModel, setChatModel] = useState('');

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRefreshError(null);

    if (isCompatible && !baseUrl.trim()) {
      setError(t('baseUrlRequired'));
      return;
    }

    setCreating(true);
    let createdId: string | null = null;
    try {
      const body: CreatePlatformLlmProviderRequest = {
        providerType,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined,
        // The registry is empty at creation time, so any id is accepted here.
        // Vision/image lists are configured afterwards, once models are fetched.
        purposePriority: chatModel.trim() ? { CHAT: [chatModel.trim()] } : undefined,
      };
      const created = await apiService.createPlatformLlmProvider(body);
      createdId = created.id;
    } catch (err) {
      // Backend rejects a second platform provider with a 409 message (singleton),
      // surfaced here directly. The trigger is already hidden when one exists.
      setError(getErrorMessage(err, tu('platformCreateFailed')));
      setCreating(false);
      return;
    }
    setCreating(false);

    // Auto-refresh models — also serves as credential verification.
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
    <Modal isOpen={true} onClose={busy ? () => {} : onClose} title={tu('createPlatformProvider')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Alert variant="info">{tu('platformCreateHint')}</Alert>

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
            onChange={(e) => setBaseUrl(e.target.value)}
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

        <FormField label={tu('fallbackModel')} hint={tu('fallbackModelHint')}>
          <Input
            type="text"
            value={chatModel}
            onChange={(e) => setChatModel(e.target.value)}
            placeholder="gpt-5-mini"
            disabled={busy}
          />
        </FormField>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        {refreshing && <Alert variant="info">{t('verifyingCredentials')}</Alert>}

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
                disabled={busy || !apiKey.trim() || (isCompatible && !baseUrl.trim())}
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
