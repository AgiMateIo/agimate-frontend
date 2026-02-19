'use client';

import { useState, useEffect, useCallback } from 'react';
import apiService from '@/services/api';
import { AgentSettingsResponse, AppResponse } from '@/types';
import AgentsList from '@/components/agents/AgentsList';
import AddAgentModal from '@/components/agents/AddAgentModal';

export default function AgentsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [agents, setAgents] = useState<AgentSettingsResponse[]>([]);
  const [apps, setApps] = useState<AppResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [agentsData, appsData] = await Promise.all([
        apiService.getAgentSettingsList(),
        apiService.getApps(),
      ]);
      setAgents(agentsData);
      setApps(appsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAgentAdded = () => {
    fetchData();
    setShowAddModal(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Agents</h1>
        <div className="text-center py-12 text-muted">Loading agents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Agents</h1>
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="text-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agents</h1>
        <p className="text-muted mt-1">
          Configure AI agent settings for your apps
        </p>
      </div>

      {/* Agents Section */}
      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Agent Configurations</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            Create Agent
          </button>
        </div>

        <AgentsList
          agents={agents}
          apps={apps}
          onUpdate={fetchData}
        />
      </div>

      {/* Add Agent Modal */}
      {showAddModal && (
        <AddAgentModal
          apps={apps}
          existingAgents={agents}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAgentAdded}
        />
      )}
    </div>
  );
}
