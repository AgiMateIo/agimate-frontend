'use client';

import { useState, useEffect } from 'react';
import { AgentResponse } from '@/types';
import { TrashIcon, PencilIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';
import { getAgentAvatarUrl } from '@/utils/avatar';
import DeleteAgentModal from './DeleteAgentModal';

interface AgentsListProps {
  agents: AgentResponse[];
  onUpdate?: () => void;
}

export default function AgentsList({ agents: agentsProp, onUpdate }: AgentsListProps) {
  const [agents, setAgents] = useState<AgentResponse[]>(agentsProp);
  const [deletingAgent, setDeletingAgent] = useState<AgentResponse | null>(null);

  useEffect(() => {
    setAgents(agentsProp);
  }, [agentsProp]);

  const truncatePrompt = (prompt: string, maxLength = 100) => {
    return prompt.length > maxLength ? prompt.slice(0, maxLength) + '...' : prompt;
  };

  const getTriggersToColor = (triggersTo: string) => {
    switch (triggersTo) {
      case 'centrifugo':
        return 'bg-accent/10 text-accent';
      case 'webhook':
        return 'bg-success/10 text-success';
      case 'ignore':
        return 'bg-muted/10 text-muted';
      default:
        return 'bg-muted/10 text-muted';
    }
  };

  const handleDeleteSuccess = (agentId: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== agentId));
    setDeletingAgent(null);
    onUpdate?.();
  };

  if (agents.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        No agent configurations created yet
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="bg-surface-secondary rounded-lg p-4 border border-border"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <img
                  src={getAgentAvatarUrl(agent.name)}
                  alt={agent.name}
                  className="w-10 h-10 rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <Link href={`/dashboard/agents/${agent.id}`} className="font-medium text-foreground hover:text-accent transition-colors">
                    {agent.name}
                  </Link>
                  <p className="text-sm text-muted mt-1 font-mono">
                    {truncatePrompt(agent.prompt)}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${getTriggersToColor(agent.triggersTo)}`}>
                      {agent.triggersTo}
                    </span>
                    {agent.triggersTo === 'webhook' && agent.webhookUrl && (
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
                    {agent.triggersAllowAll && (
                      <span className="inline-block bg-warning/10 text-warning rounded px-2 py-0.5 text-xs font-medium">
                        All triggers
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/agents/${agent.id}/edit`}
                  className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
                  title="Edit agent"
                >
                  <PencilIcon className="h-5 w-5" />
                </Link>
                <button
                  onClick={() => setDeletingAgent(agent)}
                  className="p-2 text-muted hover:text-error transition-colors rounded-lg"
                  title="Delete agent"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {deletingAgent && (
        <DeleteAgentModal
          agent={deletingAgent}
          onClose={() => setDeletingAgent(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}
