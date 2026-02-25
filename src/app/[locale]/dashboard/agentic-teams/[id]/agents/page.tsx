'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import { AgentResponse, ApiKey } from '@/types';
import { AgenticTeam } from '@/types/agentic-teams';
import { useSetBreadcrumb } from '@/contexts/BreadcrumbContext';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import AgentsList from '@/components/agents/AgentsList';

export default function TeamAgentsPage() {
  const t = useTranslations('AgenticTeams');
  const tAgents = useTranslations('Agents');
  const params = useParams();
  const teamId = params.id as string;

  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [team, setTeam] = useState<AgenticTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSetBreadcrumb(teamId, team?.name);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [agentsData, apiKeysData, teamData] = await Promise.all([
        apiService.getAgentsList(teamId),
        apiService.getApiKeys(),
        apiService.getAgenticTeam(teamId),
      ]);
      setAgents(agentsData);
      setApiKeys(apiKeysData);
      setTeam(teamData);
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
        <h1 className="text-2xl font-bold text-foreground">{t('teamAgents')}</h1>
        <div className="text-center py-12 text-muted">{t('loadingAgents')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
