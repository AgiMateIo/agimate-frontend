'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  EyeIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { LlmProviderModelResponse, LlmProviderResponse } from '@/types';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormField';
import { RowAction } from '@/components/ui/RowAction';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { formatDate } from '@/utils/date';
import { localeMap } from '@/i18n/routing';
import { useLlmProviderCacheActions } from '@/queries/llm-providers';
import ModelExtraBodyModal from './ModelExtraBodyModal';
import { hasExtraBody } from './extraBody';
import { formatContextWindow, isVisionModel } from './modelRegistry';

type StatusFilter = 'all' | 'AVAILABLE' | 'UNAVAILABLE';
type CapabilityFilter = 'all' | 'vision' | 'tools' | 'reasoning';

const matchesCapability = (m: LlmProviderModelResponse, cap: CapabilityFilter) => {
  switch (cap) {
    case 'vision':
      return isVisionModel(m);
    case 'tools':
    case 'reasoning':
      return m.supportedParameters?.includes(cap) ?? false;
    default:
      return true;
  }
};

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
  const [status, setStatus] = useState<StatusFilter>('all');
  const [capability, setCapability] = useState<CapabilityFilter>('all');
  const [editing, setEditing] = useState<LlmProviderModelResponse | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return models
      .filter((m) => {
        if (status !== 'all' && m.status !== status) return false;
        if (!matchesCapability(m, capability)) return false;
        if (q && !m.model.toLowerCase().includes(q) && !(m.displayName ?? '').toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        // Available models first, then alphabetically.
        if (a.status !== b.status) return a.status === 'AVAILABLE' ? -1 : 1;
        return (a.displayName ?? a.model).localeCompare(b.displayName ?? b.model);
      });
  }, [models, search, status, capability]);

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
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('modelSearchPlaceholder')}
                className="pl-9"
              />
            </div>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="sm:w-52"
              aria-label={t('modelStatusFilterLabel')}
            >
              <option value="all">{t('modelStatusAll')}</option>
              <option value="AVAILABLE">{t('modelStatusAvailable')}</option>
              <option value="UNAVAILABLE">{t('modelStatusUnavailable')}</option>
            </Select>
            <Select
              value={capability}
              onChange={(e) => setCapability(e.target.value as CapabilityFilter)}
              className="sm:w-52"
              aria-label={t('modelCapabilityFilterLabel')}
            >
              <option value="all">{t('modelCapabilityAll')}</option>
              <option value="vision">{t('modelCapabilityVision')}</option>
              <option value="tools">{t('modelCapabilityTools')}</option>
              <option value="reasoning">{t('modelCapabilityReasoning')}</option>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted">{t('noModelsMatch')}</div>
          ) : (
            <div className="bg-surface rounded-xl border border-border divide-y divide-border">
              {filtered.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">
                        {m.displayName ?? m.model}
                      </span>
                      {m.status === 'UNAVAILABLE' && (
                        <Chip tone="warning">{t('modelUnavailable')}</Chip>
                      )}
                      {isVisionModel(m) && (
                        <Chip icon={EyeIcon} tone="accent">{t('modelVision')}</Chip>
                      )}
                      {m.contextWindow != null && (
                        <Chip>{t('modelContext', { size: formatContextWindow(m.contextWindow) })}</Chip>
                      )}
                      {hasExtraBody(m.extraBody) && (
                        <Chip icon={AdjustmentsHorizontalIcon}>{t('modelHasExtraBody')}</Chip>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted mt-0.5 min-w-0">
                      {m.displayName && <span className="font-mono truncate">{m.model}</span>}
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
              ))}
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
