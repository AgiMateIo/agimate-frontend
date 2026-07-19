'use client';

import { ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EyeIcon, ExclamationTriangleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { LlmProviderModelResponse } from '@/types';
import { Chip } from '@/components/ui/Chip';
import { Select } from '@/components/ui/FormField';
import { ModelCapabilityFilters } from '@/components/llm-providers/ModelCapabilityFilters';
import {
  EMPTY_CAPABILITY_FILTER,
  hasActiveCapabilityFilter,
  hasCapability,
  isVisionModel,
  matchCapabilityFilter,
} from '@/components/llm-providers/modelRegistry';

// <option> rows for a model registry inside a native Select. UNAVAILABLE models
// stay selectable (status is advisory) but are marked in the label.
export function ModelOptionList({ models }: { models: LlmProviderModelResponse[] }) {
  const t = useTranslations('LlmProviders');
  return (
    <>
      {models.map((m) => (
        <option key={m.id} value={m.model} title={m.displayName ? m.model : undefined}>
          {m.displayName ?? m.model}
          {m.status === 'UNAVAILABLE' ? ` — ${t('modelUnavailable')}` : ''}
        </option>
      ))}
    </>
  );
}

// Model picker for agent bindings: capability filter axes above a native Select.
// Models whose capabilities are unknown (null fields) are never silently hidden
// by an active filter — they drop into a labeled optgroup instead. The current
// selection also stays visible even when the filter would exclude it.
export function ModelSelectWithFilters({
  models,
  model,
  onChange,
  disabled,
  children,
}: {
  models: LlmProviderModelResponse[];
  model: string;
  onChange: (model: string) => void;
  disabled?: boolean;
  // Modal-specific extra options (e.g. a bound model missing from the registry).
  children?: ReactNode;
}) {
  const t = useTranslations('Agents');
  const tp = useTranslations('LlmProviders');
  const [capFilter, setCapFilter] = useState(EMPTY_CAPABILITY_FILTER);
  const filterActive = hasActiveCapabilityFilter(capFilter);

  const matched: LlmProviderModelResponse[] = [];
  const unknown: LlmProviderModelResponse[] = [];
  for (const m of models) {
    const match = matchCapabilityFilter(m, capFilter);
    if (match === 'match') matched.push(m);
    else if (match === 'unknown') unknown.push(m);
  }

  const selectedRow = model ? models.find((m) => m.model === model) : undefined;
  const selectedExcluded = !!selectedRow && !matched.includes(selectedRow) && !unknown.includes(selectedRow);

  return (
    <div className="space-y-2">
      {models.length > 1 && (
        <ModelCapabilityFilters models={models} value={capFilter} onChange={setCapFilter} disabled={disabled} />
      )}
      <Select value={model} onChange={(e) => onChange(e.target.value)} disabled={disabled} required>
        <option value="" disabled>{t('selectModel')}</option>
        {children}
        {selectedExcluded && (
          <option value={selectedRow.model}>{selectedRow.displayName ?? selectedRow.model}</option>
        )}
        <ModelOptionList models={matched} />
        {unknown.length > 0 &&
          (filterActive ? (
            <optgroup label={tp('modelCapabilityUnknown')}>
              <ModelOptionList models={unknown} />
            </optgroup>
          ) : (
            <ModelOptionList models={unknown} />
          ))}
      </Select>
      <SelectedModelInfo models={models} model={model} />
    </div>
  );
}

// Capability/availability hints for the currently selected model, shown under the Select.
export function SelectedModelInfo({
  models,
  model,
}: {
  models: LlmProviderModelResponse[];
  model: string;
}) {
  const t = useTranslations('LlmProviders');
  const row = model ? models.find((m) => m.model === model) : undefined;
  if (!row) return null;

  const unavailable = row.status === 'UNAVAILABLE';
  const vision = isVisionModel(row);
  const imageOut = hasCapability(row.outputModalities, 'image');
  if (!unavailable && !vision && !imageOut && row.contextWindow == null && row.maxOutputTokens == null) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {unavailable && (
        <Chip icon={ExclamationTriangleIcon} tone="warning">{t('modelUnavailableHint')}</Chip>
      )}
      {vision && <Chip icon={EyeIcon} tone="accent">{t('modelVision')}</Chip>}
      {imageOut && <Chip icon={SparklesIcon} tone="accent">{t('modelImageOut')}</Chip>}
      {row.contextWindow != null && (
        <Chip>{t('modelContextTokens', { tokens: row.contextWindow.toLocaleString() })}</Chip>
      )}
      {row.maxOutputTokens != null && (
        <Chip>{t('modelMaxOutputTokens', { tokens: row.maxOutputTokens.toLocaleString() })}</Chip>
      )}
    </div>
  );
}
