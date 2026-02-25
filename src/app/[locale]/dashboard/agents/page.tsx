'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import apiService from '@/services/api';
import { AgentResponse, ApiKey } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import AgentsList from '@/components/agents/AgentsList';

export default function AgentsPage() {
  const t = useTranslations('Agents');
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [agentsData, apiKeysData] = await Promise.all([
        apiService.getAgentsList(),
        apiService.getApiKeys(),
      ]);
      setAgents(agentsData);
      setApiKeys(apiKeysData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <div className="text-center py-12 text-muted">{t('loadingAgents')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted mt-1">{t('subtitle')}</p>
      </div>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      {/* Agents Section */}
      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
          <Link
            href="/dashboard/agents/create"
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            {t('createAgent')}
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
