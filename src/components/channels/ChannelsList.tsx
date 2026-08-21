'use client';

import { useTranslations } from 'next-intl';
import { PlusIcon } from '@heroicons/react/24/outline';
import { ChannelResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import { Placeholder } from '@/components/ui/Placeholder';

interface ChannelsListProps {
  channels: ChannelResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  loading: boolean;
}

export default function ChannelsList({
  channels,
  selectedId,
  onSelect,
  onCreate,
  loading,
}: ChannelsListProps) {
  const t = useTranslations('Channels');

  return (
    <div className="flex flex-col gap-3 h-full">
      <Button onClick={onCreate} className="flex items-center justify-center gap-2 w-full">
        <PlusIcon className="h-4 w-4" />
        {t('createChannel')}
      </Button>

      {loading ? (
        <Placeholder size="sm">{t('loading')}</Placeholder>
      ) : channels.length === 0 ? (
        <Placeholder size="sm">{t('noChannels')}</Placeholder>
      ) : (
        <div className="space-y-2 overflow-y-auto pr-1">
          {channels.map((c) => {
            const active = c.id === selectedId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  active
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-accent/50 hover:bg-surface-secondary'
                }`}
              >
                <div className="text-sm font-medium text-foreground truncate">{c.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-mono text-muted">{c.connectorCode}</span>
                  <span className="text-xs text-muted">·</span>
                  <span className="text-xs text-muted truncate">
                    {c.connectionName || c.connectionId?.slice(0, 8) || '—'}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted font-mono truncate">{c.channelHandler}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
