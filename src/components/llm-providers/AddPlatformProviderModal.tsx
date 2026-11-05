'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { CreatePlatformLlmProviderRequest, LlmProviderType } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import {
  DEFAULT_BASE_URL,
  DEFAULT_PROVIDER_TYPE,
  PROVIDER_TYPE_LABEL_KEY,
  normalizeBaseUrl,
  providerTypeOptions,
} from './providerTypes';

interface AddPlatformProviderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

// ADMIN-only. Creates a platform provider — there can be several, one per vendor,
// each with its own key and quotas, so the name is required and unique among
// them. Purpose assignments are not part of this form: they live on the Platform
// LLMs admin page. The row is created disabled; the free tier is turned on later
// via the enable toggle once quotas are set.
export default function AddPlatformProviderModal({ onClose, onSuccess }: AddPlatformProviderModalProps) {
  const t = useTranslations('LlmProviders');
  const tCommon = useTranslations('Common');
  const tu = useTranslations('LlmUsage');

  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState<LlmProviderType>(DEFAULT_PROVIDER_TYPE);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL[DEFAULT_PROVIDER_TYPE]);
  const [apiKey, setApiKey] = useState('');

  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const isCompatible = providerType === 'OPENAI_COMPATIBLE';

  const handleProviderTypeChange = (next: LlmProviderType) => {
    setProviderType(next);
    setBaseUrl(DEFAULT_BASE_URL[next]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRefreshError(null);

    const nextUrl = normalizeBaseUrl(baseUrl);
    if (isCompatible && !nextUrl) {
      setError(t('baseUrlRequired'));
      return;
    }

    setCreating(true);
    let createdId: string | null = null;
    try {
      const body: CreatePlatformLlmProviderRequest = {
        name: name.trim(),
        providerType,
        apiKey: apiKey.trim(),
        baseUrl: nextUrl || undefined,
      };
      const created = await apiService.createPlatformLlmProvider(body);
      createdId = created.id;
    } catch (err) {
      // A duplicate name is a 409 — the backend's message names the clash.
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

        <FormField label={t('name')} required hint={t('platformNameHint')}>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            disabled={busy}
          />
        </FormField>

        <FormField label={t('providerType')} required>
          <Select
            value={providerType}
            onChange={(e) => handleProviderTypeChange(e.target.value as LlmProviderType)}
            disabled={busy}
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
                {tCommon('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={busy || !name.trim() || !apiKey.trim() || (isCompatible && !normalizeBaseUrl(baseUrl))}
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
