'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { LlmProviderResponse } from '@/types';
import { TrashIcon, PencilIcon, KeyIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Toggle } from '@/components/ui/Toggle';
import { localeMap } from '@/i18n/routing';
import { formatDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import { PROVIDER_TYPE_LABEL_KEY } from './providerPresets';
import EditLlmProviderModal from './EditLlmProviderModal';
import RotateLlmProviderKeyModal from './RotateLlmProviderKeyModal';
import DeleteLlmProviderModal from './DeleteLlmProviderModal';

interface LlmProvidersListProps {
  providers: LlmProviderResponse[];
  onUpdate: (providers: LlmProviderResponse[]) => void;
}

export default function LlmProvidersList({ providers, onUpdate }: LlmProvidersListProps) {
  const t = useTranslations('LlmProviders');
  const locale = useLocale();
  const bcp47 = localeMap[locale];

  const [editing, setEditing] = useState<LlmProviderResponse | null>(null);
  const [rotating, setRotating] = useState<LlmProviderResponse | null>(null);
  const [deleting, setDeleting] = useState<LlmProviderResponse | null>(null);
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

  const handleRefreshModels = async (provider: LlmProviderResponse) => {
    setBusy(provider.id, true);
    try {
      const result = await apiService.refreshLlmProviderModels(provider.id);
      onUpdate(providers.map(p => p.id === provider.id
        ? { ...p, availableModels: result.availableModels, modelsRefreshedAt: result.refreshedAt }
        : p));
    } catch (err) {
      const message = getErrorMessage(err, t('refreshFailed'));
      // surface the upstream error message to the user
      window.alert(message);
    } finally {
      setBusy(provider.id, false);
    }
  };

  const handleEditSuccess = (updated: LlmProviderResponse) => {
    onUpdate(providers.map(p => p.id === updated.id ? updated : p));
    setEditing(null);
  };

  const handleRotateSuccess = (updated: LlmProviderResponse) => {
    onUpdate(providers.map(p => p.id === updated.id ? updated : p));
    setRotating(null);
  };

  const handleDeleteSuccess = (id: string) => {
    onUpdate(providers.filter(p => p.id !== id));
    setDeleting(null);
  };

  if (providers.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        {t('noProviders')}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {providers.map((provider) => {
          const busy = busyIds.has(provider.id);
          const modelsCount = provider.availableModels?.length ?? 0;
          const hasModels = provider.availableModels !== null && modelsCount > 0;

          return (
            <div
              key={provider.id}
              className="bg-surface-secondary rounded-lg p-4 border border-border"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                      {t(PROVIDER_TYPE_LABEL_KEY[provider.providerType] ?? 'providerTypeOpenAICompatible')}
                    </span>
                    {!provider.enabled && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted/10 text-muted">
                        {t('disabled')}
                      </span>
                    )}
                  </div>

                  <h3 className="font-medium text-foreground mt-1">{provider.name}</h3>

                  <div className="text-xs text-muted mt-2 space-y-1 font-mono">
                    <p>{t('apiKeyMask')}: {provider.apiKeyMask}</p>
                    <p>{t('baseUrl')}: {provider.baseUrl ?? t('baseUrlPlaceholderDefault')}</p>
                  </div>

                  <div className="text-xs text-muted mt-2 space-y-1">
                    {hasModels ? (
                      <p>{t('availableModels', { count: modelsCount })}</p>
                    ) : (
                      <p className="text-warning">{t('noModelsYet')}</p>
                    )}
                    {provider.modelsRefreshedAt ? (
                      <p>{t('modelsRefreshedAt', { when: formatDate(provider.modelsRefreshedAt, bcp47) })}</p>
                    ) : (
                      <p>{t('modelsNeverRefreshed')}</p>
                    )}
                    <p>{t('createdAt')}: {formatDate(provider.createdAt, bcp47)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Toggle
                    checked={provider.enabled}
                    onChange={() => handleToggleEnabled(provider)}
                    disabled={busy}
                  />

                  <button
                    onClick={() => handleRefreshModels(provider)}
                    disabled={busy}
                    className="p-2 text-muted hover:text-foreground transition-colors rounded-lg disabled:opacity-50"
                    title={t('refreshModels')}
                  >
                    <ArrowPathIcon className={`h-5 w-5 ${busy ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={() => setRotating(provider)}
                    className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
                    title={t('rotateKey')}
                  >
                    <KeyIcon className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => setEditing(provider)}
                    className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
                    title={t('editProvider')}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => setDeleting(provider)}
                    className="p-2 text-muted hover:text-error transition-colors rounded-lg"
                    title={t('deleteProvider')}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <EditLlmProviderModal
          provider={editing}
          onClose={() => setEditing(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {rotating && (
        <RotateLlmProviderKeyModal
          provider={rotating}
          onClose={() => setRotating(null)}
          onSuccess={handleRotateSuccess}
        />
      )}

      {deleting && (
        <DeleteLlmProviderModal
          provider={deleting}
          onClose={() => setDeleting(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}
