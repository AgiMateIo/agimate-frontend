'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowTopRightOnSquareIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { LlmModel, LlmProviderResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Alert } from '@/components/ui/Alert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { WIZARD_PROVIDERS, WizardProvider } from './providers';
import { WizardStepProps } from './AgentWizard';

const BINDING_NAME = 'main_model';

function modelLabel(m: LlmModel) {
  return m.displayName || m.id;
}

export default function Step2Provider({ data, setData, goNext, goBack }: WizardStepProps) {
  const t = useTranslations('AgentWizard');

  const [existing, setExisting] = useState<LlmProviderResponse[]>([]);
  // Either a freshly created provider or a chosen existing one.
  const [provider, setProvider] = useState<LlmProviderResponse | null>(null);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');

  // New-provider form.
  const [draftType, setDraftType] = useState<WizardProvider | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const { loading, error, handleSubmit } = useAsyncForm({ defaultError: t('step2Error') });

  useEffect(() => {
    apiService.getLlmProviders().then(setExisting).catch(() => {});
  }, []);

  const chooseExisting = async (p: LlmProviderResponse) => {
    setProvider(p);
    setDraftType(null);
    setVerifyError(null);
    setSelectedModel('');
    if (p.availableModels && p.availableModels.length > 0) {
      setModels(p.availableModels);
    } else {
      // No models cached yet — refresh to populate.
      setVerifying(true);
      try {
        const res = await apiService.refreshLlmProviderModels(p.id);
        setModels(res.availableModels);
      } catch {
        setVerifyError(t('refreshFailed'));
        setModels([]);
      } finally {
        setVerifying(false);
      }
    }
  };

  const chooseNew = (wp: WizardProvider) => {
    setDraftType(wp);
    setProvider(null);
    setModels([]);
    setSelectedModel('');
    setApiKey('');
    setBaseUrl('');
    setVerifyError(null);
  };

  // Create the provider and immediately refresh models — this verifies the key.
  const connectAndVerify = async () => {
    if (!draftType) return;
    setVerifyError(null);
    setVerifying(true);
    try {
      const created = await apiService.createLlmProvider({
        name: draftType.name,
        providerType: draftType.type,
        apiKey: apiKey.trim(),
        baseUrl: draftType.needsBaseUrl ? baseUrl.trim() : null,
      });
      const res = await apiService.refreshLlmProviderModels(created.id);
      setProvider(created);
      setModels(res.availableModels);
      setExisting((prev) => [created, ...prev]);
      if (res.availableModels.length === 1) setSelectedModel(res.availableModels[0].id);
    } catch (e) {
      setVerifyError(getErrorMessage(e, t('verifyFailed')));
    } finally {
      setVerifying(false);
    }
  };

  const canConnect =
    !!draftType && apiKey.trim().length > 0 && (!draftType.needsBaseUrl || baseUrl.trim().length > 0);

  const bindAndNext = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      if (!data.agent || !provider || !selectedModel) return;
      const binding = await apiService.createAgentLlm(data.agent.id, {
        name: BINDING_NAME,
        llmProviderId: provider.id,
        model: selectedModel,
      });
      setData({ binding });
      goNext();
    });

  // Already bound on a previous visit — show summary.
  if (data.binding) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('step2Title')}</h2>
          <p className="text-sm text-muted mt-0.5">{t('step2Subtitle')}</p>
        </div>
        <div className="flex items-start gap-3 p-4 rounded-lg border border-success/30 bg-success/5">
          <CheckCircleIcon className="h-6 w-6 text-success shrink-0" />
          <div>
            <div className="font-medium text-foreground">{t('modelBound')}</div>
            <div className="text-sm text-muted mt-0.5">
              {data.binding.model} · {data.binding.llmProviderName}
            </div>
          </div>
        </div>
        <div className="flex justify-between gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={goBack}>{t('back')}</Button>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                if (data.agent) {
                  await apiService.deleteAgentLlm(data.agent.id, data.binding!.name).catch(() => {});
                }
                setData({ binding: null });
                setProvider(null);
                setModels([]);
                setSelectedModel('');
              }}
            >
              {t('changeModel')}
            </Button>
            <Button type="button" onClick={goNext}>{t('next')}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={bindAndNext} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('step2Title')}</h2>
        <p className="text-sm text-muted mt-0.5">{t('step2Subtitle')}</p>
      </div>

      {existing.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{t('existingProviders')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {existing.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => chooseExisting(p)}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors
                  ${provider?.id === p.id && !draftType
                    ? 'border-accent bg-accent/5'
                    : 'border-border bg-surface-secondary hover:border-accent/50'}`}
              >
                <div className="h-9 w-9 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-bold text-sm shrink-0">
                  {p.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{p.name}</div>
                  <div className="text-xs text-muted">
                    {t('modelsCount', { count: p.availableModels?.length ?? 0 })}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{t('newProvider')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WIZARD_PROVIDERS.map((wp) => (
            <button
              key={wp.type}
              type="button"
              onClick={() => chooseNew(wp)}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors
                ${draftType?.type === wp.type
                  ? 'border-accent bg-accent/5'
                  : 'border-border bg-surface-secondary hover:border-accent/50'}`}
            >
              <div className="h-9 w-9 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-bold text-sm shrink-0">
                {wp.badge}
              </div>
              <div className="font-medium text-foreground">{wp.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* New-provider credential form */}
      {draftType && !provider && (
        <div className="border border-border rounded-lg p-4 space-y-4">
          <FormField label={t('apiKeyLabel')} required hint={t('apiKeyHint')}>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={draftType.apiKeyPlaceholder}
            />
          </FormField>

          {draftType.needsBaseUrl && (
            <FormField label={t('baseUrlLabel')} required>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={t('baseUrlPlaceholder')}
              />
            </FormField>
          )}

          {draftType.docsUrl && (
            <a
              href={draftType.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              {t('getKeyLink')}
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            </a>
          )}

          {verifyError && <ErrorAlert>{verifyError}</ErrorAlert>}

          <Button type="button" onClick={connectAndVerify} loading={verifying} disabled={!canConnect || verifying}>
            {verifying ? t('verifying') : t('connectAndVerify')}
          </Button>
        </div>
      )}

      {/* Model selection (provider verified) */}
      {provider && (
        <div className="border border-border rounded-lg p-4 space-y-4">
          {verifying ? (
            <p className="text-sm text-muted">{t('verifying')}</p>
          ) : models.length === 0 ? (
            <Alert variant="warning">{t('noModels')}</Alert>
          ) : (
            <FormField label={t('modelLabel')} required>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-foreground"
              >
                <option value="">{t('selectModel')}</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{modelLabel(m)}</option>
                ))}
              </select>
            </FormField>
          )}
        </div>
      )}

      {error && <ErrorAlert>{error}</ErrorAlert>}

      {/* The model step is optional: an agent with no binding falls back to the
          platform model. Let the user skip connecting their own provider. */}
      <p className="text-xs text-muted">{t('step2SkipHint')}</p>

      <div className="flex flex-wrap justify-between gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={goBack}>{t('back')}</Button>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => {
              setData({ binding: null });
              goNext();
            }}
          >
            {t('step2Skip')}
          </Button>
          <Button type="submit" loading={loading} disabled={loading || !provider || !selectedModel}>
            {t('next')}
          </Button>
        </div>
      </div>
    </form>
  );
}
