'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AppResponse, PolicyEffect, PolicyKind } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { getPolicyLabels } from './policyLabels';

interface AddPolicyModalProps {
  kind: PolicyKind;
  agentPubId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'connector' | 'identity' | 'resource' | 'effect';

const ALL_STEPS: Step[] = ['connector', 'identity', 'resource', 'effect'];

const WILDCARD = '__wildcard__';

interface ResourceItem {
  name: string;
  description: string;
}

export default function AddPolicyModal({ kind, agentPubId, onClose, onSuccess }: AddPolicyModalProps) {
  const t = useTranslations('Agents');
  const labels = getPolicyLabels(kind);
  const [step, setStep] = useState<Step>('connector');

  const [connectorCode, setConnectorCode] = useState<string | undefined>(undefined);
  const [connectorIdentity, setConnectorIdentity] = useState<string | undefined>(undefined);
  const [resourceName, setResourceName] = useState<string | undefined>(undefined);
  const [effect, setEffect] = useState<PolicyEffect>('ALLOW');
  const [description, setDescription] = useState('');

  const [apps, setApps] = useState<AppResponse[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to create policy',
  });

  // Load apps when entering identity step
  useEffect(() => {
    if (step === 'identity' && apps.length === 0) {
      setAppsLoading(true);
      apiService.getApps({ size: 100 })
        .then((data) => setApps(data.content))
        .catch(() => {})
        .finally(() => setAppsLoading(false));
    }
  }, [step, apps.length]);

  // Load resources (tools or triggers) when entering resource step with a specific identity
  useEffect(() => {
    if (step === 'resource' && connectorIdentity && connectorIdentity !== WILDCARD) {
      setResourcesLoading(true);
      setResources([]);
      const fetcher = kind === 'tool'
        ? apiService.getAppTools(connectorIdentity)
        : apiService.getAppTriggers(connectorIdentity);
      fetcher
        .then(setResources)
        .catch(() => {})
        .finally(() => setResourcesLoading(false));
    }
  }, [step, connectorIdentity, kind]);

  const currentIndex = ALL_STEPS.indexOf(step);

  const skipToEffect = (fromStep: Step) => {
    if (fromStep === 'connector') {
      setConnectorCode(WILDCARD);
      setConnectorIdentity(WILDCARD);
      setResourceName(WILDCARD);
    } else if (fromStep === 'identity') {
      setConnectorIdentity(WILDCARD);
      setResourceName(WILDCARD);
    } else if (fromStep === 'resource') {
      setResourceName(WILDCARD);
    }
    setStep('effect');
  };

  const goNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < ALL_STEPS.length) {
      setStep(ALL_STEPS[nextIndex]);
    }
  };

  const goBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      const prevStep = ALL_STEPS[prevIndex];
      if (prevStep === 'connector') {
        setConnectorCode(undefined);
        setConnectorIdentity(undefined);
        setResourceName(undefined);
      } else if (prevStep === 'identity') {
        setConnectorIdentity(undefined);
        setResourceName(undefined);
      } else if (prevStep === 'resource') {
        setResourceName(undefined);
      }
      setStep(prevStep);
    }
  };

  const toApiValue = (v: string | undefined) => (v === WILDCARD || v === undefined) ? undefined : v;

  const onSubmit = (e: React.FormEvent) => {
    // Guard: only allow submit on the final step
    if (step !== 'effect') {
      e.preventDefault();
      return;
    }
    handleSubmit(e, async () => {
      const data = {
        agentPubId,
        connectorCode: toApiValue(connectorCode),
        connectorIdentity: toApiValue(connectorIdentity),
        resourceName: toApiValue(resourceName),
        effect,
        description: description.trim() || undefined,
      };
      if (kind === 'tool') {
        await apiService.createAgentToolPolicy(data);
      } else {
        await apiService.createAgentTriggerPolicy(data);
      }
    });
  };

  const stepLabels: Record<Step, string> = {
    connector: t('stepConnector'),
    identity: t('stepIdentity'),
    resource: t(labels.stepResource),
    effect: t('stepEffect'),
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t(labels.addPolicy)} size="lg">
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        {ALL_STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="w-6 h-px bg-border" />}
            <div className={`flex items-center gap-1.5 text-xs font-medium ${
              i <= currentIndex ? 'text-accent' : 'text-muted'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                i < currentIndex ? 'bg-accent text-accent-foreground' :
                i === currentIndex ? 'bg-accent/20 text-accent border border-accent' :
                'bg-surface-secondary text-muted'
              }`}>
                {i + 1}
              </span>
              {stepLabels[s]}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Step 1: Connector */}
        {step === 'connector' && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t('selectConnector')}</p>
            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              connectorCode === WILDCARD ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
            }`}>
              <input
                type="radio"
                name="connector"
                checked={connectorCode === WILDCARD}
                onChange={() => setConnectorCode(WILDCARD)}
                className="accent-accent"
              />
              <div>
                <span className="text-sm font-medium text-foreground">{t('anyWildcard')}</span>
                <p className="text-xs text-muted mt-0.5">{t('skipForWildcard')}</p>
              </div>
            </label>
            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              connectorCode === 'app' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
            }`}>
              <input
                type="radio"
                name="connector"
                checked={connectorCode === 'app'}
                onChange={() => setConnectorCode('app')}
                className="accent-accent"
              />
              <span className="text-sm font-medium text-foreground">app</span>
            </label>
          </div>
        )}

        {/* Step 2: Identity */}
        {step === 'identity' && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t('selectIdentity')}</p>
            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              connectorIdentity === WILDCARD ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
            }`}>
              <input
                type="radio"
                name="identity"
                checked={connectorIdentity === WILDCARD}
                onChange={() => setConnectorIdentity(WILDCARD)}
                className="accent-accent"
              />
              <div>
                <span className="text-sm font-medium text-foreground">{t('anyWildcard')}</span>
                <p className="text-xs text-muted mt-0.5">{t('skipForWildcard')}</p>
              </div>
            </label>
            {appsLoading ? (
              <div className="text-center py-4 text-muted text-sm">{t('loadingApps')}</div>
            ) : apps.length === 0 ? (
              <div className="text-center py-4 text-muted text-sm">{t('noAppsFound')}</div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {apps.map((app) => (
                  <label key={app.pubId} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    connectorIdentity === app.pubId ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                  }`}>
                    <input
                      type="radio"
                      name="identity"
                      checked={connectorIdentity === app.pubId}
                      onChange={() => setConnectorIdentity(app.pubId)}
                      className="accent-accent"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground">{app.name}</span>
                      {app.description && (
                        <p className="text-xs text-muted mt-0.5">{app.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Resource (Tool or Trigger) */}
        {step === 'resource' && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t(labels.selectResource)}</p>
            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              resourceName === WILDCARD ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
            }`}>
              <input
                type="radio"
                name="resource"
                checked={resourceName === WILDCARD}
                onChange={() => setResourceName(WILDCARD)}
                className="accent-accent"
              />
              <div>
                <span className="text-sm font-medium text-foreground">{t('anyWildcard')}</span>
                <p className="text-xs text-muted mt-0.5">{t('skipForWildcard')}</p>
              </div>
            </label>
            {resourcesLoading ? (
              <div className="text-center py-4 text-muted text-sm">{t(labels.loadingResources)}</div>
            ) : resources.length === 0 ? (
              <div className="text-center py-4 text-muted text-sm">{t(labels.noResourcesFound)}</div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {resources.map((item) => (
                  <label key={item.name} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    resourceName === item.name ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                  }`}>
                    <input
                      type="radio"
                      name="resource"
                      checked={resourceName === item.name}
                      onChange={() => setResourceName(item.name)}
                      className="accent-accent"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground font-mono">{item.name}</span>
                      {item.description && (
                        <p className="text-xs text-muted mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Effect */}
        {step === 'effect' && (
          <div className="space-y-4">
            <p className="text-sm text-muted">{t('selectEffect')}</p>
            <div className="flex gap-4">
              <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border cursor-pointer transition-colors ${
                effect === 'ALLOW' ? 'border-success bg-success/5' : 'border-border hover:border-success/50'
              }`}>
                <input
                  type="radio"
                  name="effect"
                  value="ALLOW"
                  checked={effect === 'ALLOW'}
                  onChange={() => setEffect('ALLOW')}
                  className="accent-success"
                />
                <span className="text-sm font-bold text-success">{t('effectAllow')}</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border cursor-pointer transition-colors ${
                effect === 'DENY' ? 'border-error bg-error/5' : 'border-border hover:border-error/50'
              }`}>
                <input
                  type="radio"
                  name="effect"
                  value="DENY"
                  checked={effect === 'DENY'}
                  onChange={() => setEffect('DENY')}
                  className="accent-error"
                />
                <span className="text-sm font-bold text-error">{t('effectDeny')}</span>
              </label>
            </div>

            {/* Summary of selections */}
            <div className="bg-surface-secondary rounded-lg border border-border/50 p-3 text-xs text-muted space-y-1">
              <div><strong>{t('connectorCode')}:</strong> {connectorCode === WILDCARD ? t('anyWildcard') : connectorCode}</div>
              <div><strong>{t('connectorIdentity')}:</strong> {connectorIdentity === WILDCARD ? t('anyWildcard') : connectorIdentity}</div>
              <div><strong>{t(labels.resourceColumn)}:</strong> {resourceName === WILDCARD ? t('anyWildcard') : resourceName}</div>
            </div>

            <details className="group">
              <summary className="text-sm font-medium text-muted cursor-pointer hover:text-foreground transition-colors">
                {t('description')}
              </summary>
              <div className="mt-2">
                <TextArea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('description')}
                  rows={3}
                  maxLength={500}
                />
              </div>
            </details>
          </div>
        )}

        {error && <ErrorAlert>{error}</ErrorAlert>}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {currentIndex > 0 ? (
            <Button type="button" variant="secondary" onClick={goBack} className="flex-1">
              {t('backStep')}
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t('cancel')}
            </Button>
          )}

          {step === 'effect' ? (
            <Button type="submit" loading={loading} className="flex-1">
              {t('createPolicy')}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                if (
                  (step === 'connector' && connectorCode === WILDCARD) ||
                  (step === 'identity' && connectorIdentity === WILDCARD) ||
                  (step === 'resource' && resourceName === WILDCARD)
                ) {
                  skipToEffect(step);
                } else {
                  goNext();
                }
              }}
              className="flex-1"
              disabled={
                (step === 'connector' && connectorCode === undefined) ||
                (step === 'identity' && connectorIdentity === undefined) ||
                (step === 'resource' && resourceName === undefined)
              }
            >
              {t('nextStep')}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
