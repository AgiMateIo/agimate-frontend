'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AgentLlmPurpose, AgentLlmResponse, LlmProviderResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, Select } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useLlmProviderCacheActions, useLlmProviderModelsQuery } from '@/queries/llm-providers';
import { ModelPickerList } from '@/components/llm-providers/ModelPickerList';
import { purposeQuickFilters, PurposeSelect } from './agentLlmPurpose';

interface EditAgentLlmModalProps {
  agentId: string;
  binding: AgentLlmResponse;
  providers: LlmProviderResponse[];
  // True when this is the agent's only CHAT binding — reassigning its role
  // would drop the agent's chat model to the platform fallback.
  isLastChatBinding: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditAgentLlmModal({
  agentId,
  binding,
  providers,
  isLastChatBinding,
  onClose,
  onSuccess,
}: EditAgentLlmModalProps) {
  const t = useTranslations('Agents');

  // Only USER bindings reach this modal, so llmProviderId is always set here.
  const [providerId, setProviderId] = useState(binding.llmProviderId ?? '');
  const [model, setModel] = useState(binding.model);
  const [purpose, setPurpose] = useState<AgentLlmPurpose>(binding.purpose ?? 'CHAT');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = providers.find(p => p.id === providerId);
  const modelsQuery = useLlmProviderModelsQuery(providerId);
  const { setProviderModels } = useLlmProviderCacheActions();
  const models = modelsQuery.data ?? [];
  const noModelsYet = modelsQuery.isSuccess && models.length === 0;

  const handleRefreshNow = async () => {
    if (!selected) return;
    setRefreshing(true);
    setError(null);
    try {
      const result = await apiService.refreshLlmProviderModels(selected.id);
      setProviderModels(selected.id, result.models);
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
        purpose,
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
        <FormField label={t('purpose')} hint={t('purposeHint')}>
          <PurposeSelect value={purpose} onChange={setPurpose} disabled={busy} />
        </FormField>

        {isLastChatBinding && purpose !== 'CHAT' && (
          <Alert variant="warning">{t('lastChatBindingWarning')}</Alert>
        )}

        <FormField label={t('provider')} required>
          <Select
            value={providerId}
            onChange={(e) => {
              setProviderId(e.target.value);
              setModel('');
            }}
            disabled={busy}
            required
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {!p.enabled ? `(${t('providerDisabled')})` : ''}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('model')} required>
          {modelsQuery.isPending ? (
            <p className="text-sm text-muted">{t('loadingModels')}</p>
          ) : noModelsYet ? (
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
            // Keyed by provider + purpose so search/filter state resets on
            // provider change and the capability hint re-seeds on role change.
            // A model missing from the registry is flagged on the picker's card.
            <ModelPickerList
              key={`${providerId}:${purpose}`}
              models={models}
              value={model}
              onChange={setModel}
              disabled={busy}
              initialQuickFilters={purpose !== binding.purpose ? purposeQuickFilters[purpose] : []}
            />
          )}
        </FormField>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={busy || !model}
            loading={submitting}
          >
            {t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
