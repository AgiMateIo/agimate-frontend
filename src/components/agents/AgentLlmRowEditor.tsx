'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { XMarkIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { AgentLlmPurpose, AgentLlmResponse, LlmProviderResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Button } from '@/components/ui/Button';
import { FormField, Select } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ModelField } from '@/components/llm-providers/ModelField';
import {
  firstPurposeModel,
  purposeLabelKey,
  purposeRequirement,
  purposeRequirementLabelKey,
} from '@/components/llm-providers/llmPurpose';

interface AgentLlmRowEditorProps {
  agentId: string;
  // The purpose being edited — it is the binding's identity and never changes
  // here (moving a model to another purpose = clear one row, fill another).
  purpose: AgentLlmPurpose;
  // The current binding of this purpose, when it has one — its presence decides
  // create (POST) vs replace (PUT), so a 409 is never reachable.
  binding?: AgentLlmResponse;
  // Already filtered to bindable providers (no platform row) by the caller.
  providers: LlmProviderResponse[];
  onCancel: () => void;
  onSuccess: () => void;
}

// Inline editor that takes over one row of the models table.
export default function AgentLlmRowEditor({
  agentId,
  purpose,
  binding,
  providers,
  onCancel,
  onSuccess,
}: AgentLlmRowEditorProps) {
  const t = useTranslations('Agents');
  const tp = useTranslations('LlmProviders');

  const initialProvider = binding?.llmProviderId ?? providers[0]?.id ?? '';
  const [providerId, setProviderId] = useState(initialProvider);
  // On a fresh row the provider's own first choice for this purpose is a
  // preselect; nothing more — the binding that gets saved is whatever is here.
  const initialProviderRow = providers.find((p) => p.id === initialProvider);
  const [model, setModel] = useState(
    binding?.model ?? (initialProviderRow ? firstPurposeModel(initialProviderRow, purpose) : null) ?? ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The purpose's modality demand, resolved to a sentence for the picker's warnings
  // and shown as the field hint — the free-text case has no metadata to check.
  const requirement = {
    ...purposeRequirement[purpose],
    label: tp(purposeRequirementLabelKey[purpose]),
  };

  const handleSubmit = async () => {
    if (!providerId || !model.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = { llmProviderId: providerId, model: model.trim() };
      if (binding) {
        await apiService.updateAgentLlm(agentId, purpose, body);
      } else {
        await apiService.createAgentLlm(agentId, { ...body, purpose });
      }
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save model'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface-secondary border-l-2 border-accent px-4 py-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{tp(purposeLabelKey[purpose])}</span>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          aria-label={t('cancel')}
          className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* The provider is one line of text; the model is a searchable list with
          filters. Splitting the row evenly starved the picker and stretched the
          select — give the picker two thirds. */}
      <div className="grid gap-4 md:grid-cols-3 md:items-start">
        <FormField label={t('provider')} required>
          <Select
            value={providerId}
            onChange={(e) => {
              const next = providers.find((p) => p.id === e.target.value);
              setProviderId(e.target.value);
              setModel((next && firstPurposeModel(next, purpose)) ?? '');
            }}
            disabled={submitting}
            required
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {!p.enabled ? `(${t('providerDisabled')})` : ''}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="md:col-span-2">
          <FormField label={t('model')} required hint={requirement.label}>
            <ModelField
              providerId={providerId}
              value={model}
              onChange={setModel}
              disabled={submitting}
              // Re-key on provider change so search/filter state starts clean.
              pickerKey={providerId}
              requirement={requirement}
              onError={setError}
            />
          </FormField>
        </div>
      </div>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={submitting || !model.trim()} loading={submitting}>
          {t('save')}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
}
