'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import apiService from '@/services/api';
import { AppResponse, DeviceToolInfo, PolicyEffect } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/FormField';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useAsyncForm } from '@/hooks/useAsyncForm';

interface AddToolPolicyModalProps {
  agentPubId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'connector' | 'identity' | 'tool' | 'effect';

const ALL_STEPS: Step[] = ['connector', 'identity', 'tool', 'effect'];

// Sentinel value meaning "any / wildcard" — distinct from "not yet chosen"
const WILDCARD = '__wildcard__';

export default function AddToolPolicyModal({ agentPubId, onClose, onSuccess }: AddToolPolicyModalProps) {
  const t = useTranslations('Agents');
  const [step, setStep] = useState<Step>('connector');

  // null = wildcard, string = specific value, undefined = not yet chosen
  const [connectorCode, setConnectorCode] = useState<string | undefined>(undefined);
  const [connectorIdentity, setConnectorIdentity] = useState<string | undefined>(undefined);
  const [toolName, setToolName] = useState<string | undefined>(undefined);
  const [effect, setEffect] = useState<PolicyEffect>('ALLOW');
  const [description, setDescription] = useState('');

  // Data for selectors
  const [apps, setApps] = useState<AppResponse[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [tools, setTools] = useState<DeviceToolInfo[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);

  const { loading, error, handleSubmit } = useAsyncForm<void>({
    onSuccess,
    defaultError: 'Failed to create tool policy',
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

  // Load tools when entering tool step with a specific identity
  useEffect(() => {
    if (step === 'tool' && connectorIdentity && connectorIdentity !== WILDCARD) {
      setToolsLoading(true);
      setTools([]);
      apiService.getAppTools(connectorIdentity)
        .then(setTools)
        .catch(() => {})
        .finally(() => setToolsLoading(false));
    }
  }, [step, connectorIdentity]);

  const currentIndex = ALL_STEPS.indexOf(step);

  // Cascading skip: wildcard at level N → all levels below also become wildcard, jump to effect
  const skipToEffect = (fromStep: Step) => {
    if (fromStep === 'connector') {
      setConnectorCode(WILDCARD);
      setConnectorIdentity(WILDCARD);
      setToolName(WILDCARD);
    } else if (fromStep === 'identity') {
      setConnectorIdentity(WILDCARD);
      setToolName(WILDCARD);
    } else if (fromStep === 'tool') {
      setToolName(WILDCARD);
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
      // When going back, clear cascaded wildcards
      if (prevStep === 'connector') {
        setConnectorCode(undefined);
        setConnectorIdentity(undefined);
        setToolName(undefined);
      } else if (prevStep === 'identity') {
        setConnectorIdentity(undefined);
        setToolName(undefined);
      } else if (prevStep === 'tool') {
        setToolName(undefined);
      }
      setStep(prevStep);
    }
  };

  // For submit: WILDCARD → null (server expects null for wildcard)
  const toApiValue = (v: string | undefined) => (v === WILDCARD || v === undefined) ? undefined : v;

  const onSubmit = (e: React.FormEvent) =>
    handleSubmit(e, async () => {
      await apiService.createAgentToolPolicy({
        agentPubId,
        connectorCode: toApiValue(connectorCode),
        connectorIdentity: toApiValue(connectorIdentity),
        toolName: toApiValue(toolName),
        effect,
        description: description.trim() || undefined,
      });
    });

  const stepLabels: Record<Step, string> = {
    connector: t('stepConnector'),
    identity: t('stepIdentity'),
    tool: t('stepTool'),
    effect: t('stepEffect'),
  };

  // Can proceed with Next only if a specific value is selected (not undefined)
  const canGoNext =
    (step === 'connector' && connectorCode !== undefined && connectorCode !== WILDCARD) ||
    (step === 'identity' && connectorIdentity !== undefined && connectorIdentity !== WILDCARD) ||
    (step === 'tool' && toolName !== undefined && toolName !== WILDCARD);

  return (
    <Modal isOpen={true} onClose={onClose} title={t('addToolPolicy')} size="lg">
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

        {/* Step 3: Tool */}
        {step === 'tool' && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t('selectTool')}</p>
            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              toolName === WILDCARD ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
            }`}>
              <input
                type="radio"
                name="tool"
                checked={toolName === WILDCARD}
                onChange={() => setToolName(WILDCARD)}
                className="accent-accent"
              />
              <div>
                <span className="text-sm font-medium text-foreground">{t('anyWildcard')}</span>
                <p className="text-xs text-muted mt-0.5">{t('skipForWildcard')}</p>
              </div>
            </label>
            {toolsLoading ? (
              <div className="text-center py-4 text-muted text-sm">{t('loadingTools')}</div>
            ) : tools.length === 0 ? (
              <div className="text-center py-4 text-muted text-sm">{t('noToolsFound')}</div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {tools.map((tool) => (
                  <label key={tool.name} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    toolName === tool.name ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                  }`}>
                    <input
                      type="radio"
                      name="tool"
                      checked={toolName === tool.name}
                      onChange={() => setToolName(tool.name)}
                      className="accent-accent"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground font-mono">{tool.name}</span>
                      {tool.description && (
                        <p className="text-xs text-muted mt-0.5">{tool.description}</p>
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
              <div><strong>{t('toolNameColumn')}:</strong> {toolName === WILDCARD ? t('anyWildcard') : toolName}</div>
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
                // Wildcard selected → cascade skip to effect
                if (
                  (step === 'connector' && connectorCode === WILDCARD) ||
                  (step === 'identity' && connectorIdentity === WILDCARD) ||
                  (step === 'tool' && toolName === WILDCARD)
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
                (step === 'tool' && toolName === undefined)
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
