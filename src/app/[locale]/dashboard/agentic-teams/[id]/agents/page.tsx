'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { AgentSettingsResponse, ConnectorsApiKey } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import AgentsList from '@/components/agents/AgentsList';

export default function TeamAgentsPage() {
  const t = useTranslations('AgenticTeams');
  const tAgents = useTranslations('Agents');
  const params = useParams();
  const teamId = params.id as string;

  const [agents, setAgents] = useState<AgentSettingsResponse[]>([]);
  const [apiKeys, setApiKeys] = useState<ConnectorsApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [agentsData, apiKeysData] = await Promise.all([
        apiService.getAgentSettingsList(teamId),
        apiService.getConnectorsApiKeys(),
      ]);
      setAgents(agentsData);
      setApiKeys(apiKeysData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href={`/dashboard/agentic-teams/${teamId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t('backToTeam')}
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{t('teamAgents')}</h1>
        <div className="text-center py-12 text-muted">{t('loadingAgents')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/agentic-teams/${teamId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {t('backToTeam')}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('teamAgents')}</h1>
      </div>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('agents')}</h2>
          <Link
            href="/dashboard/agents/create"
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            {tAgents('createAgent')}
          </Link>
        </div>

        <AgentsList
          agents={agents}
          apiKeys={apiKeys}
          onUpdate={fetchData}
        />
      </div>
    </div>
  );
}
