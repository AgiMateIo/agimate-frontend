'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ComponentType, SVGProps } from 'react';
import {
  ExclamationTriangleIcon,
  EyeIcon,
  LightBulbIcon,
  MicrophoneIcon,
  SparklesIcon,
  SpeakerWaveIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { LlmProviderModelResponse } from '@/types';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import {
  CapabilityAxis,
  CapabilityFilter,
  formatContextWindow,
  hasCapability,
  matchCapabilityFilter,
} from './modelRegistry';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

// Quick single-value capability toggles (AND across selected ones). A chip only
// renders when at least one model in the registry has the capability, so the
// set adapts to the provider without hardcoding what its listing can contain.
const QUICK_FILTERS: { key: string; axis: CapabilityAxis; value: string; icon: IconType; labelKey?: 'modelVision' | 'modelImageOut' | 'modelAudioIn' | 'modelAudioOut' }[] = [
  { key: 'vision', axis: 'input', value: 'image', icon: EyeIcon, labelKey: 'modelVision' },
  { key: 'imageOut', axis: 'output', value: 'image', icon: SparklesIcon, labelKey: 'modelImageOut' },
  { key: 'audioIn', axis: 'input', value: 'audio', icon: MicrophoneIcon, labelKey: 'modelAudioIn' },
  { key: 'audioOut', axis: 'output', value: 'audio', icon: SpeakerWaveIcon, labelKey: 'modelAudioOut' },
  // Parameter names are shown verbatim — they are technical identifiers.
  { key: 'tools', axis: 'params', value: 'tools', icon: WrenchScrewdriverIcon },
  { key: 'reasoning', axis: 'params', value: 'reasoning', icon: LightBulbIcon },
];

// Per-model capability icons with tooltips (modalities accented, params muted).
const CAPABILITY_ICONS: { icon: IconType; titleKey?: 'modelVision' | 'modelImageOut' | 'modelAudioIn' | 'modelAudioOut'; title?: string; accent: boolean; has: (m: LlmProviderModelResponse) => boolean }[] = [
  { icon: EyeIcon, titleKey: 'modelVision', accent: true, has: (m) => hasCapability(m.inputModalities, 'image') },
  { icon: SparklesIcon, titleKey: 'modelImageOut', accent: true, has: (m) => hasCapability(m.outputModalities, 'image') },
  { icon: MicrophoneIcon, titleKey: 'modelAudioIn', accent: true, has: (m) => hasCapability(m.inputModalities, 'audio') },
  { icon: SpeakerWaveIcon, titleKey: 'modelAudioOut', accent: true, has: (m) => hasCapability(m.outputModalities, 'audio') },
  { icon: WrenchScrewdriverIcon, title: 'tools', accent: false, has: (m) => hasCapability(m.supportedParameters, 'tools') },
  { icon: LightBulbIcon, title: 'reasoning', accent: false, has: (m) => hasCapability(m.supportedParameters, 'reasoning') },
];

function CapabilityIcons({ model }: { model: LlmProviderModelResponse }) {
  const t = useTranslations('LlmProviders');
  return (
    <>
      {CAPABILITY_ICONS.filter((c) => c.has(model)).map((c) => {
        const title = c.titleKey ? t(c.titleKey) : c.title;
        return (
          <span key={title} title={title} className="shrink-0">
            <c.icon className={`h-3.5 w-3.5 ${c.accent ? 'text-accent' : 'text-muted'}`} />
          </span>
        );
      })}
    </>
  );
}

interface ModelPickerListProps {
  models: LlmProviderModelResponse[];
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

// Inline model picker for modal forms. The current selection lives in a card
// above the search (always visible, × clears it); below are a search field
// with capability filters folded behind a funnel toggle, and a scrollable list
// of the remaining models. Models whose capabilities are unknown (null fields)
// are never hidden by an active filter — they drop below a divider instead.
export function ModelPickerList({ models, value, onChange, disabled }: ModelPickerListProps) {
  const t = useTranslations('LlmProviders');

  const [search, setSearch] = useState('');
  const [quick, setQuick] = useState<Set<string>>(new Set());

  const visibleQuickFilters = useMemo(
    () => QUICK_FILTERS.filter((f) => models.some((m) => {
      const values = f.axis === 'input' ? m.inputModalities : f.axis === 'output' ? m.outputModalities : m.supportedParameters;
      return hasCapability(values, f.value);
    })),
    [models]
  );

  const capFilter = useMemo(() => {
    const next: CapabilityFilter = { input: [], output: [], params: [] };
    for (const f of QUICK_FILTERS) {
      if (quick.has(f.key)) next[f.axis] = [...next[f.axis], f.value];
    }
    return next;
  }, [quick]);
  const filterActive = quick.size > 0;

  const selectedRow = value ? models.find((m) => m.model === value) : undefined;
  const selectedMissing = !!value && !selectedRow;

  // The list offers everything except the current selection — that lives in the card.
  const { matched, unknown } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const bySearch = (m: LlmProviderModelResponse) =>
      !q || m.model.toLowerCase().includes(q) || (m.displayName ?? '').toLowerCase().includes(q);
    const sortModels = (list: LlmProviderModelResponse[]) =>
      list.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'AVAILABLE' ? -1 : 1;
        return (a.displayName ?? a.model).localeCompare(b.displayName ?? b.model);
      });
    const matched: LlmProviderModelResponse[] = [];
    const unknown: LlmProviderModelResponse[] = [];
    for (const m of models) {
      if (m.model === value || !bySearch(m)) continue;
      const match = matchCapabilityFilter(m, capFilter);
      if (match === 'match') matched.push(m);
      else if (match === 'unknown') unknown.push(m);
    }
    return { matched: sortModels(matched), unknown: sortModels(unknown) };
  }, [models, search, capFilter, value]);

  const toggleQuick = (key: string) =>
    setQuick((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const renderRow = (m: LlmProviderModelResponse) => (
    <button
      key={m.id}
      type="button"
      onClick={() => onChange(m.model)}
      disabled={disabled}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface transition-colors disabled:opacity-50"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm text-foreground truncate" title={m.displayName ? m.model : undefined}>
            {m.displayName ?? m.model}
          </span>
          <CapabilityIcons model={m} />
        </span>
        {m.status === 'UNAVAILABLE' && (
          <span className="flex items-center gap-1 text-xs text-warning mt-0.5">
            <ExclamationTriangleIcon className="h-3 w-3 shrink-0" />
            {t('modelUnavailable')}
          </span>
        )}
      </span>
      {m.contextWindow != null && (
        <span className="text-xs text-muted shrink-0">
          {t('modelContextShort', { size: formatContextWindow(m.contextWindow) })}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-2">
      {value && (
        <div className="flex items-center gap-2.5 px-3 py-2 bg-accent/10 border border-accent/40 rounded-lg">
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 min-w-0">
              <span
                className={`text-sm font-medium text-foreground truncate ${selectedMissing ? 'font-mono' : ''}`}
                title={selectedRow?.displayName ? selectedRow.model : undefined}
              >
                {selectedRow ? selectedRow.displayName ?? selectedRow.model : value}
              </span>
              {selectedRow && <CapabilityIcons model={selectedRow} />}
              {selectedRow && (selectedRow.contextWindow != null || selectedRow.maxOutputTokens != null) && (
                <span className="text-xs text-muted shrink-0">
                  {[
                    selectedRow.contextWindow != null
                      ? t('modelContextShort', { size: formatContextWindow(selectedRow.contextWindow) })
                      : null,
                    selectedRow.maxOutputTokens != null
                      ? t('modelMaxOutputShort', { size: formatContextWindow(selectedRow.maxOutputTokens) })
                      : null,
                  ].filter(Boolean).join(' · ')}
                </span>
              )}
            </span>
            {selectedMissing && (
              <span className="flex items-center gap-1 text-xs text-warning mt-0.5">
                <ExclamationTriangleIcon className="h-3 w-3 shrink-0" />
                {t('modelNotInRegistry')}
              </span>
            )}
            {selectedRow?.status === 'UNAVAILABLE' && (
              <span className="flex items-center gap-1 text-xs text-warning mt-0.5">
                <ExclamationTriangleIcon className="h-3 w-3 shrink-0" />
                {t('modelUnavailableHint')}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={disabled}
            aria-label={t('pickerClear')}
            className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-secondary transition-colors shrink-0"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder={t('modelSearchPlaceholder')}
        disabled={disabled}
        size="sm"
        filtersActive={filterActive}
        filters={visibleQuickFilters.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {visibleQuickFilters.map((f) => {
              const active = quick.has(f.key);
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => toggleQuick(f.key)}
                  disabled={disabled}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
                    active
                      ? 'bg-accent/10 text-accent border-accent'
                      : 'border-border text-muted hover:text-foreground'
                  }`}
                >
                  <f.icon className="h-3.5 w-3.5" />
                  {f.labelKey ? t(f.labelKey) : f.value}
                </button>
              );
            })}
          </div>
        ) : undefined}
      />

      <div className="bg-surface-secondary border border-border rounded-lg max-h-56 overflow-y-auto divide-y divide-border/50">
        {matched.map(renderRow)}

        {filterActive && unknown.length > 0 && (
          <div className="px-3 py-1.5 text-xs text-muted bg-surface">
            {t('modelCapabilityUnknown')}
          </div>
        )}
        {unknown.map(renderRow)}

        {matched.length === 0 && unknown.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted">{t('noModelsMatch')}</div>
        )}
      </div>
    </div>
  );
}
