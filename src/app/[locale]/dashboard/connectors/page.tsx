'use client';

import { useState, useMemo, useEffect } from 'react';
import ConnectorCard from '@/components/connectors/ConnectorCard';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import apiService from '@/services/api';
import { ConnectorInfo, ConnectorSummary } from '@/types';

export default function ConnectorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [summaries, setSummaries] = useState<ConnectorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [connectorsData, summariesData] = await Promise.all([
          apiService.getConnectors(),
          apiService.getCredentialsSummary(),
        ]);
        setConnectors(connectorsData);
        setSummaries(summariesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load connectors');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredConnectors = useMemo(() => {
    if (!searchQuery.trim()) return connectors;

    const query = searchQuery.toLowerCase();
    return connectors.filter(
      (connector) =>
        connector.name.toLowerCase().includes(query) ||
        connector.description.toLowerCase().includes(query)
    );
  }, [searchQuery, connectors]);

  const getCredentialCount = (connectorCode: string) => {
    const summary = summaries.find(s => s.connectorCode === connectorCode);
    return summary?.credentialCount || 0;
  };

  const totalCredentials = summaries.reduce((sum, s) => sum + s.credentialCount, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Connectors</h1>
        <div className="text-center py-12 text-muted">Loading connectors...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Connectors</h1>
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
        <h1 className="text-2xl font-bold text-foreground">Connectors</h1>
        <p className="text-muted mt-1">
          Manage marketplace and service integrations.{' '}
          <span className="text-success font-medium">{totalCredentials} credentials configured</span>
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
        <input
          type="text"
          placeholder="Search connectors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        />
      </div>

      {/* Connectors Grid */}
      {filteredConnectors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredConnectors.map((connector) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              credentialCount={getCredentialCount(connector.code)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted">
          No connectors found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
}
