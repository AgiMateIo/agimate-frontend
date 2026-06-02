'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { CreateLlmProviderRequest, LlmProviderType } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

interface AddLlmProviderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PROVIDER_TYPES: LlmProviderType[] = ['OPENAI', 'ANTHROPIC', 'GEMINI', 'OPENAI_COMPATIBLE'];

const providerTypeLabelKey: Record<LlmProviderType, string> = {
  OPENAI: 'providerTypeOpenAI',
  ANTHROPIC: 'providerTypeAnthropic',
  GEMINI: 'providerTypeGemini',
  OPENAI_COMPATIBLE: 'providerTypeOpenAICompatible',
};

export default function AddLlmProviderModal({ onClose, onSuccess }: AddLlmProviderModalProps) {
  const t = useTranslations('LlmProviders');

  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState<LlmProviderType>('OPENAI');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const isCompatible = providerType === 'OPENAI_COMPATIBLE';

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
      const body: CreateLlmProviderRequest = {
        name: name.trim(),
        providerType,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined,
      };
      const created = await apiService.createLlmProvider(body);
      createdId = created.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create provider');
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
      setRefreshError(err instanceof Error ? err.message : t('refreshFailed'));
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
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            required
            maxLength={100}
            disabled={busy}
          />
        </FormField>

        <FormField label={t('providerType')} required>
          <select
            value={providerType}
            onChange={(e) => setProviderType(e.target.value as LlmProviderType)}
            disabled={busy}
            className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground"
          >
            {PROVIDER_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(providerTypeLabelKey[type])}
              </option>
            ))}
          </select>
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
