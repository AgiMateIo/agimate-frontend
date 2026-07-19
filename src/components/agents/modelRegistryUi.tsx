'use client';

import { useTranslations } from 'next-intl';
import { EyeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { LlmProviderModelResponse } from '@/types';
import { Chip } from '@/components/ui/Chip';
import { isVisionModel } from '@/components/llm-providers/modelRegistry';

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
  if (!unavailable && !vision && row.contextWindow == null) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {unavailable && (
        <Chip icon={ExclamationTriangleIcon} tone="warning">{t('modelUnavailableHint')}</Chip>
      )}
      {vision && <Chip icon={EyeIcon} tone="accent">{t('modelVision')}</Chip>}
      {row.contextWindow != null && (
        <Chip>{t('modelContextTokens', { tokens: row.contextWindow.toLocaleString() })}</Chip>
      )}
    </div>
  );
}
