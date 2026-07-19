'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { LlmProviderModelResponse, LlmProviderResponse } from '@/types';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormField';
import { Toggle } from '@/components/ui/Toggle';
import { RowAction } from '@/components/ui/RowAction';
import { FilterPill } from '@/components/ui/FilterPill';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { formatDate } from '@/utils/date';
import { localeMap } from '@/i18n/routing';
import { useLlmProviderCacheActions } from '@/queries/llm-providers';
import ModelExtraBodyModal from './ModelExtraBodyModal';
import { hasExtraBody } from './extraBody';
import {
  CapabilityAxis,
  CapabilityFilter,
  EMPTY_CAPABILITY_FILTER,
  capabilityOptions,
  formatContextWindow,
  formatModalityPair,
  hasActiveCapabilityFilter,
  hasCapability,
  isVisionModel,
  matchCapabilityFilter,
} from './modelRegistry';

type StatusFilter = 'all' | 'AVAILABLE' | 'UNAVAILABLE';

// Chips get their own row for tools/reasoning; everything else supported goes
// into a "+N" tooltip chip.
const HIGHLIGHTED_PARAMS = ['tools', 'reasoning'];

interface ProviderModelsSectionProps {
  provider: LlmProviderResponse;
  models: LlmProviderModelResponse[];
  onRefresh: () => void;
  refreshing: boolean;
  refreshError: string | null;
}

// The provider's model registry: searchable/filterable list with availability
// and capability badges plus a per-model extra_body editor.
export default function ProviderModelsSection({
  provider,
  models,
  onRefresh,
  refreshing,
  refreshError,
}: ProviderModelsSectionProps) {
  const t = useTranslations('LlmProviders');
  const locale = useLocale();
  const bcp47 = localeMap[locale];
  const { setProviderModel } = useLlmProviderCacheActions();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [capFilter, setCapFilter] = useState<CapabilityFilter>(EMPTY_CAPABILITY_FILTER);
  // null capabilities mean "unknown", not "can't" — such models are kept under
  // an active filter (with an "unknown" badge) unless the user opts them out.
  const [includeUnknown, setIncludeUnknown] = useState(true);
  const [editing, setEditing] = useState<LlmProviderModelResponse | null>(null);

  const capFilterActive = hasActiveCapabilityFilter(capFilter);
  const anyFilterActive = capFilterActive || status !== 'all';
  // Chip options per axis — the union of values seen in the registry, never hardcoded.
  const capOptions = useMemo(() => capabilityOptions(models), [models]);

  const toggleCapValue = (axis: CapabilityAxis, value: string) =>
    setCapFilter((prev) => ({
      ...prev,
      [axis]: prev[axis].includes(value)
        ? prev[axis].filter((v) => v !== value)
        : [...prev[axis], value],
    }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return models
      .map((m) => ({ m, capMatch: matchCapabilityFilter(m, capFilter) }))
      .filter(({ m, capMatch }) => {
        if (status !== 'all' && m.status !== status) return false;
        if (capMatch === 'excluded') return false;
        if (capMatch === 'unknown' && !includeUnknown) return false;
        if (q && !m.model.toLowerCase().includes(q) && !(m.displayName ?? '').toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        // Available first, then confirmed capability matches before unknowns, then alphabetically.
        if (a.m.status !== b.m.status) return a.m.status === 'AVAILABLE' ? -1 : 1;
        if (a.capMatch !== b.capMatch) return a.capMatch === 'match' ? -1 : 1;
        return (a.m.displayName ?? a.m.model).localeCompare(b.m.displayName ?? b.m.model);
      });
  }, [models, search, status, capFilter, includeUnknown]);

  const unavailableCount = models.filter((m) => m.status === 'UNAVAILABLE').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm text-foreground">
            {t('availableModels', { count: models.length })}
            {unavailableCount > 0 && (
              <span className="text-warning"> · {t('modelsUnavailableCount', { count: unavailableCount })}</span>
            )}
          </div>
          <div className="text-xs text-muted mt-0.5">
            {provider.modelsRefreshedAt
              ? t('modelsRefreshedAt', { when: formatDate(provider.modelsRefreshedAt, bcp47) })
              : t('modelsNeverRefreshed')}
          </div>
        </div>
        <RowAction
          icon={ArrowPathIcon}
          label={t('refreshModels')}
          onClick={onRefresh}
          disabled={refreshing}
          spinning={refreshing}
        />
      </div>

      {refreshError && <ErrorAlert>{refreshError}</ErrorAlert>}

      {models.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-8 text-center space-y-3">
          <p className="text-sm text-muted">{t('noModelsYet')}</p>
          <Button variant="secondary" onClick={onRefresh} loading={refreshing} disabled={refreshing}>
            {t('refreshModels')}
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('modelSearchPlaceholder')}
              className="pl-9 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-label={t('modelFiltersToggle')}
              aria-pressed={showFilters}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors ${
                showFilters || anyFilterActive
                  ? 'text-accent bg-accent/10'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
            </button>
          </div>

          {showFilters && (
            <div className="space-y-2">
              <FilterRow label={t('modelStatusFilterLabel')}>
                <FilterPill active={status === 'all'} onClick={() => setStatus('all')}>
                  {t('modelStatusAll')}
                </FilterPill>
                <FilterPill active={status === 'AVAILABLE'} onClick={() => setStatus('AVAILABLE')}>
                  {t('modelStatusAvailable')}
                </FilterPill>
                <FilterPill active={status === 'UNAVAILABLE'} onClick={() => setStatus('UNAVAILABLE')}>
                  {t('modelStatusUnavailable')}
                </FilterPill>
              </FilterRow>

              {(
                [
                  ['input', t('filterInputModalities')],
                  ['output', t('filterOutputModalities')],
                  ['params', t('filterParameters')],
                ] as [CapabilityAxis, string][]
              ).map(([axis, label]) =>
                capOptions[axis].length > 0 ? (
                  <FilterRow key={axis} label={label}>
                    {capOptions[axis].map((value) => (
                      <FilterPill
                        key={value}
                        active={capFilter[axis].includes(value)}
                        onClick={() => toggleCapValue(axis, value)}
                      >
                        {value}
                      </FilterPill>
                    ))}
                  </FilterRow>
                ) : null
              )}

              {capFilterActive && (
                <Toggle
                  checked={includeUnknown}
                  onChange={setIncludeUnknown}
                  label={t('showUnknownCapabilities')}
                />
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted">{t('noModelsMatch')}</div>
          ) : (
            <div className="bg-surface rounded-xl border border-border divide-y divide-border">
              {filtered.map(({ m, capMatch }) => {
                const modalityPair = formatModalityPair(m);
                const highlighted = (m.supportedParameters ?? []).filter((p) =>
                  HIGHLIGHTED_PARAMS.includes(p.toLowerCase())
                );
                const otherParams = (m.supportedParameters ?? []).filter(
                  (p) => !HIGHLIGHTED_PARAMS.includes(p.toLowerCase())
                );
                return (
                  <div key={m.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">
                          {m.displayName ?? m.model}
                        </span>
                        {m.status === 'UNAVAILABLE' && (
                          <Chip tone="warning">{t('modelUnavailable')}</Chip>
                        )}
                        {modalityPair && <Chip>{modalityPair}</Chip>}
                        {isVisionModel(m) && (
                          <Chip icon={EyeIcon} tone="accent">{t('modelVision')}</Chip>
                        )}
                        {hasCapability(m.outputModalities, 'image') && (
                          <Chip icon={SparklesIcon} tone="accent">{t('modelImageOut')}</Chip>
                        )}
                        {highlighted.map((p) => (
                          <Chip key={p}>{p}</Chip>
                        ))}
                        {otherParams.length > 0 && (
                          <span title={otherParams.join(', ')}>
                            <Chip>+{otherParams.length}</Chip>
                          </span>
                        )}
                        {capFilterActive && capMatch === 'unknown' && (
                          <Chip>{t('modelCapabilityUnknown')}</Chip>
                        )}
                        {hasExtraBody(m.extraBody) && (
                          <Chip icon={AdjustmentsHorizontalIcon}>{t('modelHasExtraBody')}</Chip>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted mt-0.5 min-w-0">
                        {m.displayName && <span className="font-mono truncate">{m.model}</span>}
                        {m.contextWindow != null && (
                          <span className="shrink-0">
                            {t('modelContextShort', { size: formatContextWindow(m.contextWindow) })}
                          </span>
                        )}
                        {m.maxOutputTokens != null && (
                          <span className="shrink-0">
                            {t('modelMaxOutputShort', { size: formatContextWindow(m.maxOutputTokens) })}
                          </span>
                        )}
                        <span className="shrink-0">
                          {m.lastSeenAt
                            ? t('modelLastSeen', { when: formatDate(m.lastSeenAt, bcp47) })
                            : t('modelNeverListed')}
                        </span>
                      </div>
                    </div>
                    <RowAction
                      icon={AdjustmentsHorizontalIcon}
                      label={t('modelParams')}
                      onClick={() => setEditing(m)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {editing && (
        <ModelExtraBodyModal
          providerId={provider.id}
          model={editing}
          onClose={() => setEditing(null)}
          onSuccess={(updated) => {
            setProviderModel(provider.id, updated);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// One labeled row of filter pills ("Availability: (all) (available) …").
function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-muted mr-1">{label}</span>
      {children}
    </div>
  );
}
