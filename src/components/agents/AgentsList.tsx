'use client';

import { AgentResponse } from '@/types';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';
import { getAgentAvatarUrl } from '@/utils/avatar';

interface AgentsListProps {
  agents: AgentResponse[];
}

export default function AgentsList({ agents }: AgentsListProps) {
  if (agents.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        No agent configurations created yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {agents.map((agent) => (
        <div
          key={agent.id}
          className="bg-surface-secondary rounded-lg p-4 border border-border"
        >
          <div className="flex items-start gap-3 min-w-0">
            <img
              src={getAgentAvatarUrl(agent.name)}
              alt={agent.name}
              className="w-10 h-10 rounded-lg flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 min-w-0">
                <Link href={`/dashboard/agents/${agent.id}`} className="font-medium text-foreground hover:text-accent transition-colors flex-shrink-0">
                  {agent.name}
                </Link>
                {agent.description ? (
                  <span className="text-sm text-muted truncate min-w-0" title={agent.description}>
                    {agent.description}
                  </span>
                ) : agent.prompt ? (
                  <span className="text-sm text-muted truncate min-w-0 font-mono" title={agent.prompt}>
                    {agent.prompt}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {agent.type === 'WEBHOOK' && agent.webhookUrl && (
                  <span className="inline-block bg-surface border border-border rounded px-2 py-0.5 text-xs text-muted font-mono truncate max-w-[200px]" title={agent.webhookUrl}>
                    {agent.webhookUrl}
                  </span>
                )}
                {agent.hasWebhookAuth && (
                  <span className="inline-flex items-center gap-1 bg-surface border border-border rounded px-2 py-0.5 text-xs text-muted">
                    <LockClosedIcon className="h-3 w-3" />
                    Auth
                  </span>
                )}
                {agent.skills.map((skill) => (
                  <Link
                    key={skill.pubId}
                    href={`/dashboard/skills/${skill.pubId}`}
                    className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-surface border border-border text-foreground hover:border-accent hover:text-accent transition-colors"
                    title={skill.name}
                  >
                    {skill.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
