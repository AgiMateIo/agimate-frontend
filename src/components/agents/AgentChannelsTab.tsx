'use client';

import { useEffect, useState, useCallback } from 'react';
import apiService from '@/services/api';
import { ChannelResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import ChannelsList from '@/components/channels/ChannelsList';
import ChannelDetailPane from '@/components/channels/ChannelDetailPane';

type Mode = 'view' | 'edit' | 'create';

interface AgentChannelsTabProps {
  agentId: string;
}

export default function AgentChannelsTab({ agentId }: AgentChannelsTabProps) {
  const [channels, setChannels] = useState<ChannelResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('view');

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getChannels({ agentId });
      setChannels(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load channels'));
    } finally {
      setLoading(false);
    }
  }, [agentId, selectedId]);

  useEffect(() => {
    fetchChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const selected = channels.find((c) => c.id === selectedId) || null;

  const handleSaved = (saved: ChannelResponse) => {
    setChannels((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setSelectedId(saved.id);
  };

  const handleDeleted = (id: string) => {
    setChannels((prev) => prev.filter((c) => c.id !== id));
    setSelectedId((curr) => (curr === id ? null : curr));
    setMode('view');
  };

  if (error) return <ErrorAlert>{error}</ErrorAlert>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 min-h-[500px]">
      <div className="md:border-r md:border-border md:pr-6">
        <ChannelsList
          channels={channels}
          selectedId={selectedId}
          loading={loading}
          onSelect={(id) => { setSelectedId(id); setMode('view'); }}
          onCreate={() => setMode('create')}
        />
      </div>
      <div>
        <ChannelDetailPane
          agentId={agentId}
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
