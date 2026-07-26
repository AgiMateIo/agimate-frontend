'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { getErrorMessage } from '@/utils/error';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormField';
import { useLlmProviderCacheActions, useLlmProviderModelsQuery } from '@/queries/llm-providers';
import { ModelPickerList, type ModelRequirement } from './ModelPickerList';

interface ModelFieldProps {
  providerId: string;
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
  // Capability the consuming purpose needs — filters and warns in the picker.
  requirement?: ModelRequirement;
  // Re-seeds the picker's search/filter state (see ModelPickerList).
  pickerKey?: string;
  onError?: (message: string) => void;
}

// Model input for the agent-binding forms: the registry picker when the provider
// has one, plain text otherwise. An empty registry is normal (never refreshed,
// or the provider exposes no listing) and the backend accepts any string — so
// free input plus a refresh shortcut, never a dead end.
export function ModelField({
  providerId,
  value,
  onChange,
  disabled,
  requirement,
  pickerKey,
  onError,
}: ModelFieldProps) {
  const t = useTranslations('Agents');
  const [refreshing, setRefreshing] = useState(false);

  const modelsQuery = useLlmProviderModelsQuery(providerId);
  const { setProviderModels } = useLlmProviderCacheActions();
  const models = modelsQuery.data ?? [];
  const registryEmpty = modelsQuery.isSuccess && models.length === 0;

  const handleRefreshNow = async () => {
    if (!providerId) return;
    setRefreshing(true);
    try {
      const result = await apiService.refreshLlmProviderModels(providerId);
      setProviderModels(providerId, result.models);
    } catch (err) {
      onError?.(getErrorMessage(err, 'Failed to refresh models'));
    } finally {
      setRefreshing(false);
    }
  };

  if (modelsQuery.isPending) {
    return <p className="text-sm text-muted">{t('loadingModels')}</p>;
  }

  if (registryEmpty) {
    return (
      <div className="space-y-2">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('modelPlaceholder')}
          disabled={disabled || refreshing}
          required
        />
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-muted">{t('registryEmptyHint')}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={handleRefreshNow}
            loading={refreshing}
            disabled={disabled || !providerId}
          >
            {t('refreshNow')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ModelPickerList
      key={pickerKey}
      models={models}
      value={value}
      onChange={onChange}
      disabled={disabled || refreshing}
      requirement={requirement}
    />
  );
}
