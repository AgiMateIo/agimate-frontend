'use client';

import { useEffect, useState, useCallback } from 'react';
import apiService from '@/services/api';
import { ChannelResponse } from '@/types';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import ChannelsList from '@/components/channels/ChannelsList';
import ChannelDetailPane from '@/components/channels/ChannelDetailPane';

type Mode = 'view' | 'edit' | 'create';

interface AgentChannelsTabProps {
  agentPubId: string;
}

export default function AgentChannelsTab({ agentPubId }: AgentChannelsTabProps) {
  const [channels, setChannels] = useState<ChannelResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPubId, setSelectedPubId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('view');

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getChannels({ agentPubId });
      setChannels(data);
      if (data.length > 0 && !selectedPubId) {
        setSelectedPubId(data[0].pubId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, [agentPubId, selectedPubId]);

  useEffect(() => {
    fetchChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentPubId]);

  const selected = channels.find((c) => c.pubId === selectedPubId) || null;

  const handleSaved = (saved: ChannelResponse) => {
    setChannels((prev) => {
      const idx = prev.findIndex((c) => c.pubId === saved.pubId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setSelectedPubId(saved.pubId);
  };

  const handleDeleted = (pubId: string) => {
    setChannels((prev) => prev.filter((c) => c.pubId !== pubId));
    setSelectedPubId((curr) => (curr === pubId ? null : curr));
    setMode('view');
  };

  if (error) return <ErrorAlert>{error}</ErrorAlert>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 min-h-[500px]">
      <div className="md:border-r md:border-border md:pr-6">
        <ChannelsList
          channels={channels}
          selectedPubId={selectedPubId}
          loading={loading}
          onSelect={(id) => { setSelectedPubId(id); setMode('view'); }}
          onCreate={() => setMode('create')}
        />
      </div>
      <div>
        <ChannelDetailPane
          agentPubId={agentPubId}
          channel={mode === 'create' ? null : selected}
          mode={mode}
          onModeChange={setMode}
          onChannelSaved={handleSaved}
          onChannelDeleted={handleDeleted}
        />
      </div>
    </div>
  );
}
