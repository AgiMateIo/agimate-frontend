'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { LlmProviderResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Link } from '@/i18n/navigation';

interface AddAgentLlmModalProps {
  agentPubId: string;
  providers: LlmProviderResponse[];
  existingNames: Set<string>;
  onProvidersUpdate: (providers: LlmProviderResponse[]) => void;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAgentLlmModal({
  agentPubId,
  providers,
  existingNames,
  onProvidersUpdate,
  onClose,
  onSuccess,
}: AddAgentLlmModalProps) {
  const t = useTranslations('Agents');

  const [name, setName] = useState('');
  const [providerPubId, setProviderPubId] = useState<string>(providers[0]?.pubId ?? '');
  const [model, setModel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = providers.find(p => p.pubId === providerPubId);
  const selectedModels = selected?.availableModels ?? null;
  const noModelsYet = selectedModels === null || selectedModels.length === 0;

  const handleRefreshNow = async () => {
    if (!selected) return;
    setRefreshing(true);
    setError(null);
    try {
      const result = await apiService.refreshLlmProviderModels(selected.pubId);
      const updatedProviders = providers.map(p => p.pubId === selected.pubId
        ? { ...p, availableModels: result.availableModels, modelsRefreshedAt: result.refreshedAt }
        : p);
      onProvidersUpdate(updatedProviders);
      if (result.availableModels.length > 0) {
        setModel(result.availableModels[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh models');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerPubId || !model || !name.trim()) return;
    if (existingNames.has(name.trim())) {
      setError('A binding with this label already exists');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiService.createAgentLlm(agentPubId, {
        name: name.trim(),
        llmProviderPubId: providerPubId,
        model,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create binding');
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || refreshing;

  return (
    <Modal isOpen={true} onClose={onClose} title={t('addModelBinding')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {providers.length === 0 ? (
          <Alert variant="info">
            <p>{t('noProvidersAvailable')}</p>
            <Link
              href="/dashboard/llm-providers"
              className="inline-block mt-2 text-accent hover:text-accent/80 transition-colors text-sm"
            >
              {t('manageProviders')} →
            </Link>
          </Alert>
        ) : (
          <>
            <FormField
              label={t('bindingLabel')}
              required
              hint={t('bindingLabelHint')}
            >
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('bindingLabelPlaceholder')}
                required
                maxLength={100}
                disabled={busy}
              />
            </FormField>

            <FormField label={t('provider')} required>
              <select
                value={providerPubId}
                onChange={(e) => {
                  setProviderPubId(e.target.value);
                  setModel('');
                }}
                disabled={busy}
                className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground"
                required
              >
                {providers.map((p) => (
                  <option key={p.pubId} value={p.pubId}>
                    {p.name} {!p.enabled ? `(${t('providerDisabled')})` : ''}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={t('model')} required>
              {noModelsYet ? (
                <div className="space-y-2">
                  <p className="text-sm text-warning">{t('refreshProviderFirst')}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleRefreshNow}
                    loading={refreshing}
                    disabled={busy || !selected}
                  >
                    {t('refreshNow')}
                  </Button>
                </div>
              ) : (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={busy}
                  className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground"
                  required
                >
                  <option value="" disabled>{t('selectModel')}</option>
                  {selectedModels!.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </FormField>
          </>
        )}

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={busy || providers.length === 0 || noModelsYet || !name.trim() || !model}
            loading={submitting}
          >
            {t('addModelBinding')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
