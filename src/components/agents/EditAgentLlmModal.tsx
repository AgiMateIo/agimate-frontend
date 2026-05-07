'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgentLlmResponse, LlmProviderResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

interface EditAgentLlmModalProps {
  agentPubId: string;
  binding: AgentLlmResponse;
  providers: LlmProviderResponse[];
  onProvidersUpdate: (providers: LlmProviderResponse[]) => void;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditAgentLlmModal({
  agentPubId,
  binding,
  providers,
  onProvidersUpdate,
  onClose,
  onSuccess,
}: EditAgentLlmModalProps) {
  const t = useTranslations('Agents');

  const [providerPubId, setProviderPubId] = useState(binding.llmProviderPubId);
  const [model, setModel] = useState(binding.model);
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
      const updated = providers.map(p => p.pubId === selected.pubId
        ? { ...p, availableModels: result.availableModels, modelsRefreshedAt: result.refreshedAt }
        : p);
      onProvidersUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh models');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerPubId || !model) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiService.updateAgentLlm(agentPubId, binding.name, {
        llmProviderPubId: providerPubId,
        model,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update binding');
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || refreshing;

  return (
    <Modal isOpen={true} onClose={onClose} title={`${t('editModelBinding')}: ${binding.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
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

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={busy || noModelsYet || !model}
            loading={submitting}
          >
            {t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
