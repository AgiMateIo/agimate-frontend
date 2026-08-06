'use client';

import { useTranslations } from 'next-intl';
import {
  CheckBadgeIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useClipboard } from '@/hooks/useClipboard';
import { getAgentAvatarUrl } from '@/utils/avatar';
import McpConnectPanel from '@/components/agents/McpConnectPanel';
import { WizardStepProps } from './AgentWizard';
import WizardRenamedNotice from './WizardRenamedNotice';

interface StepExternalDoneProps extends WizardStepProps {
  onReset: () => void;
}

// The key-and-connect finish of the external-AI wizard. Unlike the regular
// flow, the key is the point of this screen: it is shown once, it goes into
// someone else's config file, and nothing works without it.
export default function StepExternalDone({ data, onReset }: StepExternalDoneProps) {
  const t = useTranslations('AgentWizard');
  const router = useRouter();
  const { copied, copy } = useClipboard();

  const agent = data.created?.agent;
  const fullKey = data.created?.fullKey ?? '';
  if (!agent) return null;

  const bound = data.connections.filter(
    (c) => !data.bindFailures.some((f) => f.id === c.id),
  );

  return (
    <div className="space-y-6 p-6">
      <div className="py-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
          <CheckBadgeIcon className="h-8 w-8 text-success" />
        </div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <img src={getAgentAvatarUrl(agent.name)} alt={agent.name} className="h-10 w-10 rounded-lg" />
          <h2 className="text-xl font-bold text-foreground">{t('doneTitle')}</h2>
        </div>
        <p className="text-muted mt-1">{t('externalDoneSubtitle', { name: agent.name })}</p>
      </div>

      <WizardRenamedNotice requested={data.name.trim()} actual={agent.name} />

      {/* Bindings happen after the agent exists, so a failure here leaves a real
          agent with fewer connections — a to-do, not a failed creation. */}
      {data.bindFailures.length > 0 && (
        <Alert variant="warning">
          {t('bindFailed', { names: data.bindFailures.map((c) => c.name || c.fullCode).join(', ') })}
        </Alert>
      )}

      {fullKey && (
        <div className="space-y-2">
          <Alert variant="warning">{t('externalKeyWarning')}</Alert>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg border border-border/50 bg-surface-secondary px-4 py-2.5 font-mono text-sm text-foreground">
              {fullKey}
            </code>
            <button
              type="button"
              onClick={() => copy(fullKey)}
              className="shrink-0 rounded-lg border border-border/50 p-2.5 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
              title={t('copy')}
              aria-label={t('copy')}
            >
              {copied ? (
                <ClipboardDocumentCheckIcon className="h-5 w-5 text-success" />
              ) : (
                <ClipboardDocumentIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Only an MCP client connects to an address of ours. A websocket or
          callback agent is driven by its own runtime, which needs the key and
          nothing else from this screen. */}
      {agent.type === 'MCP' && <McpConnectPanel agentKey={fullKey} connections={bound} />}
      {(agent.type === 'CENTRIFUGO' || agent.type === 'WEBHOOK') && (
        <Alert variant="info">{t(`externalNextSteps_${agent.type}`)}</Alert>
      )}

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onReset}>
          {t('createAnother')}
        </Button>
        <Button type="button" onClick={() => router.push(`/dashboard/agents/${agent.id}`)}>
          {t('openAgent')}
        </Button>
      </div>
    </div>
  );
}
