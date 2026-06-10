'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AppResponse, PolicyEffect, PolicyKind, ConnectorCatalogEntry, ConnectorType, IntegrationResponse, PagedResponse } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';
import { MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { getPolicyLabels } from './policyLabels';

const CONNECTOR_PAGE_SIZE = 10;

interface AddPolicyModalProps {
  kind: PolicyKind;
  agentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'connector' | 'identity' | 'resource' | 'effect';

const ALL_STEPS: Step[] = ['connector', 'identity', 'resource', 'effect'];

const WILDCARD = '__wildcard__';

interface ResourceItem {
  name: string;
  description?: string;
}

export default function AddPolicyModal({ kind, agentId, onClose, onSuccess }: AddPolicyModalProps) {
  const t = useTranslations('Agents');
  const labels = getPolicyLabels(kind);
  const [step, setStep] = useState<Step>('connector');

  const [connectorCode, setConnectorCode] = useState<string | undefined>(undefined);
  const [connectorName, setConnectorName] = useState('');
  const [connectorType, setConnectorType] = useState<ConnectorType | undefined>(undefined);
  const [connectorIdentity, setConnectorIdentity] = useState<string | undefined>(undefined);
  const [resourceName, setResourceName] = useState<string | undefined>(undefined);
  const [effect, setEffect] = useState<PolicyEffect>('ALLOW');
  const [description, setDescription] = useState('');

  // Connector search (server-side)
  const [connectorSearch, setConnectorSearch] = useState('');
  const [debouncedConnectorSearch, setDebouncedConnectorSearch] = useState('');
  const [connectorPage, setConnectorPage] = useState(0);
  const [connectorsData, setConnectorsData] = useState<PagedResponse<ConnectorCatalogEntry> | null>(null);
  const [connectorsLoading, setConnectorsLoading] = useState(true);

  const [apps, setApps] = useState<AppResponse[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [credentials, setCredentials] = useState<IntegrationResponse[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to create policy',
  });

  // Debounce connector search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedConnectorSearch(connectorSearch);
      setConnectorPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [connectorSearch]);

  // Fetch connectors from server
  const fetchConnectors = useCallback(async () => {
    setConnectorsLoading(true);
    try {
      const data = await apiService.getConnectors({
        search: debouncedConnectorSearch || undefined,
        page: connectorPage,
        size: CONNECTOR_PAGE_SIZE,
      });
      setConnectorsData(data);
    } catch {
      // ignore
    } finally {
      setConnectorsLoading(false);
    }
  }, [debouncedConnectorSearch, connectorPage]);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  // Load identities when entering identity step
  useEffect(() => {
    if (step !== 'identity') return;
    let cancelled = false;
    if (connectorType === 'INTEGRATION' && connectorCode && connectorCode !== WILDCARD) {
      if (credentials.length > 0) return;
      setCredentialsLoading(true);
      apiService.getIntegrationCredentials(connectorCode)
        .then((data) => { if (!cancelled) setCredentials(data); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setCredentialsLoading(false); });
    } else {
      if (apps.length > 0) return;
      apiService.getApps({ size: 100 })
        .then((data) => { if (!cancelled) setApps(data.content); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setAppsLoading(false); });
    }
    return () => { cancelled = true; };
  }, [step, connectorType, connectorCode, apps.length, credentials.length]);

  // Load resources (tools or triggers) when entering resource step with a specific identity
  useEffect(() => {
    if (step !== 'resource' || !connectorIdentity || connectorIdentity === WILDCARD) return;
    let cancelled = false;
    let fetcher: Promise<ResourceItem[]>;
    if (connectorType === 'INTEGRATION' && connectorCode && connectorCode !== WILDCARD) {
      fetcher = kind === 'tool'
        ? apiService.getIntegrationTools(connectorCode)
        : apiService.getIntegrationTriggers(connectorCode);
    } else {
      fetcher = kind === 'tool'
        ? apiService.getAppTools(connectorIdentity)
        : apiService.getAppTriggers(connectorIdentity);
    }
    fetcher
      .then((data) => { if (!cancelled) setResources(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setResourcesLoading(false); });
    return () => { cancelled = true; };
  }, [step, connectorIdentity, connectorType, connectorCode, kind]);

  const currentIndex = ALL_STEPS.indexOf(step);

  const skipToEffect = (fromStep: Step) => {
    if (fromStep === 'connector') {
      setConnectorCode(WILDCARD);
      setConnectorName('');
      setConnectorType(undefined);
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
      const nextStep = ALL_STEPS[nextIndex];
      if (nextStep === 'identity') {
        if (connectorType === 'INTEGRATION') setCredentialsLoading(true);
        else setAppsLoading(true);
      }
      if (nextStep === 'resource') { setResourcesLoading(true); setResources([]); }
      setStep(nextStep);
    }
  };

  const goBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      const prevStep = ALL_STEPS[prevIndex];
      if (prevStep === 'connector') {
        setConnectorCode(undefined);
        setConnectorName('');
        setConnectorType(undefined);
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

  const connectorDisplayName = (code: string | undefined) => {
    if (code === WILDCARD || code === undefined) return t('anyWildcard');
    return connectorName || code;
  };

  const toApiValue = (v: string | undefined) => (v === WILDCARD || v === undefined) ? undefined : v;

  const onSubmit = () => {
    if (step !== 'effect') return;
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(fakeEvent, async () => {
      const data = {
        agentId,
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

  const connectors = connectorsData?.content ?? [];
  const connectorsTotalPages = connectorsData?.totalPages ?? 0;
  const connectorsTotalElements = connectorsData?.totalElements ?? 0;

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

      <div className="space-y-4">
        {/* Step 1: Connector */}
        {step === 'connector' && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t('selectConnector')}</p>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                value={connectorSearch}
                onChange={(e) => setConnectorSearch(e.target.value)}
                placeholder={t('searchConnectors')}
                className="w-full pl-9 pr-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              connectorCode === WILDCARD ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
            }`}>
              <input
                type="radio"
                name="connector"
                checked={connectorCode === WILDCARD}
                onChange={() => { setConnectorCode(WILDCARD); setConnectorName(''); setConnectorType(undefined); }}
                className="accent-accent"
              />
              <div>
                <span className="text-sm font-medium text-foreground">{t('anyWildcard')}</span>
                <p className="text-xs text-muted mt-0.5">{t('skipForWildcard')}</p>
              </div>
            </label>
            <div className="min-h-[120px]">
              {connectorsLoading ? (
                <div className="text-center py-8 text-muted text-sm">{t('loadingConnectors')}</div>
              ) : connectors.length === 0 ? (
                <div className="text-center py-8 text-muted text-sm">{t('noConnectorsFound')}</div>
              ) : (
                <div className="space-y-2">
                  {connectors.map((c) => (
                    <label key={c.code} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      connectorCode === c.code ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                    }`}>
                      <input
                        type="radio"
                        name="connector"
                        checked={connectorCode === c.code}
                        onChange={() => { setConnectorCode(c.code); setConnectorName(c.name); setConnectorType(c.type); }}
                        className="accent-accent"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{c.name}</span>
                          <span className="text-xs text-muted font-mono">{c.code}</span>
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${
                            c.type === 'APP' ? 'bg-primary/10 text-primary' :
                            c.type === 'INTEGRATION' ? 'bg-warning/10 text-warning' :
                            c.type === 'INTERNAL_SERVICE' ? 'bg-accent/10 text-accent' :
                            'bg-surface-secondary text-muted'
                          }`}>{c.type}</span>
                        </div>
                        {c.description && (
                          <p className="text-xs text-muted mt-0.5">{c.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {connectorsTotalPages > 1 && (
              <div className="flex items-center justify-end gap-3 text-xs text-muted">
                <span>
                  {connectorPage * CONNECTOR_PAGE_SIZE + 1}–{Math.min((connectorPage + 1) * CONNECTOR_PAGE_SIZE, connectorsTotalElements)} / {connectorsTotalElements}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setConnectorPage((p) => p - 1)}
                    disabled={connectorPage === 0}
                    className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectorPage((p) => p + 1)}
                    disabled={connectorPage >= connectorsTotalPages - 1}
                    className="p-1 rounded hover:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Identity */}
        {step === 'identity' && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {connectorType === 'INTEGRATION' ? t('selectIntegrationIdentity') : t('selectIdentity')}
            </p>
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
            {connectorType === 'INTEGRATION' ? (
              credentialsLoading ? (
                <div className="text-center py-4 text-muted text-sm">{t('loadingCredentials')}</div>
              ) : credentials.length === 0 ? (
                <div className="text-center py-4 text-muted text-sm">{t('noCredentialsFound')}</div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {credentials.map((cred) => (
                    <label key={cred.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      connectorIdentity === cred.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                    }`}>
                      <input
                        type="radio"
                        name="identity"
                        checked={connectorIdentity === cred.id}
                        onChange={() => setConnectorIdentity(cred.id)}
                        className="accent-accent"
                      />
                      <div>
                        <span className="text-sm font-medium text-foreground">{cred.name || cred.platformIdentifier}</span>
                        {cred.name && (
                          <span className="text-xs text-muted ml-2 font-mono">{cred.platformIdentifier}</span>
                        )}
                        <span className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${
                          cred.enabled ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted'
                        }`}>{cred.enabled ? 'ON' : 'OFF'}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )
            ) : (
              appsLoading ? (
                <div className="text-center py-4 text-muted text-sm">{t('loadingApps')}</div>
              ) : apps.length === 0 ? (
                <div className="text-center py-4 text-muted text-sm">{t('noAppsFound')}</div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {apps.map((app) => (
                    <label key={app.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      connectorIdentity === app.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                    }`}>
                      <input
                        type="radio"
                        name="identity"
                        checked={connectorIdentity === app.id}
                        onChange={() => setConnectorIdentity(app.id)}
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
              )
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
              <div><strong>{t('connectorCode')}:</strong> {connectorDisplayName(connectorCode)}</div>
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
            <Button type="button" loading={loading} className="flex-1" onClick={onSubmit}>
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
      </div>
    </Modal>
  );
}
