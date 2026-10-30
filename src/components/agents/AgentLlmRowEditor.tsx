'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { XMarkIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { AgentLlmBindingRequest, AgentLlmPurpose, LlmProviderResponse } from '@/types';
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
  purpose: AgentLlmPurpose;
  // The purpose's chain in attempt order — a PUT sends it back with the edited
  // position substituted.
  chain: AgentLlmBindingRequest[];
  // The position being replaced; null = append a new link.
  index: number | null;
  // Already filtered to bindable providers (no platform row) by the caller.
  providers: LlmProviderResponse[];
  onCancel: () => void;
  onSuccess: () => void;
}

// Inline editor for one link of a purpose's chain: appended with POST, replaced
// with a PUT of the whole chain (there is no single-link endpoint).
export default function AgentLlmRowEditor({
  agentId,
  purpose,
  chain,
  index,
  providers,
  onCancel,
  onSuccess,
}: AgentLlmRowEditorProps) {
  const t = useTranslations('Agents');
  const tCommon = useTranslations('Common');
  const tp = useTranslations('LlmProviders');

  const current = index === null ? undefined : chain[index];
  const initialProvider = current?.llmProviderId ?? providers[0]?.id ?? '';
  const [providerId, setProviderId] = useState(initialProvider);
  // On a fresh link the provider's own first choice for this purpose is a
  // preselect; nothing more — the binding that gets saved is whatever is here.
  const initialProviderRow = providers.find((p) => p.id === initialProvider);
  const [model, setModel] = useState(
    current?.model ?? (initialProviderRow ? firstPurposeModel(initialProviderRow, purpose) : null) ?? ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = model.trim();
  // The backend rejects a pair that is already in the chain (400); catching it
  // here keeps the obvious mistake from costing a request.
  const duplicate =
    !!value &&
    chain.some((b, i) => i !== index && b.llmProviderId === providerId && b.model === value);

  // The purpose's modality demand, resolved to a sentence for the picker's warnings
  // and shown as the field hint — the free-text case has no metadata to check.
  const requirement = {
    ...purposeRequirement[purpose],
    label: tp(purposeRequirementLabelKey[purpose]),
  };

  const handleSubmit = async () => {
    if (!providerId || !value || duplicate) return;
    setSubmitting(true);
    setError(null);
    try {
      if (index === null) {
        await apiService.createAgentLlm(agentId, { llmProviderId: providerId, model: value, purpose });
      } else {
        const bindings = chain.map((b, i) =>
          i === index ? { llmProviderId: providerId, model: value } : b
        );
        await apiService.updateAgentLlm(agentId, purpose, { bindings });
      }
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save model'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface-secondary border-l-2 border-accent px-4 py-4 space-y-4 rounded-lg">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">
          {tp(purposeLabelKey[purpose])}
          {index !== null && (
            <span className="text-muted font-normal"> · {t('chainLinkLabel', { index: index + 1 })}</span>
          )}
        </span>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          aria-label={tCommon('cancel')}
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

      {duplicate ? (
        <ErrorAlert>{t('duplicateBinding')}</ErrorAlert>
      ) : (
        error && <ErrorAlert>{error}</ErrorAlert>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={submitting || !value || duplicate}
          loading={submitting}
        >
          {tCommon('save')}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          {tCommon('cancel')}
        </Button>
      </div>
    </div>
  );
}
