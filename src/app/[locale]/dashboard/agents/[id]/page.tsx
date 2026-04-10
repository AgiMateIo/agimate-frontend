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
import { getAgentAvatarUrl } from '@/utils/avatar';
import { formatDate } from '@/utils/date';
import { Link } from '@/i18n/navigation';
import AgentPoliciesTab from '@/components/agents/AgentPoliciesTab';
import AgentSkillsTab from '@/components/agents/AgentSkillsTab';

type Tab = 'general' | 'skills' | 'trigger-rules' | 'tool-rules';

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
      setError(err instanceof Error ? err.message : 'Failed to load agent');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: t('tabGeneral') },
    { key: 'skills', label: t('tabSkills') },
    { key: 'trigger-rules', label: t('tabTriggerRules') },
    { key: 'tool-rules', label: t('tabToolRules') },
  ];

  const getTriggerDestinationColor = (dest: string) => {
    switch (dest) {
      case 'CENTRIFUGO':
        return 'bg-accent/10 text-accent';
      case 'WEBHOOK':
        return 'bg-success/10 text-success';
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
      <div className="border-b border-border">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
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
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">{agent.prompt}</pre>
            </div>
          </div>

          {/* Trigger Destination */}
          <div>
            <h3 className="text-sm font-medium text-muted mb-2">{t('triggerDestination')}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-block rounded px-2.5 py-1 text-xs font-medium ${getTriggerDestinationColor(agent.triggerDestination)}`}>
                {agent.triggerDestination}
              </span>
              {agent.triggerDestination === 'WEBHOOK' && agent.webhookUrl && (
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
      )}

      {activeTab === 'skills' && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <AgentSkillsTab agentPubId={agentId} />
        </div>
      )}

      {activeTab === 'trigger-rules' && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <AgentPoliciesTab kind="trigger" agentPubId={agentId} />
        </div>
      )}

      {activeTab === 'tool-rules' && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <AgentPoliciesTab kind="tool" agentPubId={agentId} />
        </div>
      )}
    </div>
  );
}
