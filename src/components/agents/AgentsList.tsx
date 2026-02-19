'use client';

import { useState, useEffect } from 'react';
import { AgentSettingsResponse, AppResponse } from '@/types';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import EditAgentModal from './EditAgentModal';
import DeleteAgentModal from './DeleteAgentModal';

interface AgentsListProps {
  agents: AgentSettingsResponse[];
  apps: AppResponse[];
  onUpdate?: () => void;
}

export default function AgentsList({ agents: agentsProp, apps, onUpdate }: AgentsListProps) {
  const [agents, setAgents] = useState<AgentSettingsResponse[]>(agentsProp);
  const [editingAgent, setEditingAgent] = useState<AgentSettingsResponse | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<AgentSettingsResponse | null>(null);

  useEffect(() => {
    setAgents(agentsProp);
  }, [agentsProp]);

  const getAppName = (apiKeyPubId: string): string => {
    const app = apps.find((a) => a.id === apiKeyPubId);
    return app ? app.name : apiKeyPubId;
  };

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

  const handleEditSuccess = () => {
    setEditingAgent(null);
    onUpdate?.();
  };

  const handleDeleteSuccess = (apiKeyPubId: string) => {
    setAgents((prev) => prev.filter((a) => a.apiKeyPubId !== apiKeyPubId));
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
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">{getAppName(agent.apiKeyPubId)}</h3>
                <p className="text-sm text-muted mt-1 font-mono">
                  {truncatePrompt(agent.prompt)}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${getTriggersToColor(agent.triggersTo)}`}>
                    {agent.triggersTo}
                  </span>
                  {agent.triggersAllowAll && (
                    <span className="inline-block bg-warning/10 text-warning rounded px-2 py-0.5 text-xs font-medium">
                      All triggers
                    </span>
                  )}
                  {agent.triggers.length > 0 && (
                    <span className="inline-block bg-surface border border-border rounded px-2 py-0.5 text-xs text-foreground">
                      {agent.triggers.length} trigger{agent.triggers.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {agent.tools.length > 0 && (
                    <span className="inline-block bg-surface border border-border rounded px-2 py-0.5 text-xs text-foreground">
                      {agent.tools.length} tool{agent.tools.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingAgent(agent)}
                  className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
                  title="Edit agent"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
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

      {editingAgent && (
        <EditAgentModal
          agent={editingAgent}
          appName={getAppName(editingAgent.apiKeyPubId)}
          onClose={() => setEditingAgent(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingAgent && (
        <DeleteAgentModal
          agent={deletingAgent}
          appName={getAppName(deletingAgent.apiKeyPubId)}
          onClose={() => setDeletingAgent(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}
