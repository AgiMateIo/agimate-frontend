'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgentLlmResponse, LlmProviderResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

interface EditAgentLlmModalProps {
  agentId: string;
  binding: AgentLlmResponse;
  providers: LlmProviderResponse[];
  onProvidersUpdate: (providers: LlmProviderResponse[]) => void;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditAgentLlmModal({
  agentId,
  binding,
  providers,
  onProvidersUpdate,
  onClose,
  onSuccess,
}: EditAgentLlmModalProps) {
  const t = useTranslations('Agents');

  // Only USER bindings reach this modal, so llmProviderId is always set here.
  const [providerId, setProviderId] = useState(binding.llmProviderId ?? '');
  const [model, setModel] = useState(binding.model);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = providers.find(p => p.id === providerId);
  const selectedModels = selected?.availableModels ?? null;
  const noModelsYet = selectedModels === null || selectedModels.length === 0;

  const handleRefreshNow = async () => {
    if (!selected) return;
    setRefreshing(true);
    setError(null);
    try {
      const result = await apiService.refreshLlmProviderModels(selected.id);
      const updated = providers.map(p => p.id === selected.id
        ? { ...p, availableModels: result.availableModels, modelsRefreshedAt: result.refreshedAt }
        : p);
      onProvidersUpdate(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to refresh models'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId || !model) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiService.updateAgentLlm(agentId, binding.name, {
        llmProviderId: providerId,
        model,
      });
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update binding'));
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
            value={providerId}
            onChange={(e) => {
              setProviderId(e.target.value);
              setModel('');
            }}
            disabled={busy}
            className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground"
            required
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
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
                <option key={m.id} value={m.id} title={m.displayName ? m.id : undefined}>
                  {m.displayName ?? m.id}
                </option>
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
