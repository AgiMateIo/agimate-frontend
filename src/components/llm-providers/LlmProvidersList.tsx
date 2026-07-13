'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ClockIcon, CpuChipIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { LlmProviderResponse } from '@/types';
import { Toggle } from '@/components/ui/Toggle';
import { Link } from '@/i18n/navigation';
import { localeMap } from '@/i18n/routing';
import { formatDate } from '@/utils/date';
import { PROVIDER_TYPE_LABEL_KEY, deriveProviderNameFromUrl } from './providerPresets';
import { ProviderAvatar } from './ProviderAvatar';

interface LlmProvidersListProps {
  providers: LlmProviderResponse[];
  onUpdate: (providers: LlmProviderResponse[]) => void;
}

// Compact metadata pill used along the card's second row.
function Chip({
  icon: Icon,
  tone = 'default',
  children,
}: {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tone?: 'default' | 'accent' | 'warning';
  children: React.ReactNode;
}) {
  const tones = {
    default: 'border border-border text-muted',
    accent: 'bg-accent/10 text-accent',
    warning: 'bg-warning/10 text-warning',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${tones[tone]}`}>
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      <span className="truncate max-w-[14rem]">{children}</span>
    </span>
  );
}

export default function LlmProvidersList({ providers, onUpdate }: LlmProvidersListProps) {
  const t = useTranslations('LlmProviders');
  const tu = useTranslations('LlmUsage');
  const locale = useLocale();
  const bcp47 = localeMap[locale];

  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const setBusy = (id: string, on: boolean) => {
    setBusyIds(prev => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleToggleEnabled = async (provider: LlmProviderResponse) => {
    setBusy(provider.id, true);
    const newEnabled = !provider.enabled;
    onUpdate(providers.map(p => p.id === provider.id ? { ...p, enabled: newEnabled } : p));
    try {
      const updated = await apiService.updateLlmProvider(provider.id, { enabled: newEnabled });
      onUpdate(providers.map(p => p.id === provider.id ? updated : p));
    } catch (err) {
      console.error('Failed to toggle provider', err);
      onUpdate(providers.map(p => p.id === provider.id ? { ...p, enabled: provider.enabled } : p));
    } finally {
      setBusy(provider.id, false);
    }
  };

  if (providers.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        {t('noProviders')}
      </div>
    );
  }

  // The platform row (admin-only, backend-gated) is presented in its own section
  // above the user's personal providers.
  const platformProviders = providers.filter(p => p.platform);
  const personalProviders = providers.filter(p => !p.platform);

  const renderCard = (provider: LlmProviderResponse) => {
    const busy = busyIds.has(provider.id);
    const modelsCount = provider.availableModels?.length ?? 0;
    const hasModels = provider.availableModels !== null && modelsCount > 0;
    const isPlatform = provider.platform;
    const displayName = isPlatform ? tu('platformProviderName') : provider.name;

    const typeLabel = t(PROVIDER_TYPE_LABEL_KEY[provider.providerType] ?? 'providerTypeOpenAICompatible');
    const host = provider.baseUrl ? deriveProviderNameFromUrl(provider.baseUrl) : '';

    return (
      <div
        key={provider.id}
        className="group bg-surface-secondary rounded-xl border border-border hover:border-accent/50 transition-colors"
      >
        <div className="flex items-center gap-4 p-4">
          {/* Card body links to the provider's usage & quotas detail page. */}
          <Link
            href={`/dashboard/llm-providers/${provider.id}`}
            className="flex items-start gap-4 flex-1 min-w-0"
          >
            <ProviderAvatar providerType={provider.providerType} platform={isPlatform} />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground truncate group-hover:text-accent transition-colors">
                  {displayName}
                </h3>
                {isPlatform && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">
                    {tu('platformBadge')}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">{typeLabel}</p>

              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {hasModels ? (
                  <Chip tone="accent">{t('availableModels', { count: modelsCount })}</Chip>
                ) : (
                  <Chip tone="warning">{t('noModelsYet')}</Chip>
                )}
                {host && <Chip icon={GlobeAltIcon}>{host}</Chip>}
                {provider.defaultModel && <Chip icon={CpuChipIcon}>{provider.defaultModel}</Chip>}
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
              disabled={busy}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {platformProviders.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{tu('platformSectionTitle')}</h2>
            <p className="text-xs text-muted mt-0.5">{tu('platformSectionSubtitle')}</p>
          </div>
          {platformProviders.map(renderCard)}
        </section>
      )}

      <section className="space-y-3">
        {platformProviders.length > 0 && (
          <h2 className="text-sm font-semibold text-foreground">{tu('personalSectionTitle')}</h2>
        )}
        {personalProviders.length > 0
          ? personalProviders.map(renderCard)
          : <div className="text-sm text-muted py-4">{t('noProviders')}</div>}
      </section>
    </>
  );
}
