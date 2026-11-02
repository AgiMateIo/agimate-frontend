'use client';

import { useEffect, useState } from 'react';
import { Chip } from '@/components/ui/Chip';
import { useLocale, useTranslations } from 'next-intl';
import { useSuspenseQueries } from '@tanstack/react-query';
import {
  AdjustmentsHorizontalIcon,
  ArrowLeftIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { LlmProviderResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { formatDate } from '@/utils/date';
import { localeMap } from '@/i18n/routing';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { RowAction } from '@/components/ui/RowAction';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import {
  llmProviderModelsOptions,
  llmProvidersListOptions,
  useLlmProviderCacheActions,
  useLlmUsageQuery,
} from '@/queries/llm-providers';
import { PROVIDER_TYPE_LABEL_KEY } from './providerTypes';
import { ProviderAvatar } from './ProviderAvatar';
import { UsageBars } from './UsageBars';
import ProviderQuotasSection from './ProviderQuotasSection';
import ProviderModelsSection from './ProviderModelsSection';
import ProviderPurposesSection from './ProviderPurposesSection';
import { PROVIDER_PURPOSES, purposeLabelKey, purposeState } from './llmPurpose';
import EditLlmProviderModal from './EditLlmProviderModal';
import RotateLlmProviderKeyModal from './RotateLlmProviderKeyModal';
import DeleteLlmProviderModal from './DeleteLlmProviderModal';
import { Placeholder } from '@/components/ui/Placeholder';

// A provider is managed in exactly one place: a person's own under
// /dashboard/llm-providers, the platform's under Admin → Platform providers.
export type ProviderScope = 'personal' | 'platform';

const LIST_HREF: Record<ProviderScope, string> = {
  personal: '/dashboard/llm-providers',
  platform: '/dashboard/admin/platform-providers',
};

// The two scopes render the same detail; only the back link, the post-delete
// destination and the purposes row differ. A provider opened under the wrong
// scope is sent to the right one instead of offering actions in the wrong place.
export default function ProviderDetail({ id, scope }: { id: string; scope: ProviderScope }) {
  const t = useTranslations('LlmProviders');
  const tu = useTranslations('LlmUsage');
  const locale = useLocale();
  const bcp47 = localeMap[locale];

  const router = useRouter();
  const [{ data: providers }, { data: models }] = useSuspenseQueries({
    queries: [llmProvidersListOptions(), llmProviderModelsOptions(id)],
  });
  const { setProviders, setProvider, setProviderModels, invalidateUsage } = useLlmProviderCacheActions();
  const usageQuery = useLlmUsageQuery();

  const provider = providers.find((p) => p.id === id);

  const [activeTab, setActiveTab] = useState<'info' | 'models' | 'purposes' | 'usage' | 'quotas'>('info');
  const [editing, setEditing] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Label the [id] breadcrumb segment with the provider name.
  useSetBreadcrumb(id, provider?.name);

  const wrongScope = !!provider && (scope === 'platform' ? !provider.platform : provider.platform);
  const redirectTo = provider && wrongScope
    ? `${provider.platform ? LIST_HREF.platform : LIST_HREF.personal}/${id}`
    : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (!provider) {
    return (
      <Placeholder>
        {t('noProviders')}
        <div className="mt-4">
          <Link href={LIST_HREF[scope]} className="text-accent hover:text-accent/80">
            ← {scope === 'platform' ? t('platformProvidersTitle') : t('title')}
          </Link>
        </div>
      </Placeholder>
    );
  }

  if (wrongScope) {
    return <Placeholder>{t('loading')}</Placeholder>;
  }

  const applyUpdated = (updated: LlmProviderResponse) => setProvider(updated);

  const handleRefreshModels = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const result = await apiService.refreshLlmProviderModels(provider.id);
      setProviderModels(provider.id, result.models);
      applyUpdated({ ...provider, modelsRefreshedAt: result.refreshedAt });
    } catch (err) {
      setRefreshError(getErrorMessage(err, t('refreshFailed')));
    } finally {
      setRefreshing(false);
    }
  };

  // A platform usage row carries no provider id — it is told apart by name. The
  // platform can have several providers, hence the name match rather than a
  // single "the platform row".
  const usage = usageQuery.data?.find((u) =>
    provider.platform
      ? u.source === 'PLATFORM' && u.providerName === provider.name
      : u.llmProviderId === provider.id
  );
  const displayName = provider.name;
  const hasModels = models.length > 0;
  // A platform provider has no purposes tab; a tab selection carried over from
  // another provider (client-side navigation reuses this component) must not
  // leave the content area blank.
  const shownTab = provider.platform && activeTab === 'purposes' ? 'info' : activeTab;
  const backLabel = scope === 'platform' ? t('platformProvidersTitle') : t('title');

  // One line per configured purpose: the model that would be tried first, plus
  // how many fallbacks sit behind it. Audio purposes are omitted here for the
  // same reason the editor omits them — nothing consumes them yet.
  const purposeSummary = PROVIDER_PURPOSES.map((purpose) => {
    const label = t(purposeLabelKey[purpose]);
    const list = provider.purposePriority?.[purpose];
    switch (purposeState(provider.purposePriority, purpose)) {
      case 'off':
        return `${label}: ${t('purposeStateOff')}`;
      case 'list':
        return `${label}: ${list![0]}${list!.length > 1 ? ` +${list!.length - 1}` : ''}`;
      default:
        return `${label}: ${t('purposeStateUnset')}`;
    }
  }).join(' · ');

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={LIST_HREF[scope]}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <ProviderAvatar providerType={provider.providerType} platform={provider.platform} size="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{displayName}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <Chip strong tone="accent">{t(PROVIDER_TYPE_LABEL_KEY[provider.providerType])}</Chip>
              {provider.platform && (
                <Chip strong tone="success">{tu('platformBadge')}</Chip>
              )}
              {!provider.enabled && (
                <Chip strong tone="muted">
                  {provider.platform ? tu('freeTierOff') : t('disabled')}
                </Chip>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs
        activeTab={shownTab}
        onTabChange={(id) => setActiveTab(id as typeof activeTab)}
        tabs={[
          {
            id: 'info',
            label: tu('tabInfo'),
            content: (
              <div className="space-y-4">
                {/* Each management action sits inline with the field it mutates. */}
                <section className="bg-surface rounded-xl border border-border px-5 divide-y divide-border">
                  <FieldRow
                    label={t('apiKeyMask')}
                    value={provider.apiKeyMask}
                    mono
                    action={<RowAction icon={KeyIcon} label={t('rotateKey')} onClick={() => setRotating(true)} />}
                  />
                  <FieldRow
                    label={t('baseUrl')}
                    value={provider.baseUrl ?? t('baseUrlPlaceholderDefault')}
                    mono
                    action={<RowAction icon={PencilIcon} label={t('editProvider')} onClick={() => setEditing(true)} />}
                  />
                  <FieldRow
                    label={t('mediaTransport')}
                    value={provider.mediaTransport === 'MEDIA_ENDPOINT'
                      ? t('mediaTransportMedia')
                      : t('mediaTransportChat')}
                    sub={provider.mediaTransport === null ? t('mediaTransportDefaultSub') : undefined}
                    action={<RowAction icon={PencilIcon} label={t('editProvider')} onClick={() => setEditing(true)} />}
                  />
                  {/* A platform provider's assignments are global, not a
                      property of the row — they live on the admin page. */}
                  {provider.platform ? (
                    <FieldRow
                      label={t('purposesTitle')}
                      value={t('platformPurposesProviderValue')}
                      action={(
                        <RowAction
                          icon={AdjustmentsHorizontalIcon}
                          label={t('platformPurposesManage')}
                          onClick={() => router.push('/dashboard/admin/platform-llms')}
                        />
                      )}
                    />
                  ) : (
                    <FieldRow
                      label={t('purposesTitle')}
                      value={purposeSummary}
                      action={(
                        <RowAction
                          icon={AdjustmentsHorizontalIcon}
                          label={t('purposesManage')}
                          onClick={() => setActiveTab('purposes')}
                        />
                      )}
                    />
                  )}
                  <FieldRow
                    label={t('modelsLabel')}
                    value={hasModels ? t('availableModels', { count: models.length }) : t('noModelsYet')}
                    warn={!hasModels}
                    sub={provider.modelsRefreshedAt
                      ? t('modelsRefreshedAt', { when: formatDate(provider.modelsRefreshedAt, bcp47) })
                      : t('modelsNeverRefreshed')}
                    action={(
                      <RowAction
                        icon={CpuChipIcon}
                        label={t('modelsManage')}
                        onClick={() => setActiveTab('models')}
                      />
                    )}
                  />
                  <FieldRow label={t('createdAt')} value={formatDate(provider.createdAt, bcp47)} />
                </section>

                {/* A platform provider can be deleted only while no platform
                    assignment references it; the backend's 400 explains the
                    refusal and the modal shows it verbatim. */}
                <section className="bg-surface rounded-xl border border-error/30 p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{t('deleteProvider')}</h3>
                    <p className="text-xs text-muted mt-0.5">
                      {provider.platform ? t('deletePlatformWarning') : t('deleteWarning')}
                    </p>
                  </div>
                  <Button variant="danger" onClick={() => setDeleting(true)} className="flex items-center gap-2 shrink-0">
                    <TrashIcon className="h-4 w-4" />
                    {t('deleteProvider')}
                  </Button>
                </section>
              </div>
            ),
          },
          {
            id: 'models',
            label: t('tabModels'),
            content: (
              <ProviderModelsSection
                provider={provider}
                models={models}
                onRefresh={handleRefreshModels}
                refreshing={refreshing}
                refreshError={refreshError}
              />
            ),
          },
          // Platform assignments are global and edited on the admin page; a
          // platform row does not carry purpose lists of its own.
          ...(provider.platform ? [] : [{
            id: 'purposes',
            label: t('tabPurposes'),
            content: (
              <ProviderPurposesSection
                provider={provider}
                models={models}
                onSaved={applyUpdated}
              />
            ),
          }]),
          {
            id: 'usage',
            label: tu('tabUsage'),
            content: (
              <section className="bg-surface rounded-xl border border-border p-5 space-y-4">
                <p className="text-sm text-muted">
                  {provider.platform ? tu('usageSubtitlePlatform') : tu('usageSubtitleUser')}
                </p>
                {/* Media endpoints bill in money, not tokens, so their calls land here
                    as zero-token rows. Say so, or the screen reads as broken. */}
                {provider.mediaTransport === 'MEDIA_ENDPOINT' && (
                  <p className="text-xs text-muted">{tu('usageMediaEndpointNote')}</p>
                )}
                {usageQuery.isPending ? (
                  <div className="text-sm text-muted py-2">{tu('loadingUsage')}</div>
                ) : usageQuery.isError ? (
                  <div className="flex items-center gap-2 text-sm text-warning py-2">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    {tu('usageLoadFailed')}
                  </div>
                ) : usage && usage.windows.length > 0 ? (
                  <UsageBars windows={usage.windows} />
                ) : (
                  <div className="text-sm text-muted py-2">{tu('noUsage')}</div>
                )}
              </section>
            ),
          },
          {
            id: 'quotas',
            label: tu('tabQuotas'),
            content: <ProviderQuotasSection provider={provider} />,
          },
        ]}
      />

      {editing && (
        <EditLlmProviderModal
          provider={provider}
          onClose={() => setEditing(false)}
          onSuccess={(updated) => {
            applyUpdated(updated);
            // A rename changes the key platform usage rows are matched by, and
            // enabling/disabling adds or removes a row.
            invalidateUsage();
            setEditing(false);
          }}
        />
      )}

      {rotating && (
        <RotateLlmProviderKeyModal
          provider={provider}
          onClose={() => setRotating(false)}
          onSuccess={(updated) => {
            applyUpdated(updated);
            setRotating(false);
          }}
        />
      )}

      {deleting && (
        <DeleteLlmProviderModal
          provider={provider}
          onClose={() => setDeleting(false)}
          onSuccess={(deletedId) => {
            setProviders(providers.filter((p) => p.id !== deletedId));
            invalidateUsage();
            router.push(LIST_HREF[scope]);
          }}
        />
      )}
    </div>
  );
}

// One field of the provider config: label + value (+ optional sub-line), with
// an optional action button aligned to the field it belongs to.
function FieldRow({
  label,
  value,
  sub,
  mono,
  warn,
  action,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
  warn?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <div className="text-xs text-muted">{label}</div>
        <div className={`text-sm mt-0.5 truncate ${mono ? 'font-mono' : ''} ${warn ? 'text-warning' : 'text-foreground'}`}>
          {value}
        </div>
        {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
      </div>
      {action}
    </div>
  );
}
