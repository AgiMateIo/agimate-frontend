'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { ArrowLeftIcon, PencilIcon, LockClosedIcon, KeyIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/i18n/navigation';
import apiService from '@/services/api';
import { AgentResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Tabs } from '@/components/ui/Tabs';
import { getAgentAvatarUrl } from '@/utils/avatar';
import { formatDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import { Link } from '@/i18n/navigation';
import AgentConnectionsTab from '@/components/agents/AgentConnectionsTab';
import AgentSkillsTab from '@/components/agents/AgentSkillsTab';
import AgentModelsTab from '@/components/agents/AgentModelsTab';
import AgentChannelsTab from '@/components/agents/AgentChannelsTab';

type Tab = 'general' | 'models' | 'channels' | 'skills' | 'connections';

export default function AgentDetailPage() {
  const t = useTranslations('Agents');
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('general');

  const fetchAgent = useCallback(async () => {
    try {
      setError(null);
      const data = await apiService.getAgent(agentId);
      setAgent(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load agent'));
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-muted">{t('loadingAgents')}</div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push('/dashboard/agents')}
          className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="text-sm">{t('backToAgents')}</span>
        </button>
        <ErrorAlert>{error || 'Agent not found'}</ErrorAlert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/dashboard/agents')}
        className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        <span className="text-sm">{t('backToAgents')}</span>
      </button>

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
                <AgentSkillsTab agentId={agentId} onConnectConnector={() => setActiveTab('connections')} />
              </div>
            ),
          },
          {
            id: 'connections',
            label: t('tabConnections'),
            content: (
              <div className="bg-surface rounded-xl border border-border p-6">
                <AgentConnectionsTab agentId={agentId} />
              </div>
            ),
          },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as Tab)}
      />
    </div>
  );
}
