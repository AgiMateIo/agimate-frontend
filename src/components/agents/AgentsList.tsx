'use client';

import { useTranslations } from 'next-intl';
import { AgentResponse } from '@/types';
import type { ViewMode } from '@/utils/viewMode';
import { Placeholder } from '@/components/ui/Placeholder';
import { AgentCard } from './AgentCard';
import { AgentTile } from './AgentTile';
import { AgentsTable } from './AgentsTable';

interface AgentsListProps {
  agents: AgentResponse[];
  mode: ViewMode;
}

export default function AgentsList({ agents, mode }: AgentsListProps) {
  const t = useTranslations('Agents');

  if (agents.length === 0) {
    return <Placeholder size="sm">{t('noAgents')}</Placeholder>;
  }

  if (mode === 'table') {
    return <AgentsTable agents={agents} />;
  }

  if (mode === 'compact') {
    // Eight per row on a wide screen, fewer as it narrows — a portrait under
    // ~90px stops being recognisable.
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {agents.map((agent) => (
          <AgentTile key={agent.id} agent={agent} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
