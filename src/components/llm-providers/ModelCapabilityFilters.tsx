'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { LlmProviderModelResponse } from '@/types';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { CapabilityFilter, CapabilityAxis, capabilityOptions } from './modelRegistry';

const AXIS_LABEL_KEY = {
  input: 'filterInputModalities',
  output: 'filterOutputModalities',
  params: 'filterParameters',
} as const satisfies Record<CapabilityAxis, string>;

interface ModelCapabilityFiltersProps {
  models: LlmProviderModelResponse[];
  value: CapabilityFilter;
  onChange: (next: CapabilityFilter) => void;
  disabled?: boolean;
}

// Three independent multi-select axes (input/output modalities, supported
// parameters). Options are the union of values seen in the loaded registry —
// never a hardcoded list. Within an axis the semantics are AND (⊇): a tool
// needing image+audio input must get a model that has both.
export function ModelCapabilityFilters({ models, value, onChange, disabled }: ModelCapabilityFiltersProps) {
  const t = useTranslations('LlmProviders');
  const options = useMemo(() => capabilityOptions(models), [models]);

  // Nothing discoverable in this registry — no axes to filter on.
  if (options.input.length === 0 && options.output.length === 0 && options.params.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {(['input', 'output', 'params'] as const).map((axis) =>
        options[axis].length > 0 ? (
          <MultiSelect
            key={axis}
            label={t(AXIS_LABEL_KEY[axis])}
            options={options[axis]}
            selected={value[axis]}
            onChange={(next) => onChange({ ...value, [axis]: next })}
            clearLabel={t('filtersClear')}
            disabled={disabled}
            className="flex-1 sm:min-w-[11rem]"
          />
        ) : null
      )}
    </div>
  );
}
