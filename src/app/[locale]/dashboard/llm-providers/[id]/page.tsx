'use client';

import { Suspense, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useSuspenseQueries } from '@tanstack/react-query';
import {
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
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Tabs } from '@/components/ui/Tabs';
import { RowAction } from '@/components/ui/RowAction';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import {
  llmProviderModelsOptions,
  llmProvidersListOptions,
  useLlmProviderCacheActions,
  useLlmUsageQuery,
} from '@/queries/llm-providers';
import { PROVIDER_TYPE_LABEL_KEY } from '@/components/llm-providers/providerPresets';
import { ProviderAvatar } from '@/components/llm-providers/ProviderAvatar';
import { UsageBars } from '@/components/llm-providers/UsageBars';
import ProviderQuotasSection from '@/components/llm-providers/ProviderQuotasSection';
import ProviderModelsSection from '@/components/llm-providers/ProviderModelsSection';
import EditLlmProviderModal from '@/components/llm-providers/EditLlmProviderModal';
import RotateLlmProviderKeyModal from '@/components/llm-providers/RotateLlmProviderKeyModal';
import DeleteLlmProviderModal from '@/components/llm-providers/DeleteLlmProviderModal';

function ProviderDetailContent({ id }: { id: string }) {
  const t = useTranslations('LlmProviders');
  const tu = useTranslations('LlmUsage');
  const locale = useLocale();
  const bcp47 = localeMap[locale];

  const router = useRouter();
  const [{ data: providers }, { data: models }] = useSuspenseQueries({
    queries: [llmProvidersListOptions(), llmProviderModelsOptions(id)],
  });
  const { setProviders, setProviderModels } = useLlmProviderCacheActions();
  const usageQuery = useLlmUsageQuery();

  const provider = providers.find((p) => p.id === id);

  const [activeTab, setActiveTab] = useState<'info' | 'models' | 'usage' | 'quotas'>('info');
  const [editing, setEditing] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Label the [id] breadcrumb segment with the provider name.
  useSetBreadcrumb(id, provider?.platform ? tu('platformProviderName') : provider?.name);

  if (!provider) {
    return (
      <div className="text-center py-12 text-muted">
        {t('noProviders')}
        <div className="mt-4">
          <Link href="/dashboard/llm-providers" className="text-accent hover:text-accent/80">
            ← {t('title')}
          </Link>
        </div>
      </div>
    );
  }

  const applyUpdated = (updated: LlmProviderResponse) =>
    setProviders(providers.map((p) => (p.id === updated.id ? updated : p)));

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

  const usage = usageQuery.data?.find((u) => u.llmProviderId === provider.id);
  const displayName = provider.platform ? tu('platformProviderName') : provider.name;
  const hasModels = models.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/llm-providers"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t('title')}
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <ProviderAvatar providerType={provider.providerType} platform={provider.platform} size="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{displayName}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                {t(PROVIDER_TYPE_LABEL_KEY[provider.providerType] ?? 'providerTypeOpenAICompatible')}
              </span>
              {provider.platform && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">
                  {tu('platformBadge')}
                </span>
              )}
              {!provider.enabled && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted/10 text-muted">
                  {provider.platform ? tu('freeTierOff') : t('disabled')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs
        activeTab={activeTab}
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
                    label={tu('defaultModel')}
                    value={provider.defaultModel ?? tu('noDefaultModel')}
                    mono={!!provider.defaultModel}
                  />
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

                {/* The platform provider cannot be deleted — only disabled. */}
                {!provider.platform && (
                  <section className="bg-surface rounded-xl border border-error/30 p-5 flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground">{t('deleteProvider')}</h3>
                      <p className="text-xs text-muted mt-0.5">{t('deleteWarning')}</p>
                    </div>
                    <Button variant="danger" onClick={() => setDeleting(true)} className="flex items-center gap-2 shrink-0">
                      <TrashIcon className="h-4 w-4" />
                      {t('deleteProvider')}
                    </Button>
                  </section>
                )}
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
          {
            id: 'usage',
            label: tu('tabUsage'),
            content: (
              <section className="bg-surface rounded-xl border border-border p-5 space-y-4">
                <p className="text-sm text-muted">
                  {provider.platform ? tu('usageSubtitlePlatform') : tu('usageSubtitleUser')}
                </p>
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
          models={models}
          onClose={() => setEditing(false)}
          onSuccess={(updated) => {
            applyUpdated(updated);
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
            router.push('/dashboard/llm-providers');
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

export default function LlmProviderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const t = useTranslations('LlmProviders');

  return (
    <ErrorBoundary resetKeys={[id]}>
      <Suspense fallback={<div className="text-center py-12 text-muted">{t('loading')}</div>}>
        <ProviderDetailContent id={id} />
      </Suspense>
    </ErrorBoundary>
  );
}
