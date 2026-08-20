'use client';

import { useState } from 'react';
import { ChannelResponse } from '@/types';
import { getErrorMessage } from '@/utils/error';
import { useAgentChannelsQuery, useChannelCacheActions } from '@/queries/channels';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import ChannelsList from '@/components/channels/ChannelsList';
import ChannelDetailPane from '@/components/channels/ChannelDetailPane';

type Mode = 'view' | 'edit' | 'create';

interface AgentChannelsTabProps {
  agentId: string;
}

export default function AgentChannelsTab({ agentId }: AgentChannelsTabProps) {
  const { data: channels, isPending, error } = useAgentChannelsQuery(agentId);
  const { upsertChannel, removeChannel } = useChannelCacheActions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('view');

  const list = channels ?? [];
  // The selection is derived rather than stored: "first channel unless the user
  // picked another" needs no effect writing state back once the list arrives.
  const selected = list.find((c) => c.id === selectedId) ?? list[0] ?? null;

  const handleSaved = (saved: ChannelResponse) => {
    upsertChannel(agentId, saved);
    setSelectedId(saved.id);
  };

  const handleDeleted = (id: string) => {
    removeChannel(agentId, id);
    setSelectedId((curr) => (curr === id ? null : curr));
    setMode('view');
  };

  if (error) return <ErrorAlert>{getErrorMessage(error, 'Failed to load channels')}</ErrorAlert>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 min-h-[500px]">
      <div className="md:border-r md:border-border md:pr-6">
        <ChannelsList
          channels={list}
          selectedId={selected?.id ?? null}
          loading={isPending}
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
