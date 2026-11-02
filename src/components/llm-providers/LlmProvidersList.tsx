'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ClockIcon, CpuChipIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { LlmProviderResponse } from '@/types';
import { Toggle } from '@/components/ui/Toggle';
import { Chip } from '@/components/ui/Chip';
import { Link } from '@/i18n/navigation';
import { localeMap } from '@/i18n/routing';
import { formatDate } from '@/utils/date';
import { PROVIDER_TYPE_LABEL_KEY, deriveProviderNameFromUrl } from './providerTypes';
import { firstPurposeModel } from './llmPurpose';
import { ProviderAvatar } from './ProviderAvatar';
import { Placeholder } from '@/components/ui/Placeholder';
import { useIdSet } from '@/hooks/useIdSet';
import { useLlmProviderCacheActions } from '@/queries/llm-providers';

interface LlmProvidersListProps {
  providers: LlmProviderResponse[];
  onUpdate: (provider: LlmProviderResponse) => void;
  // Where a card leads: the personal list and the admin section each own their
  // detail route.
  hrefBase?: string;
  emptyText?: string;
}

export default function LlmProvidersList({
  providers,
  onUpdate,
  hrefBase = '/dashboard/llm-providers',
  emptyText,
}: LlmProvidersListProps) {
  const t = useTranslations('LlmProviders');
  const tu = useTranslations('LlmUsage');
  const locale = useLocale();
  const bcp47 = localeMap[locale];

  const busy = useIdSet();
  const { invalidateUsage } = useLlmProviderCacheActions();

  const handleToggleEnabled = async (provider: LlmProviderResponse) => {
    busy.add(provider.id);
    const newEnabled = !provider.enabled;
    onUpdate({ ...provider, enabled: newEnabled });
    try {
      const updated = await apiService.updateLlmProvider(provider.id, { enabled: newEnabled });
      onUpdate(updated);
      // Only enabled platform providers have usage rows.
      if (provider.platform) invalidateUsage();
    } catch (err) {
      console.error('Failed to toggle provider', err);
      onUpdate(provider);
    } finally {
      busy.remove(provider.id);
    }
  };

  if (providers.length === 0) {
    return (
      <Placeholder>
        {emptyText ?? t('noProviders')}
      </Placeholder>
    );
  }

  return (
    <div className="space-y-3">
      {providers.map((provider) => {
        const isBusy = busy.has(provider.id);
        // The list DTO no longer carries models — the registry lives on the detail page.
        const neverRefreshed = provider.modelsRefreshedAt === null;
        const isPlatform = provider.platform;

        const typeLabel = t(PROVIDER_TYPE_LABEL_KEY[provider.providerType]);
        const host = provider.baseUrl ? deriveProviderNameFromUrl(provider.baseUrl) : '';
        const chatModel = firstPurposeModel(provider, 'CHAT');

        return (
          <div
            key={provider.id}
            className="group bg-surface-secondary rounded-xl border border-border hover:border-accent/50 transition-colors"
          >
            <div className="flex items-center gap-4 p-4">
              {/* Card body links to the provider's usage & quotas detail page. */}
              <Link
                href={`${hrefBase}/${provider.id}`}
                className="flex items-start gap-4 flex-1 min-w-0"
              >
                <ProviderAvatar providerType={provider.providerType} platform={isPlatform} />

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate group-hover:text-accent transition-colors">
                    {provider.name}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">{typeLabel}</p>

                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {neverRefreshed && <Chip tone="warning">{t('noModelsYet')}</Chip>}
                    {host && <Chip icon={GlobeAltIcon}>{host}</Chip>}
                    {/* The chat model the provider would try first — the one number
                        that fits a card; the rest of the purpose map lives on the
                        detail page. */}
                    {chatModel && <Chip icon={CpuChipIcon}>{chatModel}</Chip>}
                    {provider.modelsRefreshedAt && (
                      <Chip icon={ClockIcon}>{formatDate(provider.modelsRefreshedAt, bcp47)}</Chip>
                    )}
                  </div>
                </div>
              </Link>

              {/* Quick enable/disable stays here; all management (edit, key
                  rotation, model refresh, delete) lives on the detail page. */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted">
                  <span className={`h-2 w-2 rounded-full ${provider.enabled ? 'bg-success' : 'bg-muted'}`} />
                  {provider.enabled ? t('enabled') : isPlatform ? tu('freeTierOff') : t('disabled')}
                </span>
                <Toggle
                  checked={provider.enabled}
                  onChange={() => handleToggleEnabled(provider)}
                  disabled={isBusy}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
