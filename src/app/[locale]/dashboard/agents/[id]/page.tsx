'use client';

import { useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { ArrowLeftIcon, PencilIcon, LockClosedIcon, KeyIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import { useAgentDetailSuspenseQuery } from '@/queries/agents';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Tabs } from '@/components/ui/Tabs';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { formatDate } from '@/utils/date';
import { Link } from '@/i18n/navigation';
import AgentConnectionsTab from '@/components/agents/AgentConnectionsTab';
import AgentSkillsTab from '@/components/agents/AgentSkillsTab';
import AgentModelsTab from '@/components/agents/AgentModelsTab';
import AgentChannelsTab from '@/components/agents/AgentChannelsTab';

const TABS = ['general', 'models', 'channels', 'skills', 'connections'] as const;
type Tab = (typeof TABS)[number];

const isTab = (value: string | null): value is Tab => TABS.includes(value as Tab);

function AgentDetailContent({ agentId }: { agentId: string }) {
  const t = useTranslations('Agents');
  const locale = useLocale();
  // Deep link into a tab, e.g. ?tab=connections from the wizard's final step.
  const tabParam = useSearchParams().get('tab');

  const { data: agent } = useAgentDetailSuspenseQuery(agentId);
  useSetBreadcrumb(agentId, agent.name);
  const [activeTab, setActiveTab] = useState<Tab>(isTab(tabParam) ? tabParam : 'general');
  // Connector the user asked to connect from the skills tab's "waiting" badge;
  // opens the bind modal on the connections tab with this connector preselected.
  const [pendingConnectorCode, setPendingConnectorCode] = useState<string | null>(null);

  const getAgentTypeColor = (dest: string) => {
    switch (dest) {
      case 'CENTRIFUGO':
        return 'bg-accent/10 text-accent';
      case 'WEBHOOK':
        return 'bg-success/10 text-success';
      case 'GENERIC':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-muted/10 text-muted';
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={getAgentAvatarUrl(agent.name)}
            alt={agent.name}
            className="w-12 h-12 rounded-lg"
          />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{agent.name}</h1>
            {agent.agenticTeamName && (
              <p className="text-sm text-muted">{agent.agenticTeamName}</p>
            )}
          </div>
        </div>
        <Link
          href={`/dashboard/agents/${agent.id}/edit`}
          className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          <PencilIcon className="h-4 w-4" />
          {t('editAgentTitle')}
        </Link>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            id: 'general',
            label: t('tabGeneral'),
            content: (
              <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
                {/* Status & Key ID */}
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    agent.enabled ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${agent.enabled ? 'bg-success' : 'bg-muted'}`} />
                    {agent.enabled ? t('enabled') : t('disabled')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-surface-secondary border border-border/50 rounded-full px-3 py-1 text-xs text-muted font-mono">
                    <KeyIcon className="h-3 w-3" />
                    {agent.maskedKeyId}
                  </span>
                </div>

                {/* Description */}
                {agent.description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted mb-2">{t('description')}</h3>
                    <p className="text-sm text-foreground">{agent.description}</p>
                  </div>
                )}

                {/* Prompt */}
                <div>
                  <h3 className="text-sm font-medium text-muted mb-2">{t('prompt')}</h3>
                  <div className="bg-surface-secondary rounded-lg border border-border/50 p-4">
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">{agent.instructions}</pre>
                  </div>
                </div>

                {/* Agent Type */}
                <div>
                  <h3 className="text-sm font-medium text-muted mb-2">{t('agentType')}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block rounded px-2.5 py-1 text-xs font-medium ${getAgentTypeColor(agent.type)}`}>
                      {agent.type}
                    </span>
                    {agent.type === 'WEBHOOK' && agent.webhookUrl && (
                      <span className="inline-block bg-surface-secondary border border-border/50 rounded px-2.5 py-1 text-xs text-muted font-mono">
                        {agent.webhookUrl}
                      </span>
                    )}
                    {agent.hasWebhookAuth && (
                      <span className="inline-flex items-center gap-1 bg-surface-secondary border border-border/50 rounded px-2.5 py-1 text-xs text-muted">
                        <LockClosedIcon className="h-3 w-3" />
                        Auth
                      </span>
                    )}
                  </div>
                </div>

                {/* Created At */}
                <div>
                  <h3 className="text-sm font-medium text-muted mb-2">{t('createdAt')}</h3>
                  <p className="text-sm text-foreground">{formatDate(agent.createdAt, locale)}</p>
                </div>
              </div>
            ),
          },
          {
            id: 'models',
            label: t('tabModels'),
            content: (
              <div className="bg-surface rounded-xl border border-border p-6">
                <AgentModelsTab agentId={agentId} />
              </div>
            ),
          },
          {
            id: 'channels',
            label: t('tabChannels'),
            content: (
              <div className="bg-surface rounded-xl border border-border p-6">
                <AgentChannelsTab agentId={agentId} />
              </div>
            ),
          },
          {
            id: 'skills',
            label: t('tabSkills'),
            content: (
              <div className="bg-surface rounded-xl border border-border p-6">
                <AgentSkillsTab
                  agentId={agentId}
                  onConnectConnector={(code) => {
                    setPendingConnectorCode(code);
                    setActiveTab('connections');
                  }}
                />
              </div>
            ),
          },
          {
            id: 'connections',
            label: t('tabConnections'),
            content: (
              <div className="bg-surface rounded-xl border border-border p-6">
                <AgentConnectionsTab
                  agentId={agentId}
                  bindConnectorCode={pendingConnectorCode}
                  onBindConnectorHandled={() => setPendingConnectorCode(null)}
                />
              </div>
            ),
          },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as Tab)}
      />
    </>
  );
}

export default function AgentDetailPage() {
  const t = useTranslations('Agents');
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  return (
    <div className="space-y-6">
      {/* Back Button — kept in the shell so it stays visible while loading/on error. */}
      <button
        onClick={() => router.push('/dashboard/agents')}
        className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        <span className="text-sm">{t('backToAgents')}</span>
      </button>

      <ErrorBoundary>
        <Suspense fallback={<div className="text-center py-12 text-muted">{t('loadingAgents')}</div>}>
          <AgentDetailContent agentId={agentId} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
