'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  CheckBadgeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { Link, getPathname, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useClipboard } from '@/hooks/useClipboard';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { WizardStepProps } from './AgentWizard';

interface StepDoneProps extends WizardStepProps {
  onReset: () => void;
}

export default function StepDone({ data, onReset }: StepDoneProps) {
  const t = useTranslations('AgentWizard');
  const locale = useLocale();
  const router = useRouter();
  const { copied, copy } = useClipboard();
  const [showKey, setShowKey] = useState(false);

  // Connectors the agent's skills are waiting for — preset union + codes of
  // library skills added on the previous step. Display only.
  const pendingConnectors = useMemo(
    () =>
      [
        ...new Set([
          ...data.presetConnectorCodes,
          ...data.skills.flatMap((s) => s.connectorCodes ?? []),
        ]),
      ],
    [data.presetConnectorCodes, data.skills],
  );

  const agent = data.created?.agent;
  if (!agent) return null;

  return (
    <div className="space-y-6">
      <div className="text-center py-2">
        <div className="mx-auto h-14 w-14 rounded-full bg-success/15 flex items-center justify-center">
          <CheckBadgeIcon className="h-8 w-8 text-success" />
        </div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <img
            src={getAgentAvatarUrl(agent.name)}
            alt={agent.name}
            className="h-10 w-10 rounded-lg"
          />
          <h2 className="text-xl font-bold text-foreground">{t('doneTitle')}</h2>
        </div>
        <p className="text-muted mt-1">{t('doneSubtitle', { name: agent.name })}</p>
      </div>

      {/* The aha moment: talk to the agent seconds after picking a role. */}
      <div className="flex justify-center">
        <Button
          type="button"
          onClick={() =>
            window.open(
              getPathname({ href: `/dashboard/agents/${agent.id}/chat`, locale }),
              '_blank',
              'noopener,noreferrer',
            )
          }
          className="flex items-center gap-2 px-6 py-3 text-base"
        >
          <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5" />
          {t('chatNow')}
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t('nextStepsTitle')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href={`/dashboard/agents/${agent.id}/connections`}
            className="group flex items-start gap-3 rounded-lg border border-border p-4 hover:border-accent/50 hover:bg-surface-secondary transition-colors"
          >
            <WrenchScrewdriverIcon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                {t('nextConnectors')}
                <ChevronRightIcon className="h-3.5 w-3.5 text-muted transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-xs text-muted mt-0.5">{t('nextConnectorsDesc')}</p>
              {pendingConnectors.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {pendingConnectors.map((code) => (
                    <span
                      key={code}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent/10 text-accent"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>

          <Link
            href={`/dashboard/agents/${agent.id}/channels`}
            className="group flex items-start gap-3 rounded-lg border border-border p-4 hover:border-accent/50 hover:bg-surface-secondary transition-colors"
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                {t('nextChannels')}
                <ChevronRightIcon className="h-3.5 w-3.5 text-muted transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-xs text-muted mt-0.5">{t('nextChannelsDesc')}</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Webchat needs no key; keep it tucked away for API/webhook use cases. */}
      {data.created?.fullKey && (
        <div className="border border-border rounded-lg">
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground"
          >
            <span>{t('advancedTitle')}</span>
            <ChevronDownIcon
              className={`h-4 w-4 text-muted transition-transform ${showKey ? 'rotate-180' : ''}`}
            />
          </button>
          {showKey && (
            <div className="px-4 pb-4 space-y-2">
              <Alert variant="warning">{t('agentKeyWarning')}</Alert>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-surface-secondary border border-border/50 rounded-lg px-4 py-2.5 text-sm font-mono text-foreground break-all">
                  {data.created.fullKey}
                </code>
                <button
                  type="button"
                  onClick={() => copy(data.created!.fullKey)}
                  className="shrink-0 p-2.5 rounded-lg border border-border/50 hover:bg-surface-secondary transition-colors text-muted hover:text-foreground"
                  title={t('copy')}
                >
                  {copied ? (
                    <ClipboardDocumentCheckIcon className="w-5 h-5 text-success" />
                  ) : (
                    <ClipboardDocumentIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onReset}>
          {t('createAnother')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
        >
          {t('openAgent')}
        </Button>
      </div>
    </div>
  );
}
