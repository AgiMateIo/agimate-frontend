'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { useRouter } from '@/i18n/navigation';
import { useLlmProviderCatalogQuery, useLlmProviderCacheActions } from '@/queries/llm-providers';
import {
  AgentLlmPurpose,
  CreateLlmProviderRequest,
  LlmProviderCatalogEntry,
  LlmProviderType,
  LlmPurposePriority,
} from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { Chip } from '@/components/ui/Chip';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import {
  DEFAULT_BASE_URL,
  DEFAULT_PROVIDER_TYPE,
  PROVIDER_TYPE_LABEL_KEY,
  deriveProviderNameFromUrl,
  providerTypeOptions,
  suggestMediaTransport,
} from './providerTypes';
import { LLM_PURPOSES, purposeLabelKey, unusableSeededModels } from './llmPurpose';
import { LlmProviderCatalogPicker } from './LlmProviderCatalogPicker';
import { MediaTransportField, type MediaTransportChoice } from './MediaTransportField';
import { ExtraBodyField } from './ExtraBodyField';
import { parseExtraBodyInput } from './extraBody';

interface AddLlmProviderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

// null — the catalog step is still on screen; 'manual' — the user declined it.
type Chosen = LlmProviderCatalogEntry | 'manual' | null;

export default function AddLlmProviderModal({ onClose, onSuccess }: AddLlmProviderModalProps) {
  const t = useTranslations('LlmProviders');
  const tc = useTranslations('Common');
  const router = useRouter();
  const { setProviderModels } = useLlmProviderCacheActions();

  // Both an empty catalog and a failed fetch land on the same behaviour: the form
  // opens blank, exactly as it did before the catalog existed.
  const catalogQuery = useLlmProviderCatalogQuery();
  const entries = catalogQuery.data ?? [];

  const [chosen, setChosen] = useState<Chosen>(null);
  const [providerType, setProviderType] = useState<LlmProviderType>(DEFAULT_PROVIDER_TYPE);
  const [name, setName] = useState(deriveProviderNameFromUrl(DEFAULT_BASE_URL[DEFAULT_PROVIDER_TYPE]));
  // Whether the user has manually typed a name. While false, the name tracks the URL domain.
  const [nameEdited, setNameEdited] = useState(false);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL[DEFAULT_PROVIDER_TYPE]);
  const [apiKey, setApiKey] = useState('');
  const [extraBodyText, setExtraBodyText] = useState('');
  const [mediaTransport, setMediaTransport] = useState<MediaTransportChoice>('');
  // Once the user picks a transport, the URL stops steering it.
  const [mediaTransportEdited, setMediaTransportEdited] = useState(false);
  // Purpose lists seeded from the catalog. Sent as-is on create and reconciled
  // against the model registry once refresh-models has run.
  const [seedPriority, setSeedPriority] = useState<LlmPurposePriority | null>(null);
  const [apiKeyUrl, setApiKeyUrl] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  // Set when the provider was created and its seeded models turned out unusable.
  const [seedMismatch, setSeedMismatch] = useState<
    { providerId: string; unusable: { purpose: AgentLlmPurpose; model: string }[] } | null
  >(null);

  const isCompatible = providerType === 'OPENAI_COMPATIBLE';

  // Only a host that actually needs the media endpoint moves the control off
  // "default" — for everything else the field stays unsent, exactly as before.
  const suggestTransport = (url: string) => {
    if (mediaTransportEdited) return;
    setMediaTransport(suggestMediaTransport(url) === 'MEDIA_ENDPOINT' ? 'MEDIA_ENDPOINT' : '');
  };

  // Pre-fill, not a preset mode: everything written here stays editable.
  const applyCatalogEntry = (entry: LlmProviderCatalogEntry) => {
    const url = entry.baseUrl ?? DEFAULT_BASE_URL[entry.providerType];
    setProviderType(entry.providerType);
    setBaseUrl(url);
    if (!nameEdited) setName(deriveProviderNameFromUrl(url));
    // `null` is the catalog stating "the default transport", so it settles the
    // field too — the host-based guess must not override a shipped answer.
    setMediaTransport(entry.mediaTransport ?? '');
    setMediaTransportEdited(true);
    setSeedPriority(entry.purposePriority ?? null);
    setApiKeyUrl(entry.apiKeyUrl ?? null);
    setChosen(entry);
  };

  const applyManual = () => {
    setProviderType(DEFAULT_PROVIDER_TYPE);
    setBaseUrl(DEFAULT_BASE_URL[DEFAULT_PROVIDER_TYPE]);
    if (!nameEdited) setName(deriveProviderNameFromUrl(DEFAULT_BASE_URL[DEFAULT_PROVIDER_TYPE]));
    setMediaTransport('');
    setMediaTransportEdited(false);
    setSeedPriority(null);
    setApiKeyUrl(null);
    setChosen('manual');
  };

  const handleProviderTypeChange = (next: LlmProviderType) => {
    setProviderType(next);
    setBaseUrl(DEFAULT_BASE_URL[next]);
    if (!nameEdited) setName(deriveProviderNameFromUrl(DEFAULT_BASE_URL[next]));
    suggestTransport(DEFAULT_BASE_URL[next]);
  };

  const handleBaseUrlChange = (value: string) => {
    setBaseUrl(value);
    if (!nameEdited) setName(deriveProviderNameFromUrl(value));
    suggestTransport(value);
  };

  const handleMediaTransportChange = (value: MediaTransportChoice) => {
    setMediaTransport(value);
    setMediaTransportEdited(true);
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
        mediaTransport: mediaTransport || undefined,
        purposePriority: seedPriority ?? undefined,
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

    // Auto-refresh models — also serves as credential verification, and the only
    // point at which catalog-seeded models can be checked against reality.
    setRefreshing(true);
    try {
      const { models } = await apiService.refreshLlmProviderModels(createdId);
      setProviderModels(createdId, models);
      const unusable = unusableSeededModels(seedPriority, models);
      if (unusable.length > 0) {
        setSeedMismatch({ providerId: createdId, unusable });
      } else {
        onSuccess();
      }
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
  // The catalog can only be skipped once it is known to be empty (or unavailable).
  const showPicker = chosen === null && !seedMismatch && (catalogQuery.isLoading || entries.length > 0);

  if (showPicker) {
    return (
      <Modal isOpen={true} onClose={onClose} title={t('catalogTitle')} size="xl">
        {catalogQuery.isLoading ? (
          <p className="text-sm text-muted py-8 text-center">{tc('loading')}</p>
        ) : (
          <LlmProviderCatalogPicker
            entries={entries}
            onSelect={applyCatalogEntry}
            onManual={applyManual}
          />
        )}
      </Modal>
    );
  }

  if (seedMismatch) {
    const goToProvider = () => {
      onSuccess();
      router.push(`/dashboard/llm-providers/${seedMismatch.providerId}`);
    };

    return (
      <Modal isOpen={true} onClose={onSuccess} title={t('addProvider')}>
        <div className="space-y-4">
          <Alert variant="warning">
            <p className="font-medium">{t('seedMismatchTitle')}</p>
            <p className="text-xs mt-1">{t('seedMismatchHint')}</p>
          </Alert>

          <ul className="border border-border rounded-lg divide-y divide-border/50">
            {seedMismatch.unusable.map(({ purpose, model }) => (
              <li key={`${purpose}:${model}`} className="flex items-center gap-2 px-3 py-2">
                <Chip tone={purpose === 'CHAT' ? 'default' : 'accent'}>{t(purposeLabelKey[purpose])}</Chip>
                <span className="text-sm font-mono text-foreground truncate">{model}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onSuccess}>
              {t('later')}
            </Button>
            <Button type="button" onClick={goToProvider}>
              {t('configurePurposes')}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Purposes the catalog pre-filled, in the canonical order. An empty list is the
  // deliberate off switch, so it must not read as "nothing configured".
  const seededRows = LLM_PURPOSES.filter((purpose) => seedPriority?.[purpose] !== undefined).map((purpose) => ({
    purpose,
    models: seedPriority?.[purpose] ?? [],
  }));

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

        <MediaTransportField
          value={mediaTransport}
          onChange={handleMediaTransportChange}
          disabled={busy}
        />

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

        {apiKeyUrl && (
          <a
            href={apiKeyUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" />
            {t('apiKeyWhereToGet')}
          </a>
        )}

        {seededRows.length > 0 && (
          <div className="rounded-lg border border-border bg-surface-secondary p-3 space-y-2">
            <p className="text-sm font-medium text-foreground">{t('seedTitle')}</p>
            <ul className="space-y-1.5">
              {seededRows.map(({ purpose, models }) => (
                <li key={purpose} className="flex items-start gap-2">
                  <Chip tone={purpose === 'CHAT' ? 'default' : 'accent'}>{t(purposeLabelKey[purpose])}</Chip>
                  <span className="text-xs text-muted min-w-0 pt-0.5">
                    {models.length > 0 ? (
                      <span className="font-mono break-all">{models.join(' → ')}</span>
                    ) : (
                      t('purposeStateOff')
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">{t('seedHint')}</p>
          </div>
        )}

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
              {entries.length > 0 ? (
                <Button type="button" variant="secondary" onClick={() => setChosen(null)} disabled={busy}>
                  {tc('back')}
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
                  {t('cancel')}
                </Button>
              )}
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
